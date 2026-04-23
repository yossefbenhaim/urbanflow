import { z } from 'zod'
import { router, protectedProcedure } from '../middleware/auth'
import { TRPCError } from '@trpc/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '../logger'

// ── Supabase response types for joined / nested data ───────
// Note: Supabase .select() with joins may return arrays or single objects
// depending on the relationship. We use permissive types here to accommodate both.
interface TenantUser { user_id: string }
interface BuildingGroupRecord { id: string; building_id?: string }
interface BuildingGroupRef { building_id: string }
interface PollRecord {
  id: string; group_id: string; question: string; poll_type: string
  status: string; threshold_pct: number; result_value?: string
  result_user_id?: string; building_groups?: BuildingGroupRef | BuildingGroupRef[]
  options?: string[]; is_anonymous?: boolean; close_at?: string; created_at?: string
}
interface ProfileRecord { full_name?: string; avatar_url?: string; is_building_representative?: boolean; representative_building_id?: string; id?: string }
interface GroupMember { user_id: string; group_id?: string; profiles?: ProfileRecord | ProfileRecord[] }
interface PollVote { poll_id: string; value: string; voter_id?: string }
interface UnitBuilding { building?: { project_id?: string; project?: Record<string, unknown> } }
interface TenantProfileRow {
  user_id?: string; building_id?: string; is_onboarded?: boolean
  id_number?: string; phone?: string; floor?: number; apartment_sqm?: number
  apartment_number?: string; tabu_file_url?: string; tabu_uploaded_at?: string
  tabu_locked?: boolean; unit?: UnitBuilding
  [key: string]: unknown
}
interface SignatureRow { user_id: string; signed_at?: string }
interface DocumentRow { id: string; title?: string; signatures?: SignatureRow[]; [key: string]: unknown }
interface ProjectTenantRow { project_id: string; projects?: Record<string, unknown> | Record<string, unknown>[]; [key: string]: unknown }
interface NotificationTarget { user_id: string }

/** Helper to extract first element from Supabase join result (which may be array or object) */
function unwrapJoin<T>(val: T | T[] | undefined): T | undefined {
  return Array.isArray(val) ? val[0] : val
}

async function findOrCreateBuilding(supabase: SupabaseClient, city: string, street: string, buildingNumber: string) {
  const { data: existing } = await supabase
    .from('buildings')
    .select('id')
    .eq('city', city)
    .eq('street', street)
    .eq('number', buildingNumber)
    .is('project_id', null)
    .maybeSingle()

  if (existing) return existing.id

  const { data: newBuilding, error } = await supabase
    .from('buildings')
    .insert({ city, street, number: buildingNumber, address: `${street} ${buildingNumber}, ${city}`, units_count: 0 })
    .select('id')
    .single()

  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  return newBuilding.id
}

async function handleBuildingGroup(supabase: SupabaseClient, buildingId: string, userId: string) {
  const { data: tenants } = await supabase.from('tenant_profiles').select('user_id').eq('building_id', buildingId)
  const tenantIds: string[] = ((tenants ?? []) as TenantUser[]).map((t) => t.user_id)
  if (tenantIds.length < 2) return

  const { data: existingGroup } = await supabase.from('building_groups').select('id').eq('building_id', buildingId).maybeSingle()
  let groupId: string

  if (existingGroup) {
    groupId = existingGroup.id
    await supabase.from('building_group_members').upsert({ group_id: groupId, user_id: userId }, { onConflict: 'group_id,user_id' })
  } else {
    const { data: bg } = await supabase.from('building_groups').insert({ building_id: buildingId, name: 'קבוצת הבניין' }).select('id').single()
    if (!bg) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create building group' })
    groupId = bg.id
    const members = tenantIds.map((uid: string) => ({ group_id: groupId, user_id: uid }))
    await supabase.from('building_group_members').insert(members)

    const { data: poll1 } = await supabase.from('polls').insert({ group_id: groupId, question: 'כמה דירות יש בבניין שלך?', poll_type: 'apartment_count', threshold_pct: 60 }).select('id').single()
    const { data: poll2 } = await supabase.from('polls').insert({ group_id: groupId, question: 'מי יהיה נציג הוועד?', poll_type: 'representative_election', threshold_pct: 51 }).select('id').single()
    const { data: poll3 } = await supabase.from('polls').insert({ group_id: groupId, question: 'האם אתה מסכים להצטרף לפרויקט הפינוי-בינוי?', poll_type: 'project_approval', threshold_pct: 66 }).select('id').single()
    if (!poll1 || !poll2 || !poll3) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create polls' })
    await supabase.from('group_messages').insert([
      { group_id: groupId, sender_id: userId, content: 'כמה דירות יש בבניין שלך?', message_type: 'poll', poll_id: poll1.id },
      { group_id: groupId, sender_id: userId, content: 'מי יהיה נציג הוועד?', message_type: 'poll', poll_id: poll2.id },
      { group_id: groupId, sender_id: userId, content: 'האם אתה מסכים להצטרף לפרויקט הפינוי-בינוי?', message_type: 'poll', poll_id: poll3.id },
    ])
  }
}

async function processVote(supabase: SupabaseClient, pollId: string, buildingId: string) {
  const { data: rawPoll } = await supabase.from('polls').select('*, building_groups(building_id)').eq('id', pollId).single()
  const poll = rawPoll as PollRecord | null
  if (!poll || poll.status !== 'open') return
  const bgRef = unwrapJoin(poll.building_groups)
  const resolvedBuildingId = buildingId || bgRef?.building_id

  const { data: tenants } = await supabase.from('tenant_profiles').select('user_id').eq('building_id', resolvedBuildingId)
  const totalTenants = (tenants ?? []).length
  if (totalTenants === 0) return

  const { data: votes } = await supabase.from('poll_votes').select('value').eq('poll_id', pollId)
  const voteCount = (votes ?? []).length
  const pct = Math.round((voteCount / totalTenants) * 100)
  if (pct < poll.threshold_pct) return

  const tally: Record<string, number> = {}
  for (const v of votes ?? []) tally[v.value] = (tally[v.value] ?? 0) + 1
  const winner = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]
  if (!winner) return

  const resultValue = winner[0]
  await supabase.from('polls').update({ status: 'resolved', result_value: resultValue, result_user_id: poll.poll_type === 'representative_election' ? resultValue : null }).eq('id', pollId)

  if (poll.poll_type === 'apartment_count') {
    await supabase.from('buildings').update({ total_units: parseInt(resultValue) }).eq('id', resolvedBuildingId)
  } else if (poll.poll_type === 'representative_election') {
    await supabase.from('building_representatives').update({ is_active: false }).eq('building_id', resolvedBuildingId)
    await supabase.from('building_representatives').insert({ building_id: resolvedBuildingId, user_id: resultValue, poll_id: pollId, is_active: true })
    await supabase.from('profiles').update({ is_building_representative: true, representative_building_id: resolvedBuildingId }).eq('id', resultValue)

    // Notify all building members about elected representative
    const { data: repProfile } = await supabase.from('profiles').select('full_name').eq('id', resultValue).single()
    const repName = (repProfile as ProfileRecord | null)?.full_name ?? 'הנציג שנבחר'
    const { data: groupMembers } = await supabase.from('building_group_members').select('user_id').eq('group_id', poll.group_id)
    const members = (groupMembers ?? []) as NotificationTarget[]
    if (members.length > 0) {
      await supabase.from('notifications').insert(
        members.map((m) => ({
          user_id: m.user_id,
          type: 'representative_elected',
          title: '🎉 נבחר נציג דיירים!',
          body: `${repName} נבחר/ה ברוב קולות כנציג/ת הדיירים. נשאר רק לחתום על טופס בחירת נציגות ולהעלות אותו חתום.`,
          is_read: false,
        }))
      )
      await supabase.from('group_messages').insert({
        group_id: poll.group_id,
        sender_id: resultValue,
        content: `🎉 ${repName} נבחר/ה ברוב קולות כנציג/ת הדיירים!\n\nנשאר לכם רק לחתום על טופס בחירת נציגות ולהעלות אותו חתום אלינו.\n📥 להורדת הטופס לחצו כאן`,
        message_type: 'text',
      })
    }
  } else if (poll.poll_type === 'project_approval') {
    const { data: groupMembers } = await supabase.from('building_group_members').select('user_id').eq('group_id', poll.group_id)
    const approvalMembers = (groupMembers ?? []) as NotificationTarget[]
    if (approvalMembers.length > 0) {
      await supabase.from('notifications').insert(
        approvalMembers.map((m) => ({
          user_id: m.user_id,
          type: 'project_approved',
          title: '✅ הפרויקט אושר!',
          body: `הושגה הסכמה של ${pct}% מבעלי הדירות להצטרף לפרויקט הפינוי-בינוי.`,
          is_read: false,
        }))
      )
      await supabase.from('group_messages').insert({
        group_id: poll.group_id,
        sender_id: approvalMembers[0].user_id,
        content: `✅ הושגה הסכמה של ${pct}% מבעלי הדירות! הפרויקט אושר.`,
        message_type: 'text',
      })
    }
  }
}

