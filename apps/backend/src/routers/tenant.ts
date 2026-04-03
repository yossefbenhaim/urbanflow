import { z } from 'zod'
import { router, protectedProcedure } from '../middleware/auth'
import { TRPCError } from '@trpc/server'

async function findOrCreateBuilding(supabase: any, city: string, street: string, buildingNumber: string) {
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

async function handleBuildingGroup(supabase: any, buildingId: string, userId: string) {
  const { data: tenants } = await supabase.from('tenant_profiles').select('user_id').eq('building_id', buildingId)
  const tenantIds: string[] = (tenants ?? []).map((t: any) => t.user_id)
  if (tenantIds.length < 2) return

  const { data: existingGroup } = await supabase.from('building_groups').select('id').eq('building_id', buildingId).maybeSingle()
  let groupId: string

  if (existingGroup) {
    groupId = existingGroup.id
    await supabase.from('building_group_members').upsert({ group_id: groupId, user_id: userId }, { onConflict: 'group_id,user_id' })
  } else {
    const { data: bg } = await supabase.from('building_groups').insert({ building_id: buildingId, name: 'קבוצת הבניין' }).select('id').single()
    groupId = bg.id
    const members = tenantIds.map((uid: string) => ({ group_id: groupId, user_id: uid }))
    await supabase.from('building_group_members').insert(members)

    const { data: poll1 } = await supabase.from('polls').insert({ group_id: groupId, question: 'כמה דירות יש בבניין שלך?', poll_type: 'apartment_count', threshold_pct: 60 }).select('id').single()
    const { data: poll2 } = await supabase.from('polls').insert({ group_id: groupId, question: 'מי יהיה נציג הוועד?', poll_type: 'representative_election', threshold_pct: 60 }).select('id').single()
    await supabase.from('group_messages').insert([
      { group_id: groupId, sender_id: userId, content: 'כמה דירות יש בבניין שלך?', message_type: 'poll', poll_id: poll1.id },
      { group_id: groupId, sender_id: userId, content: 'מי יהיה נציג הוועד?', message_type: 'poll', poll_id: poll2.id },
    ])
  }
}

async function processVote(supabase: any, pollId: string, buildingId: string) {
  const { data: poll } = await supabase.from('polls').select('*, building_groups(building_id)').eq('id', pollId).single()
  if (!poll || poll.status !== 'open') return
  const resolvedBuildingId = buildingId || (poll.building_groups as any)?.building_id

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
    const project = (pt as any).projects
    if (!project) return null
    const { data: milestones } = await ctx.supabase.from('milestones').select('*').eq('project_id', project.id).order('order_num')
    return { ...project, milestones: milestones ?? [] }
  }),

  getDocuments: protectedProcedure.query(async ({ ctx }) => {
    const { data: tp } = await ctx.supabase.from('tenant_profiles').select('unit:units(building:buildings(project_id))').eq('user_id', ctx.user.id).single()
    const projectId = (tp?.unit as any)?.building?.project_id
    if (!projectId) return []
    const { data: docs } = await ctx.supabase.from('documents').select('*, signatures(signed_at)').eq('project_id', projectId).in('type', ['SIGN_REQUIRED', 'INFO_ONLY'])
    return docs ?? []
  }),

  getTimeline: protectedProcedure.query(async ({ ctx }) => {
    const { data: tp } = await ctx.supabase.from('tenant_profiles').select('unit:units(building:buildings(project_id))').eq('user_id', ctx.user.id).single()
    const projectId = (tp?.unit as any)?.building?.project_id
    if (!projectId) return []
    const { data } = await ctx.supabase.from('milestones').select('*').eq('project_id', projectId).order('order_num')
    return data ?? []
  }),

  getLeadership: protectedProcedure.query(async ({ ctx }) => {
    const { data: tp } = await ctx.supabase.from('tenant_profiles').select('unit:units(building:buildings(project:projects(*,manager:profiles(*))))').eq('user_id', ctx.user.id).single()
    return (tp?.unit as any)?.building?.project ?? null
  }),

  updateProfile: protectedProcedure
    .input(z.object({ fullName: z.string().optional(), phone: z.string().optional(), idNumber: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase.from('profiles').update({ full_name: input.fullName, phone: input.phone, id_number: input.idNumber }).eq('id', ctx.user.id)
      if (error) throw error
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
      if (error) throw error
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
    return (data as any)?.projects ?? null
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
      isOwner: z.boolean(), moveInYear: z.number().optional(), apartmentsInBuilding: z.number().optional(),
      // New fields
      specialRequests: z.array(z.string()).optional(),
      specialRequestsNotes: z.string().optional(),
      apartmentExtras: z.array(z.string()).optional(),
      apartmentExtrasNotes: z.string().optional(),
      hasSpecialAdvantage: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const buildingId = await findOrCreateBuilding(ctx.supabase, input.city, input.street, input.buildingNumber)
      if (input.apartmentsInBuilding) {
        await ctx.supabase.from('buildings').update({ total_units: input.apartmentsInBuilding }).eq('id', buildingId)
      }
      const { error } = await ctx.supabase.from('tenant_profiles').upsert({
        user_id: ctx.user.id, id_number: input.idNumber, phone: input.phone,
        address: `${input.street} ${input.buildingNumber}, ${input.city}`,
        building_number: input.buildingNumber, floor: input.floor, apartment_number: input.apartmentNumber,
        apartment_sqm: input.apartmentSqm, is_owner: input.isOwner, move_in_year: input.moveInYear,
        is_onboarded: true, building_id: buildingId, apartments_in_building: input.apartmentsInBuilding,
        special_requests: input.specialRequests ?? [],
        special_requests_notes: input.specialRequestsNotes ?? null,
        apartment_extras: input.apartmentExtras ?? [],
        apartment_extras_notes: input.apartmentExtrasNotes ?? null,
        has_special_advantage: input.hasSpecialAdvantage ?? false,
      }, { onConflict: 'user_id' })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      try { await handleBuildingGroup(ctx.supabase, buildingId, ctx.user.id) } catch (e) { console.error('[buildingGroup]', e) }
      return { ok: true }
    }),

  getMyStatus: protectedProcedure.query(async ({ ctx }) => {
    const [{ data: pt }, { data: tp }] = await Promise.all([
      ctx.supabase.from('project_tenants').select('project_id').eq('tenant_id', ctx.user.id).single(),
      ctx.supabase.from('tenant_profiles').select('apartment_number, is_onboarded, id_number, phone, floor, apartment_sqm').eq('user_id', ctx.user.id).single(),
    ])
    const profile = tp as any
    return {
      hasProject: !!pt?.project_id, isOnboarded: !!profile?.is_onboarded,
      steps: { personal: !!(profile?.id_number && profile?.phone), address: !!(profile?.apartment_number || profile?.floor), apartment: !!(profile?.apartment_sqm) }
    }
  }),

  getMyRole: protectedProcedure.query(async ({ ctx }) => {
    const { data: profile } = await ctx.supabase.from('profiles').select('is_building_representative, representative_building_id, full_name').eq('id', ctx.user.id).single()
    return {
      isRepresentative: (profile as any)?.is_building_representative || false,
      buildingId: (profile as any)?.representative_building_id ?? null,
      fullName: (profile as any)?.full_name ?? null,
    }
  }),

  getMyBuildingGroup: protectedProcedure.query(async ({ ctx }) => {
    const { data: tp } = await ctx.supabase.from('tenant_profiles').select('building_id').eq('user_id', ctx.user.id).single()
    if (!(tp as any)?.building_id) return null
    const { data: group } = await ctx.supabase.from('building_groups').select('id, name').eq('building_id', (tp as any).building_id).maybeSingle()
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
      const { data: poll } = await ctx.supabase.from('polls').select('id, question, poll_type, status, result_value, result_user_id, threshold_pct, created_at, group_id, options, is_anonymous, close_at').eq('id', input.pollId).single()
      if (!poll) throw new TRPCError({ code: 'NOT_FOUND' })
      const { data: member } = await ctx.supabase.from('building_group_members').select('user_id').eq('group_id', (poll as any).group_id).eq('user_id', ctx.user.id).maybeSingle()
      if (!member) throw new TRPCError({ code: 'FORBIDDEN' })
      const { data: myVote } = await ctx.supabase.from('poll_votes').select('value').eq('poll_id', input.pollId).eq('voter_id', ctx.user.id).maybeSingle()
      const { count: voteCount } = await ctx.supabase.from('poll_votes').select('*', { count: 'exact', head: true }).eq('poll_id', input.pollId)
      const { count: memberCount } = await ctx.supabase.from('building_group_members').select('*', { count: 'exact', head: true }).eq('group_id', (poll as any).group_id)
      let candidates: any[] = []
      if ((poll as any).poll_type === 'representative_election') {
        const { data: members } = await ctx.supabase.from('building_group_members').select('user_id, profiles(id, full_name, avatar_url)').eq('group_id', (poll as any).group_id)
        candidates = (members ?? []).map((m: any) => m.profiles)
      }
      return { ...poll, myVote: myVote?.value ?? null, voteCount: voteCount ?? 0, memberCount: memberCount ?? 0, votePercent: memberCount ? Math.round(((voteCount ?? 0) / memberCount) * 100) : 0, candidates }
    }),

  castVote: protectedProcedure
    .input(z.object({ pollId: z.string(), value: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { data: poll } = await ctx.supabase.from('polls').select('id, group_id, status, poll_type, building_groups(building_id)').eq('id', input.pollId).single()
      if (!poll || (poll as any).status !== 'open') throw new TRPCError({ code: 'BAD_REQUEST', message: 'הסקר סגור' })
      const { data: member } = await ctx.supabase.from('building_group_members').select('user_id').eq('group_id', (poll as any).group_id).eq('user_id', ctx.user.id).maybeSingle()
      if (!member) throw new TRPCError({ code: 'FORBIDDEN' })
      // upsert — allows changing vote
      const { error } = await ctx.supabase.from('poll_votes').upsert(
        { poll_id: input.pollId, voter_id: ctx.user.id, value: input.value },
        { onConflict: 'poll_id,voter_id' }
      )
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      const buildingId = ((poll as any).building_groups as any)?.building_id
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
      if ((existing as any)?.tabu_locked) throw new TRPCError({ code: 'FORBIDDEN', message: 'נסח הטאבו ננעל ואינו ניתן לעדכון' })
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
    const d = data as any
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

  // ─── Step 11: Join Building Group ──────────────────────
  joinBuildingGroup: protectedProcedure
    .input(z.object({ buildingId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Find or create group for this building
      let { data: group } = await ctx.supabase
        .from('building_groups').select('id').eq('building_id', input.buildingId).maybeSingle()
      if (!group) {
        const { data: newGroup, error } = await ctx.supabase
          .from('building_groups')
          .insert({ building_id: input.buildingId, name: 'קבוצת הבניין' })
          .select('id').single()
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
        group = newGroup
      }
      // Upsert membership
      const { error } = await ctx.supabase
        .from('building_group_members')
        .upsert({ group_id: group.id, user_id: ctx.user.id }, { onConflict: 'group_id,user_id' })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { groupId: group.id }
    }),

  // ─── Step 12: Get Building Tenants for Election ────────
  getBuildingTenants: protectedProcedure.query(async ({ ctx }) => {
    const { data: tp } = await ctx.supabase.from('tenant_profiles').select('building_id').eq('user_id', ctx.user.id).single()
    if (!(tp as any)?.building_id) return []
    const { data: tenants } = await ctx.supabase
      .from('tenant_profiles')
      .select('user_id, profiles:user_id(id, full_name, avatar_url, email)')
      .eq('building_id', (tp as any).building_id)
    return (tenants ?? []).map((t: any) => ({
      userId: t.user_id,
      fullName: t.profiles?.full_name ?? t.profiles?.email ?? 'דייר',
      avatarUrl: t.profiles?.avatar_url ?? null,
    }))
  }),

  // ─── Step 12: Get Building Representatives ─────────────
  getBuildingRepresentatives: protectedProcedure.query(async ({ ctx }) => {
    const { data: tp } = await ctx.supabase.from('tenant_profiles').select('building_id').eq('user_id', ctx.user.id).single()
    if (!(tp as any)?.building_id) return []
    const { data: reps } = await ctx.supabase
      .from('building_representatives')
      .select('*, profile:profiles(full_name, avatar_url)')
      .eq('building_id', (tp as any).building_id)
      .eq('is_active', true)
    return reps ?? []
  }),

  // ─── Step 14: Get Inspections for Tenant's Project ─────
  getProjectInspections: protectedProcedure.query(async ({ ctx }) => {
    const { data: tp } = await ctx.supabase
      .from('tenant_profiles')
      .select('unit:units(building:buildings(project_id))')
      .eq('user_id', ctx.user.id).single()
    const projectId = (tp?.unit as any)?.building?.project_id
    if (!projectId) {
      // Try via building_id directly
      const { data: tp2 } = await ctx.supabase.from('tenant_profiles').select('building_id').eq('user_id', ctx.user.id).single()
      if (!(tp2 as any)?.building_id) return []
      const { data: building } = await ctx.supabase.from('buildings').select('project_id').eq('id', (tp2 as any).building_id).single()
      if (!(building as any)?.project_id) return []
      const { data: inspections } = await ctx.supabase
        .from('inspections')
        .select('id, inspection_type, status, conclusion, notes, submitted_at, is_useful')
        .eq('project_id', (building as any).project_id)
        .in('status', ['submitted', 'approved'])
        .order('submitted_at', { ascending: false })
      return inspections ?? []
    }
    const { data: inspections } = await ctx.supabase
      .from('inspections')
      .select('id, inspection_type, status, conclusion, notes, submitted_at, is_useful')
      .eq('project_id', projectId)
      .in('status', ['submitted', 'approved'])
      .order('submitted_at', { ascending: false })
    return inspections ?? []
  }),

  // ─── Steps 11-15 Status ────────────────────────────────
  getStepsStatus: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id

    // Get tenant profile with building info
    const { data: tp } = await ctx.supabase
      .from('tenant_profiles')
      .select('building_id, unit:units(building:buildings(project_id))')
      .eq('user_id', userId).single()

    const buildingId = (tp as any)?.building_id
    const projectId = (tp?.unit as any)?.building?.project_id

    // Step 11: building_group_members has record
    let step11 = false
    if (buildingId) {
      const { data: group } = await ctx.supabase
        .from('building_groups').select('id').eq('building_id', buildingId).maybeSingle()
      if (group) {
        const { data: member } = await ctx.supabase
          .from('building_group_members')
          .select('user_id')
          .eq('group_id', group.id)
          .eq('user_id', userId)
          .maybeSingle()
        step11 = !!member
      }
    }

    // Step 12: building_representatives has active record for building
    let step12 = false
    if (buildingId) {
      const { count } = await ctx.supabase
        .from('building_representatives')
        .select('*', { count: 'exact', head: true })
        .eq('building_id', buildingId)
        .eq('is_active', true)
      step12 = (count ?? 0) > 0
    }

    // Step 13: protocol signed (check signatures for protocol-type doc)
    let step13 = false
    if (buildingId) {
      const { data: protocolDocs } = await ctx.supabase
        .from('documents')
        .select('id')
        .eq('building_id', buildingId)
        .eq('doc_type', 'protocol')
      if (protocolDocs && protocolDocs.length > 0) {
        const docIds = protocolDocs.map((d: any) => d.id)
        const { data: sigs } = await ctx.supabase
          .from('signatures')
          .select('id')
          .eq('user_id', userId)
          .in('document_id', docIds)
        step13 = (sigs?.length ?? 0) > 0
      }
    }

    // Step 14: inspections exist for project (any status)
    let step14 = false
    const resolvedProjectId = projectId ?? await (async () => {
      if (!buildingId) return null
      const { data: b } = await ctx.supabase.from('buildings').select('project_id').eq('id', buildingId).single()
      return (b as any)?.project_id ?? null
    })()
    if (resolvedProjectId) {
      const { count } = await ctx.supabase
        .from('inspections')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', resolvedProjectId)
      step14 = (count ?? 0) > 0
    }

    // Step 15: expectation_validations exist for user
    let step15 = false
    const { count: valCount } = await ctx.supabase
      .from('expectation_validations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
    step15 = (valCount ?? 0) > 0

    return { step11, step12, step13, step14, step15 }
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
        const project = (tp?.unit as any)?.building?.project
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
    .input(z.object({ docId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: doc, error } = await ctx.supabase
        .from('documents')
        .select('*, signatures(signed_at, signature_image, full_name, id_number, user_id)')
        .eq('id', input.docId)
        .single()
      if (error || !doc) throw new TRPCError({ code: 'NOT_FOUND', message: 'מסמך לא נמצא' })
      // Check if current user already signed
      const mySig = ((doc as any).signatures ?? []).find((s: any) => s.user_id === ctx.user.id)
      return { ...doc, mySig: mySig ?? null }
    }),

  signDocumentWithSignature: protectedProcedure
    .input(z.object({
      docId: z.string().uuid(),
      signatureImage: z.string(),
      fullName: z.string(),
      idNumber: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check not already signed
      const { data: existing } = await ctx.supabase
        .from('signatures')
        .select('id')
        .eq('document_id', input.docId)
        .eq('user_id', ctx.user.id)
        .maybeSingle()
      if (existing) throw new TRPCError({ code: 'BAD_REQUEST', message: 'כבר חתמת על מסמך זה' })

      const { error } = await ctx.supabase.from('signatures').insert({
        document_id: input.docId,
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
    if (!tp || !(tp as any).is_onboarded) {
      return { action: 'complete_profile', text: 'השלם את הפרופיל שלך', link: '/onboarding', icon: '📋' }
    }
    // Check tabu upload
    if (!(tp as any).tabu_file_url) {
      return { action: 'upload_tabu', text: 'העלה נסח טאבו', link: '/profile', icon: '📄' }
    }
    // Check open polls
    const { data: bgm } = await ctx.supabase.from('building_group_members').select('group_id').eq('user_id', ctx.user.id)
    if (bgm && bgm.length > 0) {
      const groupIds = bgm.map((m: any) => m.group_id)
      const { data: polls } = await ctx.supabase.from('polls').select('id, question').in('group_id', groupIds).eq('status', 'open')
      if (polls && polls.length > 0) {
        // Check if user voted
        const { data: votes } = await ctx.supabase.from('poll_votes').select('poll_id').eq('voter_id', ctx.user.id).in('poll_id', polls.map((p: any) => p.id))
        const votedIds = new Set((votes ?? []).map((v: any) => v.poll_id))
        const unvoted = polls.find((p: any) => !votedIds.has(p.id))
        if (unvoted) {
          return { action: 'vote', text: `הצבע בהצבעה: ${(unvoted as any).question}`, link: '/building-chat', icon: '🗳️' }
        }
      }
    }
    // Check unsigned documents
    const { data: tpUnit } = await ctx.supabase.from('tenant_profiles').select('unit:units(building:buildings(project_id))').eq('user_id', ctx.user.id).single()
    const projectId = (tpUnit?.unit as any)?.building?.project_id
    if (projectId) {
      const { data: docs } = await ctx.supabase.from('documents').select('id, title, signatures(signed_at)').eq('project_id', projectId).eq('type', 'SIGN_REQUIRED')
      if (docs) {
        const unsigned = docs.find((d: any) => !d.signatures || d.signatures.length === 0)
        if (unsigned) {
          return { action: 'sign_document', text: `חתום על מסמך: ${(unsigned as any).title}`, link: '/documents', icon: '✍️' }
        }
      }
    }
    return { action: 'all_done', text: 'הפרויקט מתקדם, אין פעולות נדרשות ✅', link: '/dashboard', icon: '✅' }
  }),

})