export const tenantRouter = router({
  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase.from('tenant_profiles').select('*').eq('user_id', ctx.user.id).single()
    return data ?? null
  }),

  getMyProject: protectedProcedure.query(async ({ ctx }) => {
    const { data: pt } = await ctx.supabase.from('project_tenants').select('project_id, projects(id, name, address, invite_code, status, created_at)').eq('tenant_id', ctx.user.id).single()
    if (!pt) return null
    const project = unwrapJoin((pt as unknown as ProjectTenantRow).projects as Record<string, unknown>[] | Record<string, unknown> | undefined)
    if (!project) return null
    const [{ data: milestones }, { count: totalTenants }, { data: signedUsers }] = await Promise.all([
      ctx.supabase.from('milestones').select('*').eq('project_id', project.id).order('order_num'),
      ctx.supabase.from('project_tenants').select('*', { count: 'exact', head: true }).eq('project_id', project.id),
      ctx.supabase.from('signatures').select('user_id, documents!inner(project_id)').eq('documents.project_id', project.id),
    ])
    // Count unique users who signed at least one document
    const uniqueSigners = new Set((signedUsers ?? []).map((s: { user_id: string }) => s.user_id)).size
    return { ...project, milestones: milestones ?? [], totalTenants: totalTenants ?? 0, signedCount: uniqueSigners }
  }),

  getDocuments: protectedProcedure.query(async ({ ctx }) => {
    // Try project_tenants first (direct link), then fallback to unit→building chain
    const { data: pt } = await ctx.supabase.from('project_tenants').select('project_id').eq('tenant_id', ctx.user.id).single()
    let projectId = pt?.project_id
    if (!projectId) {
      const { data: tp } = await ctx.supabase.from('tenant_profiles').select('unit:units(building:buildings(project_id))').eq('user_id', ctx.user.id).single()
      projectId = ((tp as TenantProfileRow | null)?.unit as UnitBuilding | undefined)?.building?.project_id
    }
    if (!projectId) return []
    const { data: docs } = await ctx.supabase.from('documents').select('*, signatures(signed_at)').eq('project_id', projectId).in('type', ['SIGN_REQUIRED', 'INFO_ONLY'])
    return docs ?? []
  }),

  getTimeline: protectedProcedure.query(async ({ ctx }) => {
    const { data: tp } = await ctx.supabase.from('tenant_profiles').select('unit:units(building:buildings(project_id))').eq('user_id', ctx.user.id).single()
    const projectId = ((tp as TenantProfileRow | null)?.unit as UnitBuilding | undefined)?.building?.project_id
    if (!projectId) return []
    const { data } = await ctx.supabase.from('milestones').select('*').eq('project_id', projectId).order('order_num')
    return data ?? []
  }),

  getLeadership: protectedProcedure.query(async ({ ctx }) => {
    const { data: tp } = await ctx.supabase.from('tenant_profiles').select('unit:units(building:buildings(project:projects(*,manager:profiles(*))))').eq('user_id', ctx.user.id).single()
    return ((tp as TenantProfileRow | null)?.unit as UnitBuilding | undefined)?.building?.project ?? null
  }),

  updateProfile: protectedProcedure
    .input(z.object({ fullName: z.string().optional(), phone: z.string().optional(), idNumber: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase.from('profiles').update({ full_name: input.fullName, phone: input.phone, id_number: input.idNumber }).eq('id', ctx.user.id)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),

  completeOnboarding: protectedProcedure
    .input(z.object({ fullName: z.string(), idNumber: z.string(), phone: z.string(), unitId: z.string(), isOwner: z.boolean(), parkingNumber: z.string().optional(), storageNumber: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.supabase.from('profiles').update({ full_name: input.fullName, phone: input.phone, id_number: input.idNumber }).eq('id', ctx.user.id)
      await ctx.supabase.from('tenant_profiles').upsert({ user_id: ctx.user.id, unit_id: input.unitId, is_owner: input.isOwner, is_onboarded: true, parking_number: input.parkingNumber, storage_number: input.storageNumber })
      return { success: true }
    }),

  signDocument: protectedProcedure
    .input(z.object({ docId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase.from('signatures').insert({ document_id: input.docId, user_id: ctx.user.id, verified_otp: true })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true, signedAt: new Date().toISOString() }
    }),

  requestOTP: protectedProcedure.mutation(async ({ ctx }) => {
    const otp = Math.floor(1000 + Math.random() * 9000).toString()
    console.log(`[OTP] User ${ctx.user.id}: ${otp}`)
    return { sent: true }
  }),

  joinProject: protectedProcedure
    .input(z.object({ inviteCode: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      const { data: project, error: pe } = await ctx.supabase.from('projects').select('id, name').eq('invite_code', input.inviteCode.toUpperCase()).single()
      if (pe || !project) throw new TRPCError({ code: 'NOT_FOUND', message: 'קוד לא תקין' })
      const { error } = await ctx.supabase.from('project_tenants').upsert({ project_id: project.id, tenant_id: ctx.user.id }, { onConflict: 'project_id,tenant_id' })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { projectId: project.id, projectName: project.name }
    }),

  getProjectMembership: protectedProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase.from('project_tenants').select('*, projects(id, name, address, invite_code)').eq('tenant_id', ctx.user.id).single()
    return (data as ProjectTenantRow | null)?.projects ?? null
  }),

  updateApartmentProfile: protectedProcedure
    .input(z.object({ floor: z.number().optional(), apartmentNumber: z.string().optional(), apartmentSizeSqm: z.number().optional(), rooms: z.number().optional(), ownershipType: z.enum(['owner', 'renter']).optional(), signedPowerOfAttorney: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase.from('tenant_profiles').upsert({ id: ctx.user.id, floor: input.floor, apartment_number: input.apartmentNumber, apartment_size_sqm: input.apartmentSizeSqm, rooms: input.rooms, ownership_type: input.ownershipType, signed_power_of_attorney: input.signedPowerOfAttorney, updated_at: new Date().toISOString() }, { onConflict: 'id' })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),

  saveProfile: protectedProcedure
    .input(z.object({
      idNumber: z.string().length(9), phone: z.string(), city: z.string(), street: z.string(),
      buildingNumber: z.string(), floor: z.number(), apartmentNumber: z.string(), apartmentSqm: z.number(),
      isOwner: z.boolean(), ownershipType: z.enum(['sole', 'partial', 'renter']).optional(),
      ownershipPercentage: z.number().min(1).max(99).optional(),
      moveInYear: z.number().optional(), apartmentsInBuilding: z.number().optional(),
      tenantsInBuilding: z.number().optional(),
      specialRequests: z.array(z.string()).optional(),
      specialRequestsNotes: z.string().optional(),
      apartmentExtras: z.array(z.string()).optional(),
      apartmentExtrasNotes: z.string().optional(),
      hasSpecialAdvantage: z.boolean().optional(),
      // Section 3 - Living Status
      isResiding: z.boolean().optional(),
      residingStatus: z.enum(['renter', 'family_member', 'empty']).optional(),
      // Section 4 - Property Relation
      propertyRelation: z.enum(['owner', 'renter', 'heir', 'power_of_attorney']).optional(),
      // Section 5 - Co-owners
      coOwnersCount: z.number().min(2).optional(),
      // Section 10 - Declarations
      declarationsAccepted: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const buildingId = await findOrCreateBuilding(ctx.supabase, input.city, input.street, input.buildingNumber)
      if (input.apartmentsInBuilding) {
        await ctx.supabase.from('buildings').update({ total_units: input.apartmentsInBuilding }).eq('id', buildingId)
      }
      const ownershipComplexity = (input.coOwnersCount && input.coOwnersCount > 1) ? 'complex' : 'simple'
      const { error } = await ctx.supabase.from('tenant_profiles').upsert({
        user_id: ctx.user.id, id_number: input.idNumber, phone: input.phone,
        address: `${input.street} ${input.buildingNumber}, ${input.city}`,
        building_number: input.buildingNumber, floor: input.floor, apartment_number: input.apartmentNumber,
        apartment_sqm: input.apartmentSqm, is_owner: input.isOwner, move_in_year: input.moveInYear,
        ownership_type: input.ownershipType ?? (input.isOwner ? 'sole' : 'renter'),
        ownership_percentage: input.ownershipPercentage ?? null,
        is_onboarded: true, building_id: buildingId, apartments_in_building: input.apartmentsInBuilding,
        tenants_in_building: input.tenantsInBuilding ?? null,
        special_requests: input.specialRequests ?? [],
        special_requests_notes: input.specialRequestsNotes ?? null,
        apartment_extras: input.apartmentExtras ?? [],
        apartment_extras_notes: input.apartmentExtrasNotes ?? null,
        has_special_advantage: input.hasSpecialAdvantage ?? false,
        // Section 3
        is_residing: input.isResiding ?? true,
        residing_status: input.isResiding === false ? (input.residingStatus ?? null) : null,
        // Section 4
        property_relation: input.propertyRelation ?? null,
        // Section 5
        co_owners_count: input.coOwnersCount ?? 0,
        ownership_complexity_flag: ownershipComplexity,
        // Section 10
        declarations_accepted: input.declarationsAccepted ?? false,
        declarations_accepted_at: input.declarationsAccepted ? new Date().toISOString() : null,
      }, { onConflict: 'user_id' })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      try { await handleBuildingGroup(ctx.supabase, buildingId, ctx.user.id) } catch (e) { logger.error({ err: e }, '[buildingGroup] failed to create group') }
      return { ok: true }
    }),

  getMyStatus: protectedProcedure.query(async ({ ctx }) => {
    const [{ data: pt }, { data: tp }] = await Promise.all([
      ctx.supabase.from('project_tenants').select('project_id').eq('tenant_id', ctx.user.id).single(),
      ctx.supabase.from('tenant_profiles').select('apartment_number, is_onboarded, id_number, phone, floor, apartment_sqm').eq('user_id', ctx.user.id).single(),
    ])
    const profile = tp as TenantProfileRow | null
    return {
      hasProject: !!pt?.project_id, isOnboarded: !!profile?.is_onboarded,
      steps: { personal: !!(profile?.id_number && profile?.phone), address: !!(profile?.apartment_number || profile?.floor), apartment: !!(profile?.apartment_sqm) }
    }
  }),

  getMyRole: protectedProcedure.query(async ({ ctx }) => {
    const { data: profile } = await ctx.supabase.from('profiles').select('is_building_representative, representative_building_id, full_name').eq('id', ctx.user.id).single()
    return {
      isRepresentative: (profile as ProfileRecord | null)?.is_building_representative || false,
      buildingId: (profile as ProfileRecord | null)?.representative_building_id ?? null,
      fullName: (profile as ProfileRecord | null)?.full_name ?? null,
    }
  }),

  getMyBuildingGroup: protectedProcedure.query(async ({ ctx }) => {
    const { data: tp } = await ctx.supabase.from('tenant_profiles').select('building_id').eq('user_id', ctx.user.id).single()
    if (!(tp as TenantProfileRow | null)?.building_id) return null
    const { data: group } = await ctx.supabase.from('building_groups').select('id, name').eq('building_id', (tp as TenantProfileRow).building_id).maybeSingle()
    return group ?? null
  }),

  getChatMessages: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data: member } = await ctx.supabase.from('building_group_members').select('user_id').eq('group_id', input.groupId).eq('user_id', ctx.user.id).maybeSingle()
      if (!member) throw new TRPCError({ code: 'FORBIDDEN', message: 'אינך חבר בקבוצה זו' })
      const { data: messages } = await ctx.supabase.from('group_messages')
        .select('id, content, message_type, poll_id, created_at, sender_id, sender:profiles(full_name, avatar_url)')
        .eq('group_id', input.groupId).order('created_at', { ascending: true })
      return messages ?? []
    }),

  sendChatMessage: protectedProcedure
    .input(z.object({ groupId: z.string(), content: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { data: member } = await ctx.supabase.from('building_group_members').select('user_id').eq('group_id', input.groupId).eq('user_id', ctx.user.id).maybeSingle()
      if (!member) throw new TRPCError({ code: 'FORBIDDEN', message: 'אינך חבר בקבוצה זו' })
      const { error } = await ctx.supabase.from('group_messages').insert({ group_id: input.groupId, sender_id: ctx.user.id, content: input.content })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  getPollDetails: protectedProcedure
    .input(z.object({ pollId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data: rawPoll } = await ctx.supabase.from('polls').select('id, question, poll_type, status, result_value, result_user_id, threshold_pct, created_at, group_id, options, is_anonymous, close_at').eq('id', input.pollId).single()
      if (!rawPoll) throw new TRPCError({ code: 'NOT_FOUND' })
      const poll = rawPoll as unknown as PollRecord
      const { data: member } = await ctx.supabase.from('building_group_members').select('user_id').eq('group_id', poll.group_id).eq('user_id', ctx.user.id).maybeSingle()
      if (!member) throw new TRPCError({ code: 'FORBIDDEN' })
      const { data: myVote } = await ctx.supabase.from('poll_votes').select('value').eq('poll_id', input.pollId).eq('voter_id', ctx.user.id).maybeSingle()
      const { count: voteCount } = await ctx.supabase.from('poll_votes').select('*', { count: 'exact', head: true }).eq('poll_id', input.pollId)
      const { count: memberCount } = await ctx.supabase.from('building_group_members').select('*', { count: 'exact', head: true }).eq('group_id', poll.group_id)
      let candidates: ProfileRecord[] = []
      if (poll.poll_type === 'representative_election') {
        const { data: members } = await ctx.supabase.from('building_group_members').select('user_id, profiles(id, full_name, avatar_url)').eq('group_id', poll.group_id)
        candidates = ((members ?? []) as unknown as GroupMember[]).map((m) => unwrapJoin(m.profiles) as ProfileRecord).filter(Boolean)
      }
      return { ...rawPoll, myVote: myVote?.value ?? null, voteCount: voteCount ?? 0, memberCount: memberCount ?? 0, votePercent: memberCount ? Math.round(((voteCount ?? 0) / memberCount) * 100) : 0, candidates }
    }),

  castVote: protectedProcedure
    .input(z.object({ pollId: z.string(), value: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { data: rawPoll } = await ctx.supabase.from('polls').select('id, group_id, status, poll_type, building_groups(building_id)').eq('id', input.pollId).single()
      const castPoll = rawPoll as unknown as PollRecord | null
      if (!castPoll || castPoll.status !== 'open') throw new TRPCError({ code: 'BAD_REQUEST', message: 'הסקר סגור' })
      const { data: member } = await ctx.supabase.from('building_group_members').select('user_id').eq('group_id', castPoll.group_id).eq('user_id', ctx.user.id).maybeSingle()
      if (!member) throw new TRPCError({ code: 'FORBIDDEN' })
      // upsert — allows changing vote
      const { error } = await ctx.supabase.from('poll_votes').upsert(
        { poll_id: input.pollId, voter_id: ctx.user.id, value: input.value },
        { onConflict: 'poll_id,voter_id' }
      )
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      const bgRefVote = unwrapJoin(castPoll.building_groups)
      const buildingId = bgRefVote?.building_id ?? ''
      await processVote(ctx.supabase, input.pollId, buildingId)
      return { ok: true }
    }),
  getNotifications: protectedProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', ctx.user.id)
      .order('created_at', { ascending: false })
      .limit(30)
    return data ?? []
  }),

  markNotificationsRead: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', ctx.user.id)
      .eq('is_read', false)
    return { success: true }
  }),

  // ─── A1: Upload Tabu PDF ───────────────────────────────
  uploadTabu: protectedProcedure
    .input(z.object({ fileUrl: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      // Check if already locked
      const { data: existing } = await ctx.supabase.from('tenant_profiles').select('tabu_locked').eq('user_id', ctx.user.id).single()
      if ((existing as TenantProfileRow | null)?.tabu_locked) throw new TRPCError({ code: 'FORBIDDEN', message: 'נסח הטאבו ננעל ואינו ניתן לעדכון' })
      const { error } = await ctx.supabase.from('tenant_profiles').update({
        tabu_file_url: input.fileUrl,
        tabu_uploaded_at: new Date().toISOString(),
        tabu_locked: false,
      }).eq('user_id', ctx.user.id)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  getTabuStatus: protectedProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase.from('tenant_profiles').select('tabu_file_url, tabu_uploaded_at, tabu_locked').eq('user_id', ctx.user.id).single()
    if (!data) return { uploaded: false, locked: false, url: null, uploadedAt: null }
    const d = data as TenantProfileRow
    // Auto-lock after 1 hour
    if (d.tabu_uploaded_at && !d.tabu_locked) {
      const elapsed = Date.now() - new Date(d.tabu_uploaded_at).getTime()
      if (elapsed > 60 * 60 * 1000) {
        await ctx.supabase.from('tenant_profiles').update({ tabu_locked: true }).eq('user_id', ctx.user.id)
        d.tabu_locked = true
      }
    }
    return { uploaded: !!d.tabu_file_url, locked: !!d.tabu_locked, url: d.tabu_file_url, uploadedAt: d.tabu_uploaded_at }
  }),

  // ─── A1b: Ownership Documents (מסמכי בעלות) ──────────
  uploadOwnershipDocument: protectedProcedure
    .input(z.object({
      fileUrl: z.string().url(),
      fileName: z.string(),
      documentType: z.enum(['tabu_extract', 'purchase_contract', 'ownership_certificate', 'inheritance_docs', 'power_of_attorney_doc', 'other']),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data: tp } = await ctx.supabase.from('tenant_profiles').select('building_id').eq('user_id', ctx.user.id).single()
      const { data, error } = await ctx.supabase.from('ownership_documents').insert({
        user_id: ctx.user.id,
        building_id: (tp as TenantProfileRow | null)?.building_id ?? null,
        file_url: input.fileUrl,
        file_name: input.fileName,
        document_type: input.documentType,
        notes: input.notes ?? null,
        is_confidential: true,
      }).select().single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  getOwnershipDocuments: protectedProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase
      .from('ownership_documents')
      .select('*')
      .eq('user_id', ctx.user.id)
      .order('created_at', { ascending: false })
    return data ?? []
  }),

  deleteOwnershipDocument: protectedProcedure
    .input(z.object({ documentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('ownership_documents')
        .delete()
        .eq('id', input.documentId)
        .eq('user_id', ctx.user.id)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── A2: Complex Ownership ─────────────────────────────
  addCoOwner: protectedProcedure
    .input(z.object({
      apartmentId: z.string().uuid(),
      userId: z.string().uuid(),
      ownershipType: z.enum(['owner', 'heir', 'divorced', 'proxy', 'abroad']),
      ownershipPct: z.number().min(0).max(100).default(100),
      hasProxy: z.boolean().default(false),
      proxyUserId: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase.from('apartment_owners').insert({
        apartment_id: input.apartmentId,
        user_id: input.userId,
        ownership_type: input.ownershipType,
        ownership_pct: input.ownershipPct,
        has_proxy: input.hasProxy,
        proxy_user_id: input.proxyUserId ?? null,
      })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  getCoOwners: protectedProcedure
    .input(z.object({ apartmentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase.from('apartment_owners')
        .select('*, user:profiles(full_name, phone), proxy:profiles(full_name)')
        .eq('apartment_id', input.apartmentId)
        .order('created_at')
      return data ?? []
    }),

  // ─── A3: Power of Attorney ─────────────────────────────
  createPowerOfAttorney: protectedProcedure
    .input(z.object({
      receiverUserId: z.string().uuid(),
      apartmentId: z.string().uuid(),
      poaType: z.enum(['full', 'partial', 'voting_only']),
      fileUrl: z.string().url().optional(),
      notarized: z.boolean().default(false),
      validFrom: z.string().optional(),
      validUntil: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase.from('power_of_attorney').insert({
        granter_user_id: ctx.user.id,
        receiver_user_id: input.receiverUserId,
        apartment_id: input.apartmentId,
        poa_type: input.poaType,
        file_url: input.fileUrl ?? null,
        notarized: input.notarized,
        valid_from: input.validFrom ?? null,
        valid_until: input.validUntil ?? null,
      })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  getMyPowerOfAttorneys: protectedProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase.from('power_of_attorney')
      .select('*, granter:profiles!power_of_attorney_granter_user_id_fkey(full_name), receiver:profiles!power_of_attorney_receiver_user_id_fkey(full_name)')
      .or(`granter_user_id.eq.${ctx.user.id},receiver_user_id.eq.${ctx.user.id}`)
      .order('created_at', { ascending: false })
    return data ?? []
  }),

  // ─── A4: Report Unlocated Tenant ───────────────────────
  reportUnlocated: protectedProcedure
    .input(z.object({
      apartmentId: z.string().uuid(),
      attemptedPhone: z.boolean().default(false),
      attemptedEmail: z.boolean().default(false),
      attemptedVisit: z.boolean().default(false),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase.from('unlocated_tenants').insert({
        apartment_id: input.apartmentId,
        reported_by: ctx.user.id,
        attempted_phone: input.attemptedPhone,
        attempted_email: input.attemptedEmail,
        attempted_visit: input.attemptedVisit,
        notes: input.notes ?? null,
      })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  getUnlocatedTenants: protectedProcedure
    .input(z.object({ apartmentId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
      let q = ctx.supabase.from('unlocated_tenants').select('*').order('created_at', { ascending: false })
      if (input?.apartmentId) q = q.eq('apartment_id', input.apartmentId)
      const { data } = await q
      return data ?? []
    }),

  // ─── A5: Ownership Dispute ─────────────────────────────
  reportOwnershipDispute: protectedProcedure
    .input(z.object({
      apartmentId: z.string().uuid(),
      disputeType: z.enum(['inheritance', 'divorce', 'unclear', 'other']),
      parties: z.array(z.string()).default([]),
      description: z.string(),
      documents: z.array(z.string()).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase.from('ownership_disputes').insert({
        apartment_id: input.apartmentId,
        dispute_type: input.disputeType,
        parties: input.parties,
        description: input.description,
        documents: input.documents,
      })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  getOwnershipDisputes: protectedProcedure
    .input(z.object({ apartmentId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
      let q = ctx.supabase.from('ownership_disputes').select('*').order('created_at', { ascending: false })
      if (input?.apartmentId) q = q.eq('apartment_id', input.apartmentId)
      const { data } = await q
      return data ?? []
    }),

  // ─── A6: Report Problem Tenant ─────────────────────────
  reportProblem: protectedProcedure
    .input(z.object({
      apartmentId: z.string().uuid(),
      reportType: z.enum(['refusal', 'threat', 'disruption', 'other']),
      description: z.string(),
      frequency: z.enum(['one_time', 'recurring']),
      blocksProject: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase.from('tenant_reports').insert({
        apartment_id: input.apartmentId,
        reported_by: ctx.user.id,
        report_type: input.reportType,
        description: input.description,
        frequency: input.frequency,
        blocks_project: input.blocksProject,
      })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  getMyReports: protectedProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase.from('tenant_reports')
      .select('*')
      .eq('reported_by', ctx.user.id)
      .order('created_at', { ascending: false })
    return data ?? []
  }),

  // ─── Partners (Section 5 - Co-owners repeater) ─────────
  addPartner: protectedProcedure
    .input(z.object({ fullName: z.string().min(2), phone: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.from('tenant_partners').insert({
        user_id: ctx.user.id, full_name: input.fullName, phone: input.phone,
      }).select().single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  removePartner: protectedProcedure
    .input(z.object({ partnerId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase.from('tenant_partners').delete()
        .eq('id', input.partnerId).eq('user_id', ctx.user.id)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  getPartners: protectedProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase.from('tenant_partners').select('*')
      .eq('user_id', ctx.user.id).order('created_at')
    return data ?? []
  }),

  // ─── Companion (Section 8 - Family/companion) ─────────
  saveCompanion: protectedProcedure
    .input(z.object({ fullName: z.string().min(2), phone: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.from('tenant_companions').upsert({
        user_id: ctx.user.id, full_name: input.fullName, phone: input.phone, role: 'viewer',
      }, { onConflict: 'user_id' }).select().single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  getCompanion: protectedProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase.from('tenant_companions').select('*')
      .eq('user_id', ctx.user.id).maybeSingle()
    return data ?? null
  }),

  // ─── E1: Elderly / Disability Profile ──────────────────
  saveElderlyProfile: protectedProcedure
    .input(z.object({
      apartmentId: z.string().uuid().optional(),
      age: z.number().optional(),
      isOver70: z.boolean().optional(),
      isOver80: z.boolean().optional(),
      hasDisability: z.boolean().optional(),
      disabilityDescription: z.string().optional(),
      needsAccessibility: z.boolean().optional(),
      needsLowFloor: z.boolean().optional(),
      needsElevator: z.boolean().optional(),
      cannotRelocateFar: z.boolean().optional(),
      preferredArea: z.string().optional(),
      hasCompanion: z.boolean().optional(),
      companionName: z.string().optional(),
      companionPhone: z.string().optional(),
      legalAlternatives: z.array(z.string()).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const isOver80 = input.isOver80 || (input.age ? input.age >= 80 : false)
      const isOver70 = input.isOver70 || (input.age ? input.age >= 70 : false)

      const { error } = await ctx.supabase.from('elderly_profiles').upsert({
        user_id: ctx.user.id,
        apartment_id: input.apartmentId ?? null,
        age: input.age ?? null,
        is_over_70: isOver70,
        is_over_80: isOver80,
        has_disability: input.hasDisability ?? false,
        disability_description: input.disabilityDescription ?? null,
        needs_accessibility: input.needsAccessibility ?? false,
        needs_low_floor: input.needsLowFloor ?? false,
        needs_elevator: input.needsElevator ?? false,
        cannot_relocate_far: input.cannotRelocateFar ?? false,
        preferred_area: input.preferredArea ?? null,
        has_companion: input.hasCompanion ?? false,
        companion_name: input.companionName ?? null,
        companion_phone: input.companionPhone ?? null,
        legal_alternatives: input.legalAlternatives ?? [],
        notes: input.notes ?? null,
      }, { onConflict: 'user_id' })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Alert for 80+ tenants — notify project manager
      if (isOver80) {
        const { data: tp } = await ctx.supabase.from('tenant_profiles').select('unit:units(building:buildings(project:projects(id, manager_id)))').eq('user_id', ctx.user.id).single()
        const project = ((tp as TenantProfileRow | null)?.unit as UnitBuilding | undefined)?.building?.project
        if (project?.manager_id) {
          await ctx.supabase.from('notifications').insert({
            user_id: project.manager_id,
            title: '⚠️ חובת הצגת חלופה לקשיש (תיקון 6)',
            body: `דייר מעל גיל 80 מילא טופס קשיש — חובה להציג חלופות דיור לפי חוק פינוי-בינוי תיקון 6`,
            type: 'elderly_alert',
            is_read: false,
          })
        }
      }

      return { ok: true }
    }),

  getElderlyProfile: protectedProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase.from('elderly_profiles').select('*').eq('user_id', ctx.user.id).single()
    return data ?? null
  }),

  // ─── E3: Next Step ─────────────────────────────────────
  getDocumentContent: protectedProcedure
    .input(z.object({ docId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data: doc, error } = await ctx.supabase
        .from('documents')
        .select('*, signatures(signed_at, signature_image, full_name, id_number, user_id)')
        .eq('slug', input.docId)
        .single()
      if (error || !doc) throw new TRPCError({ code: 'NOT_FOUND', message: 'מסמך לא נמצא' })
      // Check if current user already signed
      const mySig = ((doc as DocumentRow).signatures ?? []).find((s: SignatureRow) => s.user_id === ctx.user.id)
      return { ...doc, mySig: mySig ?? null }
    }),

  signDocumentWithSignature: protectedProcedure
    .input(z.object({
      docId: z.string(),
      signatureImage: z.string(),
      fullName: z.string(),
      idNumber: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Resolve slug to UUID
      const { data: doc } = await ctx.supabase
        .from('documents')
        .select('id')
        .eq('slug', input.docId)
        .single()
      if (!doc) throw new TRPCError({ code: 'NOT_FOUND', message: 'מסמך לא נמצא' })
      const documentId = (doc as DocumentRow).id

      // Check not already signed
      const { data: existing } = await ctx.supabase
        .from('signatures')
        .select('id')
        .eq('document_id', documentId)
        .eq('user_id', ctx.user.id)
        .maybeSingle()
      if (existing) throw new TRPCError({ code: 'BAD_REQUEST', message: 'כבר חתמת על מסמך זה' })

      const { error } = await ctx.supabase.from('signatures').insert({
        document_id: documentId,
        user_id: ctx.user.id,
        verified_otp: true,
        signature_image: input.signatureImage,
        full_name: input.fullName,
        id_number: input.idNumber,
      })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true, signedAt: new Date().toISOString() }
    }),

  getNextStep: protectedProcedure.query(async ({ ctx }) => {
    // Check profile completion
    const { data: tp } = await ctx.supabase.from('tenant_profiles').select('is_onboarded, tabu_file_url').eq('user_id', ctx.user.id).single()
    if (!tp || !(tp as TenantProfileRow).is_onboarded) {
      return { action: 'complete_profile', text: 'השלם את הפרופיל שלך', link: '/onboarding', icon: '📋' }
    }
    // Check tabu upload
    if (!(tp as TenantProfileRow).tabu_file_url) {
      return { action: 'upload_tabu', text: 'העלה נסח טאבו', link: '/upload-tabu', icon: '📄' }
    }
    // Check open polls
    const { data: bgm } = await ctx.supabase.from('building_group_members').select('group_id').eq('user_id', ctx.user.id)
    if (bgm && bgm.length > 0) {
      const groupIds = (bgm as Array<{ group_id: string }>).map((m) => m.group_id)
      const { data: polls } = await ctx.supabase.from('polls').select('id, question').in('group_id', groupIds).eq('status', 'open')
      if (polls && polls.length > 0) {
        // Check if user voted
        const pollIds = (polls as Array<{ id: string; question: string }>).map((p) => p.id)
        const { data: votes } = await ctx.supabase.from('poll_votes').select('poll_id').eq('voter_id', ctx.user.id).in('poll_id', pollIds)
        const votedIds = new Set((votes as Array<{ poll_id: string }> ?? []).map((v) => v.poll_id))
        const unvoted = (polls as Array<{ id: string; question: string }>).find((p) => !votedIds.has(p.id))
        if (unvoted) {
          return { action: 'vote', text: `הצבע בהצבעה: ${unvoted.question}`, link: '/building-chat', icon: '🗳️' }
        }
      }
    }
    // Check unsigned documents
    const { data: tpUnit } = await ctx.supabase.from('tenant_profiles').select('unit:units(building:buildings(project_id))').eq('user_id', ctx.user.id).single()
    const projectId = ((tpUnit as TenantProfileRow | null)?.unit as UnitBuilding | undefined)?.building?.project_id
    if (projectId) {
      const { data: docs } = await ctx.supabase.from('documents').select('id, title, signatures(signed_at)').eq('project_id', projectId).eq('type', 'SIGN_REQUIRED')
      if (docs) {
        const unsigned = docs.find((d) => !d.signatures || d.signatures.length === 0)
        if (unsigned) {
          return { action: 'sign_document', text: `חתום על מסמך: ${unsigned.title}`, link: '/documents', icon: '✍️' }
        }
      }
    }
    return { action: 'all_done', text: 'הפרויקט מתקדם, אין פעולות נדרשות ✅', link: '/dashboard', icon: '✅' }
  }),

  // ─── Tenant Steps (personal progress) ─────────────────────
  getTenantSteps: protectedProcedure.query(async ({ ctx }) => {
    const { data: tp } = await ctx.supabase.from('tenant_profiles').select('is_onboarded, tabu_file_url, id_number, phone, floor, apartment_sqm, apartment_number').eq('user_id', ctx.user.id).single()
    const profile = tp as TenantProfileRow | null
    const profileDone = !!(profile?.is_onboarded)
    const tabuDone = !!(profile?.tabu_file_url)

    // Check apartment wishes
    const { data: wishes } = await ctx.supabase.from('apartment_wishes').select('id').eq('user_id', ctx.user.id).single()
    const wishesDone = !!wishes

    // Check votes
    let voteDone = true
    const { data: bgm } = await ctx.supabase.from('building_group_members').select('group_id').eq('user_id', ctx.user.id)
    if (bgm && bgm.length > 0) {
      const groupIds = (bgm as Array<{ group_id: string }>).map(m => m.group_id)
      const { data: polls } = await ctx.supabase.from('polls').select('id').in('group_id', groupIds).eq('status', 'open')
      if (polls && polls.length > 0) {
        const pollIds = (polls as Array<{ id: string }>).map(p => p.id)
        const { data: votes } = await ctx.supabase.from('poll_votes').select('poll_id').eq('voter_id', ctx.user.id).in('poll_id', pollIds)
        const votedIds = new Set((votes as Array<{ poll_id: string }> ?? []).map(v => v.poll_id))
        voteDone = pollIds.every(id => votedIds.has(id))
      }
    }

    // Check signatures
    let signDone = true
    const { data: tpUnit } = await ctx.supabase.from('tenant_profiles').select('unit:units(building:buildings(project_id))').eq('user_id', ctx.user.id).single()
    const projectId = ((tpUnit as TenantProfileRow | null)?.unit as UnitBuilding | undefined)?.building?.project_id
    if (projectId) {
      const { data: docs } = await ctx.supabase.from('documents').select('id, signatures(signed_at)').eq('project_id', projectId).eq('type', 'SIGN_REQUIRED')
      if (docs && docs.length > 0) {
        signDone = docs.every((d: { signatures?: unknown[] }) => d.signatures && d.signatures.length > 0)
      }
    }

    return { profile: profileDone, tabu: tabuDone, wishes: wishesDone, vote: voteDone, sign: signDone }
  }),

  // ─── Project Progress (dashboard page) ───────────────────
  getProjectProgress: protectedProcedure.query(async ({ ctx }) => {
    // Find project
    const { data: pt } = await ctx.supabase.from('project_tenants').select('project_id, projects(id, name, status, created_at)').eq('tenant_id', ctx.user.id).single()
    if (!pt) return null
    const project = unwrapJoin((pt as unknown as ProjectTenantRow).projects as Record<string, unknown>[] | Record<string, unknown> | undefined)
    if (!project) return null

    const [
      { count: totalTenants },
      { data: allProfiles },
      { data: signedUsers },
      { data: docs },
      { data: allWishes },
    ] = await Promise.all([
      ctx.supabase.from('project_tenants').select('*', { count: 'exact', head: true }).eq('project_id', project.id),
      ctx.supabase.from('tenant_profiles').select('user_id, is_onboarded, tabu_file_url').in('user_id',
        (await ctx.supabase.from('project_tenants').select('tenant_id').eq('project_id', project.id)).data?.map((t: { tenant_id: string }) => t.tenant_id) ?? []
      ),
      ctx.supabase.from('signatures').select('user_id, documents!inner(project_id)').eq('documents.project_id', project.id),
      ctx.supabase.from('documents').select('id, title, type, signatures(user_id)').eq('project_id', project.id),
      ctx.supabase.from('apartment_wishes').select('user_id').in('user_id',
        (await ctx.supabase.from('project_tenants').select('tenant_id').eq('project_id', project.id)).data?.map((t: { tenant_id: string }) => t.tenant_id) ?? []
      ),
    ])

    const total = totalTenants ?? 0
    const profiles = allProfiles as TenantProfileRow[] ?? []
    const onboarded = profiles.filter(p => p.is_onboarded).length
    const tabuUploaded = profiles.filter(p => p.tabu_file_url).length
    const uniqueSigners = new Set((signedUsers ?? []).map((s: { user_id: string }) => s.user_id)).size
    const wishesCount = allWishes?.length ?? 0

    // Per-document breakdown
    const docBreakdown = (docs ?? []).map((d: { id: string; title: string; type: string; signatures?: Array<{ user_id: string }> }) => ({
      id: d.id, title: d.title, type: d.type,
      signed: new Set((d.signatures ?? []).map(s => s.user_id)).size,
      total,
    }))

    return {
      projectName: project.name, projectStatus: project.status, createdAt: project.created_at,
      totalTenants: total, onboarded, tabuUploaded, signedCount: uniqueSigners, wishesCount,
      documents: docBreakdown,
    }
  }),

  // ─── DI2: Apartment Wishes ────────────────────────────────

  getApartmentWishes: protectedProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase
      .from('apartment_wishes')
      .select('*')
      .eq('user_id', ctx.user.id)
      .single()
    return data ?? null
  }),

  saveApartmentWishes: protectedProcedure
    .input(z.object({
      fullName: z.string().optional(),
      idNumber: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      apartmentNumber: z.string().optional(),
      currentFloor: z.number().optional(),
      currentType: z.enum(['regular', 'garden', 'penthouse', 'duplex', 'other']).optional(),
      currentTypeOther: z.string().optional(),
      currentFeatures: z.array(z.string()).optional(),
      currentFeaturesOther: z.string().optional(),
      tabuMatch: z.boolean().optional(),
      tabuMismatchDetails: z.string().optional(),
      floorPreference: z.enum(['same', 'up', 'down', 'any']).optional(),
      floorChangeAmount: z.number().optional(),
      sizePreference: z.enum(['same', 'bigger', 'smaller', 'any']).optional(),
      roomsPreference: z.enum(['same', 'add', 'remove', 'any']).optional(),
      airDirections: z.enum(['same', 'important', 'any']).optional(),
      desiredType: z.enum(['regular', 'garden', 'penthouse', 'duplex', 'split_two', 'premium', 'any']).optional(),
      standardAdditions: z.record(z.unknown()).optional(),
      extraAdditions: z.array(z.string()).optional(),
      extraAdditionsOther: z.string().optional(),
      wantsInteriorChanges: z.boolean().optional(),
      interiorChanges: z.array(z.string()).optional(),
      interiorChangesOther: z.string().optional(),
      ceilingHeight: z.enum(['standard', 'high']).optional(),
      ceilingHeightMeters: z.number().optional(),
      parkingCurrent: z.enum(['none', 'one', 'two']).optional(),
      parkingDesired: z.enum(['none', 'one', 'two']).optional(),
      balconyCurrent: z.enum(['none', 'regular', 'sukkah', 'large']).optional(),
      balconyDesired: z.enum(['none', 'regular', 'sukkah', 'large']).optional(),
      gardenRoofPreference: z.enum(['garden', 'roof', 'any']).optional(),
      buildingPreferences: z.array(z.string()).optional(),
      buildingPreferencesOther: z.string().optional(),
      topPriorities: z.array(z.string()).max(3).optional(),
      topPrioritiesOther: z.string().optional(),
      status: z.enum(['draft', 'submitted']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const row = {
        user_id: ctx.user.id,
        full_name: input.fullName ?? null,
        id_number: input.idNumber ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        apartment_number: input.apartmentNumber ?? null,
        current_floor: input.currentFloor ?? null,
        current_type: input.currentType ?? null,
        current_type_other: input.currentTypeOther ?? null,
        current_features: input.currentFeatures ?? [],
        current_features_other: input.currentFeaturesOther ?? null,
        tabu_match: input.tabuMatch ?? null,
        tabu_mismatch_details: input.tabuMismatchDetails ?? null,
        floor_preference: input.floorPreference ?? null,
        floor_change_amount: input.floorChangeAmount ?? null,
        size_preference: input.sizePreference ?? null,
        rooms_preference: input.roomsPreference ?? null,
        air_directions: input.airDirections ?? null,
        desired_type: input.desiredType ?? null,
        standard_additions: input.standardAdditions ?? {},
        extra_additions: input.extraAdditions ?? [],
        extra_additions_other: input.extraAdditionsOther ?? null,
        wants_interior_changes: input.wantsInteriorChanges ?? false,
        interior_changes: input.interiorChanges ?? [],
        interior_changes_other: input.interiorChangesOther ?? null,
        ceiling_height: input.ceilingHeight ?? null,
        ceiling_height_meters: input.ceilingHeightMeters ?? null,
        parking_current: input.parkingCurrent ?? null,
        parking_desired: input.parkingDesired ?? null,
        balcony_current: input.balconyCurrent ?? null,
        balcony_desired: input.balconyDesired ?? null,
        garden_roof_preference: input.gardenRoofPreference ?? null,
        building_preferences: input.buildingPreferences ?? [],
        building_preferences_other: input.buildingPreferencesOther ?? null,
        top_priorities: input.topPriorities ?? [],
        top_priorities_other: input.topPrioritiesOther ?? null,
        status: input.status ?? 'draft',
        updated_at: new Date().toISOString(),
      }

      const { error } = await ctx.supabase
        .from('apartment_wishes')
        .upsert(row, { onConflict: 'user_id' })

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),

  analyzeApartmentWishes: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Fetch the saved wishes
      const { data: wishes } = await ctx.supabase
        .from('apartment_wishes')
        .select('*')
        .eq('user_id', ctx.user.id)
        .single()

      if (!wishes) throw new TRPCError({ code: 'NOT_FOUND', message: 'לא נמצא טופס דירה חדשה' })

      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'AI service unavailable' })

      const wishesData = wishes as Record<string, unknown>

      const prompt = `אתה יועץ מומחה לפרויקטי פינוי-בינוי בישראל. נתונים של דייר שמילא טופס ציפיות לדירה חדשה:

מצב נוכחי:
- סוג דירה: ${wishesData.current_type || 'לא צוין'}
- קומה: ${wishesData.current_floor || 'לא צוין'}
- מאפיינים קיימים: ${(wishesData.current_features as string[] || []).join(', ') || 'לא צוין'}
- התאמה לטאבו: ${wishesData.tabu_match === true ? 'כן' : wishesData.tabu_match === false ? 'לא - ' + (wishesData.tabu_mismatch_details || '') : 'לא צוין'}

ציפיות לדירה חדשה:
- קומה: ${wishesData.floor_preference || 'לא צוין'}${wishesData.floor_change_amount ? ' (' + wishesData.floor_change_amount + ' קומות)' : ''}
- גודל: ${wishesData.size_preference || 'לא צוין'}
- חדרים: ${wishesData.rooms_preference || 'לא צוין'}
- כיווני אוויר: ${wishesData.air_directions || 'לא צוין'}
- סוג דירה רצוי: ${wishesData.desired_type || 'לא צוין'}
- תוספות: ${JSON.stringify(wishesData.standard_additions || {})}
- תכנון פנימי: ${wishesData.wants_interior_changes ? (wishesData.interior_changes as string[] || []).join(', ') : 'ללא שינוי'}
- חניה: נוכחי ${wishesData.parking_current || '?'} → רצוי ${wishesData.parking_desired || '?'}
- מרפסות: נוכחי ${wishesData.balcony_current || '?'} → רצוי ${wishesData.balcony_desired || '?'}
- העדפות בניין: ${(wishesData.building_preferences as string[] || []).join(', ') || 'לא צוין'}
- עדיפויות: ${(wishesData.top_priorities as string[] || []).join(', ') || 'לא צוין'}

כללי מערכת לפרויקט פינוי-בינוי:
1. דירה חדשה חייבת לכלול ממ"ד (חדר מוגן) לפי חוק
2. שטח דירה חדשה בפינוי-בינוי: לפחות 25 מ"ר + תוספת של לפחות 12 מ"ר על השטח המקורי
3. כל דירה חדשה מקבלת מרפסת (לפחות 12 מ"ר)
4. חניה אחת לפחות לכל דירה
5. מחסן לכל דירה
6. הדייר לא יכול לדרוש יותר ממה שמאפשר תב"ע (תוכנית בניין עיר)
7. דייר מעל גיל 70 - זכויות מיוחדות
8. פיצול או שדרוג דירות - תלוי בתב"ע ובהסכמת היזם

תן ניתוח קצר בעברית (עד 300 מילים) שכולל:
1. **סיכום ציפיות** - מה הדייר רוצה בקצרה
2. **זכויות מובטחות** - מה מגיע לו לפי חוק/תב"ע
3. **נקודות לבירור** - מה צריך לבדוק מול היזם/עו"ד
4. **המלצות** - טיפים חשובים לדייר
5. **ציון התאמה** - 1-10, כמה ריאלי מה שהדייר מבקש

תענה בפורמט JSON:
{
  "summary": "...",
  "guaranteedRights": ["..."],
  "pointsToCheck": ["..."],
  "recommendations": ["..."],
  "matchScore": 8,
  "matchExplanation": "..."
}`

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      if (!response.ok) {
        logger.error({ err: await response.text() }, 'AI analysis failed')
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'AI analysis failed' })
      }

      const aiResult = await response.json() as { content: Array<{ text: string }> }
      const text = aiResult.content[0]?.text || '{}'

      // Extract JSON from response
      let analysis: Record<string, unknown>
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: text }
      } catch {
        analysis = { raw: text }
      }

      // Save analysis
      await ctx.supabase
        .from('apartment_wishes')
        .update({
          ai_analysis: analysis,
          ai_analyzed_at: new Date().toISOString(),
          status: 'analyzed',
        })
        .eq('user_id', ctx.user.id)

      return analysis
    }),

  // ─── Tenant Document Management ────────────────────────
  getTenantDocuments: protectedProcedure
    .input(z.object({ category: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      let q = ctx.supabase
        .from('tenant_documents')
        .select('*')
        .eq('user_id', ctx.user.id)
        .order('created_at', { ascending: false })
      if (input?.category) q = q.eq('category', input.category)
      const { data } = await q
      return data ?? []
    }),

  saveTenantDocument: protectedProcedure
    .input(z.object({
      fileUrl: z.string().url(),
      fileName: z.string(),
      fileSize: z.number().optional(),
      mimeType: z.string().optional(),
      category: z.enum(['signed_forms', 'ownership', 'personal', 'correspondence', 'contracts', 'other']),
      description: z.string().optional(),
      storagePath: z.string(),
      linkedDocId: z.string().optional(),
      // Phase 5: classification + tenant-friendly description + versioning
      classification: z.enum(['public', 'project_only', 'private']).optional(),
      shareableWithTenants: z.boolean().optional(),
      containsSensitiveData: z.boolean().optional(),
      plainLanguageDescription: z.string().min(10, 'תיאור בשפה פשוטה חייב להיות לפחות 10 תווים').optional(),
      parentDocumentId: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data: tp } = await ctx.supabase.from('tenant_profiles').select('building_id').eq('user_id', ctx.user.id).single()

      // Versioning: if parent supplied, compute next version number
      let version = 1
      if (input.parentDocumentId) {
        const { data: parent } = await ctx.supabase
          .from('tenant_documents')
          .select('version, user_id')
          .eq('id', input.parentDocumentId)
          .single()
        if (!parent || (parent as { user_id: string }).user_id !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'גרסת מקור לא נמצאה' })
        }
        version = ((parent as { version: number | null }).version ?? 1) + 1
      }

      const { data, error } = await ctx.supabase.from('tenant_documents').insert({
        user_id: ctx.user.id,
        building_id: (tp as TenantProfileRow | null)?.building_id ?? null,
        file_url: input.fileUrl,
        file_name: input.fileName,
        file_size: input.fileSize ?? null,
        mime_type: input.mimeType ?? null,
        category: input.category,
        description: input.description ?? null,
        is_confidential: true,
        storage_path: input.storagePath,
        linked_doc_id: input.linkedDocId ?? null,
        classification: input.classification ?? 'private',
        shareable_with_tenants: input.shareableWithTenants ?? false,
        contains_sensitive_data: input.containsSensitiveData ?? false,
        plain_language_description: input.plainLanguageDescription ?? null,
        parent_document_id: input.parentDocumentId ?? null,
        version,
      }).select().single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  // Phase 5: return version chain for a document
  getDocumentVersions: protectedProcedure
    .input(z.object({ documentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // walk up to the root
      const visited = new Set<string>()
      let currentId: string | null = input.documentId
      let rootId = input.documentId
      while (currentId && !visited.has(currentId)) {
        visited.add(currentId)
        const res: { data: { parent_document_id: string | null } | null } = await ctx.supabase
          .from('tenant_documents')
          .select('parent_document_id')
          .eq('id', currentId)
          .eq('user_id', ctx.user.id)
          .maybeSingle()
        const parentId = res.data?.parent_document_id ?? null
        if (!parentId) break
        rootId = parentId
        currentId = parentId
      }
      // fetch all descendants via self-joining query (simple: fetch where id=root OR parent_document_id IN chain)
      const { data: chain } = await ctx.supabase
        .from('tenant_documents')
        .select('*')
        .eq('user_id', ctx.user.id)
        .or(`id.eq.${rootId},parent_document_id.eq.${rootId}`)
        .order('version', { ascending: false })
      return chain ?? []
    }),

  deleteTenantDocument: protectedProcedure
    .input(z.object({ documentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Get document to find storage path
      const { data: doc } = await ctx.supabase
        .from('tenant_documents')
        .select('storage_path')
        .eq('id', input.documentId)
        .eq('user_id', ctx.user.id)
        .single()
      if (!doc) throw new TRPCError({ code: 'NOT_FOUND', message: 'מסמך לא נמצא' })

      // Delete from storage
      const supabaseUrl = process.env.SUPABASE_URL || ''
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || ''
      await fetch(`${supabaseUrl}/storage/v1/object/documents/${(doc as { storage_path: string }).storage_path}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${supabaseKey}` },
      })

      // Delete from DB
      const { error } = await ctx.supabase
        .from('tenant_documents')
        .delete()
        .eq('id', input.documentId)
        .eq('user_id', ctx.user.id)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  getTenantDocumentStats: protectedProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase
      .from('tenant_documents')
      .select('category')
      .eq('user_id', ctx.user.id)
    const stats: Record<string, number> = {}
    for (const d of (data ?? []) as { category: string }[]) {
      stats[d.category] = (stats[d.category] ?? 0) + 1
    }
    return { total: (data ?? []).length, byCategory: stats }
  }),

  // ─── Document Statuses (signed + uploaded) ────────────────
  getDocumentStatuses: protectedProcedure.query(async ({ ctx }) => {
    // Get all digitally signed docs by this user
    const { data: sigs } = await ctx.supabase
      .from('signatures')
      .select('document_id, documents!inner(slug)')
      .eq('user_id', ctx.user.id)
    const signedSlugs = new Set(
      ((sigs ?? []) as unknown as Array<{ document_id: string; documents: { slug: string } | Array<{ slug: string }> }>)
        .map(s => {
          const docs = s.documents
          if (Array.isArray(docs)) return docs[0]?.slug
          return docs?.slug
        })
        .filter(Boolean)
    )

    // Get all uploaded docs linked to specific doc IDs
    const { data: uploads } = await ctx.supabase
      .from('tenant_documents')
      .select('linked_doc_id, file_url, file_name, storage_path')
      .eq('user_id', ctx.user.id)
      .not('linked_doc_id', 'is', null)
    const uploadedMap: Record<string, { file_url: string; file_name: string; storage_path?: string }> = {}
    for (const u of (uploads ?? []) as Array<{ linked_doc_id: string; file_url: string; file_name: string; storage_path?: string }>) {
      if (u.linked_doc_id) uploadedMap[u.linked_doc_id] = { file_url: u.file_url, file_name: u.file_name, storage_path: u.storage_path }
    }

    return { signedSlugs: Array.from(signedSlugs), uploadedMap }
  }),

  // ─── Get uploaded file for a specific doc ──────────────────
  getUploadedFile: protectedProcedure
    .input(z.object({ docId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('tenant_documents')
        .select('file_url, file_name, storage_path')
        .eq('user_id', ctx.user.id)
        .eq('linked_doc_id', input.docId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      return data as { file_url: string; file_name: string; storage_path?: string } | null
    }),

})
