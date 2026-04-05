import { z } from 'zod'
import { router, protectedProcedure } from '../middleware/auth'
import { TRPCError } from '@trpc/server'

export const committeeRouter = router({
  getBuildingOverview: protectedProcedure.query(async ({ ctx }) => {
    const { data: buildings } = await ctx.supabase
      .from('buildings').select('*, units(count), tenant_profiles(count)')
      .eq('committee_contact_id', ctx.user.id)
    return buildings ?? []
  }),

  getTenantSignatureStatus: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('tenant_profiles')
        .select('*, profile:profiles(*), unit:units!inner(building_id), signatures:signatures(signed_at)')
        .eq('unit.building_id', input)
      return data ?? []
    }),

  sendReminder: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      console.log(`[REMINDER] Sent to tenant ${input} by ${ctx.user.id}`)
      return { sent: true, tenantId: input }
    }),

  broadcastMessage: protectedProcedure
    .input(z.object({ buildingId: z.string(), title: z.string(), body: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { data: units } = await ctx.supabase.from('units').select('count').eq('building_id', input.buildingId)
      const count = (units as any)?.[0]?.count ?? 0
      const { data, error } = await ctx.supabase.from('broadcast_messages').insert({
        building_id: input.buildingId, sender_id: ctx.user.id,
        title: input.title, body: input.body,
        recipient_count: count, channel: 'EMAIL'
      }).select().single()
      if (error) throw error
      return data
    }),

  createMeetingMinutes: protectedProcedure
    .input(z.object({ buildingId: z.string(), date: z.string(), attendees: z.array(z.string()), decisions: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.from('meeting_minutes').insert({
        building_id: input.buildingId, date: input.date,
        attendees: input.attendees, decisions: input.decisions,
        created_by: ctx.user.id
      }).select().single()
      if (error) throw error
      return data
    }),

  getMeetingMinutes: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('meeting_minutes').select('*').eq('building_id', input).order('date', { ascending: false })
      return data ?? []
    }),

  createPoll: protectedProcedure
    .input(z.object({
      question: z.string().min(5),
      options: z.array(z.string()).min(2),
      isAnonymous: z.boolean().default(true),
      pollType: z.enum(['single', 'multiple', 'project_approval', 'representative_election']).default('single'),
      closeAt: z.string().optional(),
      thresholdPct: z.number().min(50).max(90).default(60),
      groupId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data: poll, error: pollErr } = await ctx.supabase.from('polls').insert({
        group_id: input.groupId,
        question: input.question,
        options: input.options,
        poll_type: input.pollType,
        is_anonymous: input.isAnonymous,
        close_at: input.closeAt ?? null,
        threshold_pct: input.thresholdPct,
        status: 'open',
      }).select().single()
      if (pollErr) throw pollErr

      const { data: msg, error: msgErr } = await ctx.supabase.from('group_messages').insert({
        group_id: input.groupId,
        sender_id: ctx.user.id,
        content: `📊 סקר חדש: ${input.question}`,
        message_type: 'poll',
        poll_id: poll.id,
      }).select().single()
      if (msgErr) throw msgErr

      // Notify all group members
      const { data: members } = await ctx.supabase
        .from('building_group_members')
        .select('user_id')
        .eq('group_id', input.groupId)
        .neq('user_id', ctx.user.id)

      if (members && members.length > 0) {
        const deadline = input.closeAt
          ? new Date(input.closeAt).toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })
          : null
        await ctx.supabase.from('notifications').insert(
          members.map((m: any) => ({
            user_id: m.user_id,
            type: 'poll',
            title: '📊 סקר חדש מהועד',
            message: `${input.question}${deadline ? ` · מועד אחרון: ${deadline}` : ''}`,
            action_url: `/building-chat/${input.groupId}`,
          }))
        )
      }

      return { pollId: poll.id, messageId: msg.id }
    }),

  uploadDocument: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      docType: z.enum(['contract', 'protocol', 'letter', 'other']),
      fileUrl: z.string().url(),
      description: z.string().optional(),
      shareToGroup: z.boolean().default(false),
      buildingId: z.string().uuid(),
      groupId: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data: building } = await ctx.supabase
        .from('buildings').select('project_id').eq('id', input.buildingId).single()
      if (!building) throw new Error('Building not found')

      const { data: doc, error: docErr } = await ctx.supabase.from('documents').insert({
        project_id: building.project_id,
        building_id: input.buildingId,
        title: input.name,
        type: 'INFO_ONLY',
        doc_type: input.docType,
        file_url: input.fileUrl,
        uploaded_by: ctx.user.id,
      }).select().single()
      if (docErr) throw docErr

      if (input.shareToGroup && input.groupId) {
        await ctx.supabase.from('group_messages').insert({
          group_id: input.groupId,
          sender_id: ctx.user.id,
          content: `📄 מסמך חדש הועלה: ${input.name}${input.description ? '\n' + input.description : ''}`,
          message_type: 'document',
        })
      }

      return doc
    }),

  sendBroadcast: protectedProcedure
    .input(z.object({
      title: z.string().min(1),
      content: z.string().min(5),
      priority: z.enum(['normal', 'urgent']).default('normal'),
      target: z.enum(['all', 'group']).default('all'),
      buildingId: z.string().uuid(),
      groupId: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data: tenants } = await ctx.supabase
        .from('tenant_profiles')
        .select('user_id, unit:units!inner(building_id)')
        .eq('unit.building_id', input.buildingId)

      const tenantIds = (tenants ?? []).map((t: any) => t.user_id).filter(Boolean)

      const { data: broadcast, error } = await ctx.supabase.from('broadcast_messages').insert({
        building_id: input.buildingId,
        sender_id: ctx.user.id,
        title: input.title,
        body: input.content,
        recipient_count: tenantIds.length,
        channel: input.priority === 'urgent' ? 'URGENT' : 'EMAIL',
      }).select().single()
      if (error) throw error

      if (tenantIds.length > 0) {
        await ctx.supabase.from('notifications').insert(
          tenantIds.map((uid: string) => ({
            user_id: uid,
            type: input.priority === 'urgent' ? 'urgent_broadcast' : 'broadcast',
            title: input.title,
            message: input.content,
          }))
        )
      }

      if (input.target === 'group' && input.groupId) {
        await ctx.supabase.from('group_messages').insert({
          group_id: input.groupId,
          sender_id: ctx.user.id,
          content: `📢 ${input.priority === 'urgent' ? '🔴 דחוף! ' : ''}${input.title}\n${input.content}`,
          message_type: 'text',
        })
      }

      return broadcast
    }),

  scheduleMeeting: protectedProcedure
    .input(z.object({
      title: z.string().min(3),
      scheduledAt: z.string(),
      location: z.string().optional(),
      agenda: z.string().optional(),
      buildingId: z.string().uuid(),
      groupId: z.string().uuid().optional(),
      notifyAll: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const meetingDate = input.scheduledAt.split('T')[0]

      const { data: meeting, error } = await ctx.supabase.from('meeting_minutes').insert({
        building_id: input.buildingId,
        date: meetingDate,
        title: input.title,
        location: input.location ?? null,
        agenda: input.agenda ?? null,
        scheduled_at: input.scheduledAt,
        notify_all: input.notifyAll,
        attendees: [],
        decisions: '',
        created_by: ctx.user.id,
      }).select().single()
      if (error) throw error

      if (input.notifyAll) {
        const { data: tenants } = await ctx.supabase
          .from('tenant_profiles')
          .select('user_id, unit:units!inner(building_id)')
          .eq('unit.building_id', input.buildingId)
        const tenantIds = (tenants ?? []).map((t: any) => t.user_id).filter(Boolean)

        if (tenantIds.length > 0) {
          await ctx.supabase.from('notifications').insert(
            tenantIds.map((uid: string) => ({
              user_id: uid,
              type: 'meeting',
              title: `📅 ישיבה: ${input.title}`,
              message: `${new Date(input.scheduledAt).toLocaleString('he-IL')}${input.location ? ' | ' + input.location : ''}`,
            }))
          )
        }
      }

      if (input.groupId) {
        await ctx.supabase.from('group_messages').insert({
          group_id: input.groupId,
          sender_id: ctx.user.id,
          content: `📅 ישיבה נקבעה: ${input.title}\nתאריך: ${new Date(input.scheduledAt).toLocaleString('he-IL')}${input.location ? '\nמיקום: ' + input.location : ''}${input.agenda ? '\nסדר יום: ' + input.agenda : ''}`,
          message_type: 'text',
        })
      }

      return meeting
    }),

  requestSignatures: protectedProcedure
    .input(z.object({
      documentId: z.string().uuid(),
      message: z.string().optional(),
      tenantIds: z.array(z.string().uuid()),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data: doc } = await ctx.supabase
        .from('documents').select('title').eq('id', input.documentId).single()

      if (input.tenantIds.length > 0) {
        await ctx.supabase.from('notifications').insert(
          input.tenantIds.map((uid) => ({
            user_id: uid,
            type: 'signature_request',
            title: `✍️ נדרשת חתימה: ${doc?.title ?? 'מסמך'}`,
            message: input.message ?? 'נציג הועד מבקש את חתימתך על מסמך.',
          }))
        )
      }

      return { requested: input.tenantIds.length }
    }),

  getBuildingStatus: protectedProcedure.query(async ({ ctx }) => {
    const { data: profile } = await ctx.supabase
      .from('profiles')
      .select('representative_building_id, is_building_representative')
      .eq('id', ctx.user.id)
      .single()

    let buildingId = profile?.representative_building_id
    if (!buildingId) {
      const { data: building } = await ctx.supabase
        .from('buildings').select('id').eq('committee_contact_id', ctx.user.id).single()
      buildingId = building?.id
    }
    if (!buildingId) return null

    const [buildingRes, tenantsRes, docsRes, meetingsRes] = await Promise.all([
      ctx.supabase.from('buildings').select('*').eq('id', buildingId).single(),
      ctx.supabase
        .from('tenant_profiles')
        .select('*, profile:profiles(id, full_name, email, is_building_representative), signatures:signatures(signed_at), unit:units!inner(building_id)')
        .eq('unit.building_id', buildingId),
      ctx.supabase
        .from('documents').select('*').eq('building_id', buildingId)
        .order('created_at', { ascending: false }).limit(5),
      ctx.supabase
        .from('meeting_minutes').select('*').eq('building_id', buildingId)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true }).limit(5),
    ])

    return {
      building: buildingRes.data,
      tenants: tenantsRes.data ?? [],
      documents: docsRes.data ?? [],
      upcomingMeetings: meetingsRes.data ?? [],
    }
  }),

  getMyBuildingGroup: protectedProcedure.query(async ({ ctx }) => {
    const { data: profile } = await ctx.supabase
      .from('profiles').select('representative_building_id').eq('id', ctx.user.id).single()

    let buildingId = profile?.representative_building_id
    if (!buildingId) {
      const { data: b } = await ctx.supabase
        .from('buildings').select('id').eq('committee_contact_id', ctx.user.id).single()
      buildingId = b?.id
    }
    if (!buildingId) return null

    const { data: group } = await ctx.supabase
      .from('building_groups').select('*').eq('building_id', buildingId).single()
    return group
  }),

  getBuildingDocuments: protectedProcedure.query(async ({ ctx }) => {
    const { data: profile } = await ctx.supabase
      .from('profiles').select('representative_building_id').eq('id', ctx.user.id).single()

    let buildingId = profile?.representative_building_id
    if (!buildingId) {
      const { data: b } = await ctx.supabase
        .from('buildings').select('id').eq('committee_contact_id', ctx.user.id).single()
      buildingId = b?.id
    }
    if (!buildingId) return []

    const { data } = await ctx.supabase
      .from('documents').select('*').eq('building_id', buildingId)
      .order('created_at', { ascending: false })
    return data ?? []
  }),

  getBuildingTenants: protectedProcedure.query(async ({ ctx }) => {
    const { data: profile } = await ctx.supabase
      .from('profiles').select('representative_building_id').eq('id', ctx.user.id).single()

    let buildingId = profile?.representative_building_id
    if (!buildingId) {
      const { data: b } = await ctx.supabase
        .from('buildings').select('id').eq('committee_contact_id', ctx.user.id).single()
      buildingId = b?.id
    }
    if (!buildingId) return []

    const { data } = await ctx.supabase
      .from('tenant_profiles')
      .select('user_id, profile:profiles(id, full_name, email), unit:units!inner(building_id)')
      .eq('unit.building_id', buildingId)
    return (data ?? []).map((t: any) => ({
      userId: t.user_id,
      name: t.profile?.full_name ?? t.profile?.email ?? 'דייר',
      email: t.profile?.email,
    }))
  }),


  sendPollReminder: protectedProcedure
    .input(z.object({ userId: z.string(), pollId: z.string(), phone: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { data: poll } = await ctx.supabase.from('polls').select('question').eq('id', input.pollId).single()
      const question = (poll as any)?.question ?? 'הסקר'

      await ctx.supabase.from('notifications').insert({
        user_id: input.userId,
        type: 'poll_reminder',
        title: '⏰ תזכורת הצבעה',
        message: `נציג הועד מזכיר לך למלא את הסקר: "${question}"`,
        action_url: `/building-chat`,
      })
      return { sent: true }
    }),

  sendBroadcastReminder: protectedProcedure
    .input(z.object({ pollId: z.string(), message: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { data: poll } = await ctx.supabase
        .from('polls').select('group_id').eq('id', input.pollId).single()
      if (!poll) return { sent: 0 }

      const { data: members } = await ctx.supabase
        .from('building_group_members')
        .select('user_id').eq('group_id', (poll as any).group_id).neq('user_id', ctx.user.id)

      if (!members?.length) return { sent: 0 }

      await ctx.supabase.from('notifications').insert(
        members.map((m: any) => ({
          user_id: m.user_id,
          type: 'poll_reminder',
          title: '⏰ תזכורת הצבעה',
          message: input.message,
          action_url: `/building-chat/${(poll as any).group_id}`,
        }))
      )
      return { sent: members.length }
    }),

  // ─── B1: Apartment Voting (Unit-based) ─────────────────

  castApartmentVote: protectedProcedure
    .input(z.object({
      pollId: z.string().uuid(),
      apartmentId: z.string().uuid(),
      value: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id

      // 1. Check for open ownership dispute → block voting
      const { data: disputes } = await ctx.supabase
        .from('ownership_disputes')
        .select('id')
        .eq('apartment_id', input.apartmentId)
        .eq('status', 'open')
      if (disputes && disputes.length > 0) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'לא ניתן להצביע — יש סכסוך בעלות פתוח על הדירה',
        })
      }

      // 2. Check for approved power of attorney → only proxy holder can vote
      const { data: poa } = await ctx.supabase
        .from('power_of_attorney')
        .select('receiver_user_id')
        .eq('apartment_id', input.apartmentId)
        .eq('status', 'approved')
        .limit(1)
        .maybeSingle()

      if (poa) {
        if (userId !== poa.receiver_user_id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'יש ייפוי כוח מאושר — רק מיופה הכוח יכול להצביע',
          })
        }
        // Proxy holder votes directly
        await ctx.supabase.from('apartment_votes').upsert({
          poll_id: input.pollId,
          apartment_id: input.apartmentId,
          vote_value: input.value,
          decided_by: 'proxy',
          internal_votes: { [userId]: input.value },
          finalized: true,
          finalized_at: new Date().toISOString(),
        }, { onConflict: 'poll_id,apartment_id' })
        return { status: 'finalized', decidedBy: 'proxy', voteValue: input.value }
      }

      // 3. Get all owners of this apartment
      const { data: owners } = await ctx.supabase
        .from('apartment_owners')
        .select('user_id')
        .eq('apartment_id', input.apartmentId)
        .eq('status', 'active')
      if (!owners || owners.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'לא נמצאו בעלים לדירה זו' })
      }

      // Verify the voter is an owner
      const isOwner = owners.some((o: any) => o.user_id === userId)
      if (!isOwner) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'רק בעלי הדירה יכולים להצביע' })
      }

      const totalOwners = owners.length

      // 4. Single owner → direct vote
      if (totalOwners === 1) {
        await ctx.supabase.from('apartment_votes').upsert({
          poll_id: input.pollId,
          apartment_id: input.apartmentId,
          vote_value: input.value,
          decided_by: 'unanimous',
          internal_votes: { [userId]: input.value },
          finalized: true,
          finalized_at: new Date().toISOString(),
        }, { onConflict: 'poll_id,apartment_id' })
        return { status: 'finalized', decidedBy: 'unanimous', voteValue: input.value }
      }

      // 5. Multiple owners — record internal vote, check consensus/majority
      const { data: existing } = await ctx.supabase
        .from('apartment_votes')
        .select('internal_votes')
        .eq('poll_id', input.pollId)
        .eq('apartment_id', input.apartmentId)
        .maybeSingle()

      const internalVotes: Record<string, string> = existing?.internal_votes
        ? { ...(existing.internal_votes as Record<string, string>) }
        : {}
      internalVotes[userId] = input.value

      const votedCount = Object.keys(internalVotes).length

      // 2 owners → need both to agree (unanimous)
      if (totalOwners === 2) {
        if (votedCount < 2) {
          await ctx.supabase.from('apartment_votes').upsert({
            poll_id: input.pollId,
            apartment_id: input.apartmentId,
            vote_value: input.value,
            decided_by: 'unanimous',
            internal_votes: internalVotes,
            finalized: false,
          }, { onConflict: 'poll_id,apartment_id' })
          return { status: 'pending', message: 'ממתין לבעלים נוסף' }
        }
        // Both voted — check if they agree
        const values = Object.values(internalVotes)
        if (values[0] === values[1]) {
          await ctx.supabase.from('apartment_votes').upsert({
            poll_id: input.pollId,
            apartment_id: input.apartmentId,
            vote_value: values[0],
            decided_by: 'unanimous',
            internal_votes: internalVotes,
            finalized: true,
            finalized_at: new Date().toISOString(),
          }, { onConflict: 'poll_id,apartment_id' })
          return { status: 'finalized', decidedBy: 'unanimous', voteValue: values[0] }
        }
        // Disagreement — stays pending
        await ctx.supabase.from('apartment_votes').upsert({
          poll_id: input.pollId,
          apartment_id: input.apartmentId,
          vote_value: 'disputed',
          decided_by: 'unanimous',
          internal_votes: internalVotes,
          finalized: false,
        }, { onConflict: 'poll_id,apartment_id' })
        return { status: 'disputed', message: 'הבעלים חלוקים — הצבעה לא סופית' }
      }

      // 3+ owners → majority (50%+)
      const valueCounts: Record<string, number> = {}
      for (const v of Object.values(internalVotes)) {
        valueCounts[v] = (valueCounts[v] ?? 0) + 1
      }
      const majorityThreshold = Math.floor(totalOwners / 2) + 1
      const majorityValue = Object.entries(valueCounts).find(([, c]) => c >= majorityThreshold)

      if (majorityValue) {
        await ctx.supabase.from('apartment_votes').upsert({
          poll_id: input.pollId,
          apartment_id: input.apartmentId,
          vote_value: majorityValue[0],
          decided_by: 'majority',
          internal_votes: internalVotes,
          finalized: true,
          finalized_at: new Date().toISOString(),
        }, { onConflict: 'poll_id,apartment_id' })
        return { status: 'finalized', decidedBy: 'majority', voteValue: majorityValue[0] }
      }

      // No majority yet
      await ctx.supabase.from('apartment_votes').upsert({
        poll_id: input.pollId,
        apartment_id: input.apartmentId,
        vote_value: Object.values(internalVotes)[0],
        decided_by: 'majority',
        internal_votes: internalVotes,
        finalized: false,
      }, { onConflict: 'poll_id,apartment_id' })
      return { status: 'pending', message: `הצביעו ${votedCount} מתוך ${totalOwners} בעלים` }
    }),

  getApartmentVoteStatus: protectedProcedure
    .input(z.object({
      pollId: z.string().uuid(),
      apartmentId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      // Get owners
      const { data: owners } = await ctx.supabase
        .from('apartment_owners')
        .select('user_id, profiles:user_id(full_name)')
        .eq('apartment_id', input.apartmentId)
        .eq('status', 'active')

      // Get vote
      const { data: vote } = await ctx.supabase
        .from('apartment_votes')
        .select('*')
        .eq('poll_id', input.pollId)
        .eq('apartment_id', input.apartmentId)
        .maybeSingle()

      // Check disputes
      const { data: disputes } = await ctx.supabase
        .from('ownership_disputes')
        .select('id')
        .eq('apartment_id', input.apartmentId)
        .eq('status', 'open')

      // Check power of attorney
      const { data: poa } = await ctx.supabase
        .from('power_of_attorney')
        .select('receiver_user_id')
        .eq('apartment_id', input.apartmentId)
        .eq('status', 'approved')
        .limit(1)
        .maybeSingle()

      const hasDispute = (disputes?.length ?? 0) > 0
      const hasPoa = !!poa
      const internalVotes = (vote?.internal_votes as Record<string, string>) ?? {}
      const votedUserIds = Object.keys(internalVotes)
      const totalOwners = owners?.length ?? 0

      let status: 'voted' | 'pending' | 'blocked' | 'proxy' | 'not_started'
      if (hasDispute) status = 'blocked'
      else if (vote?.finalized && hasPoa) status = 'proxy'
      else if (vote?.finalized) status = 'voted'
      else if (votedUserIds.length > 0) status = 'pending'
      else status = 'not_started'

      return {
        status,
        voteValue: vote?.vote_value ?? null,
        decidedBy: vote?.decided_by ?? null,
        finalized: vote?.finalized ?? false,
        internalVotes,
        votedOwners: votedUserIds,
        totalOwners,
        owners: (owners ?? []).map((o: any) => ({
          userId: o.user_id,
          name: o.profiles?.full_name ?? 'בעלים',
          voted: votedUserIds.includes(o.user_id),
        })),
        hasDispute,
        hasPoa,
      }
    }),

  getApartmentVotesForPoll: protectedProcedure
    .input(z.object({ pollId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Get the poll's group → building → units
      const { data: poll } = await ctx.supabase
        .from('polls')
        .select('group_id, building_groups(building_id)')
        .eq('id', input.pollId)
        .single()
      if (!poll) throw new TRPCError({ code: 'NOT_FOUND', message: 'סקר לא נמצא' })

      const buildingId = (poll as any).building_groups?.building_id
      if (!buildingId) return { apartments: [], totalApartments: 0, votedCount: 0 }

      // Get all units in building
      const { data: units } = await ctx.supabase
        .from('units')
        .select('id, floor, unit_number')
        .eq('building_id', buildingId)
        .order('floor', { ascending: true })

      if (!units || units.length === 0) return { apartments: [], totalApartments: 0, votedCount: 0 }

      // Get all apartment votes for this poll
      const { data: votes } = await ctx.supabase
        .from('apartment_votes')
        .select('*')
        .eq('poll_id', input.pollId)

      // Get disputes for all apartments
      const unitIds = units.map((u: any) => u.id)
      const { data: disputes } = await ctx.supabase
        .from('ownership_disputes')
        .select('apartment_id')
        .in('apartment_id', unitIds)
        .eq('status', 'open')

      // Get POAs
      const { data: poas } = await ctx.supabase
        .from('power_of_attorney')
        .select('apartment_id')
        .in('apartment_id', unitIds)
        .eq('status', 'approved')

      const disputeSet = new Set((disputes ?? []).map((d: any) => d.apartment_id))
      const poaSet = new Set((poas ?? []).map((p: any) => p.apartment_id))
      const voteMap = new Map((votes ?? []).map((v: any) => [v.apartment_id, v]))

      const apartments = units.map((u: any) => {
        const vote = voteMap.get(u.id)
        const hasDispute = disputeSet.has(u.id)
        const hasPoa = poaSet.has(u.id)

        let status: string
        if (hasDispute) status = 'blocked'
        else if (vote?.finalized && hasPoa) status = 'proxy'
        else if (vote?.finalized) status = 'voted'
        else if (vote && !vote.finalized) status = 'pending'
        else status = 'not_started'

        return {
          apartmentId: u.id,
          floor: u.floor,
          unitNumber: u.unit_number,
          status,
          voteValue: vote?.vote_value ?? null,
          decidedBy: vote?.decided_by ?? null,
        }
      })

      const votedCount = apartments.filter(a => a.status === 'voted' || a.status === 'proxy').length

      return { apartments, totalApartments: apartments.length, votedCount }
    }),

  // ─── B2: Stage Requirements (Guardrails) ───────────────

  checkStageRequirements: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Get project current stage
      const { data: project } = await ctx.supabase
        .from('projects')
        .select('id, stage, name')
        .eq('id', input.projectId)
        .single()
      if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'פרויקט לא נמצא' })

      const currentStage = (project as any).stage ?? 'initial'

      // Get requirements for this stage
      const { data: requirements } = await ctx.supabase
        .from('project_stage_requirements')
        .select('*')
        .eq('project_id', input.projectId)
        .eq('stage', currentStage)
        .order('requirement_type')

      if (!requirements || requirements.length === 0) {
        return {
          projectId: input.projectId,
          currentStage,
          nextStage: null,
          requirements: [],
          canAdvance: true,
        }
      }

      // Check each requirement
      const checkedReqs = await Promise.all(
        requirements.map(async (req: any) => {
          let isMet = false

          switch (req.requirement_type) {
            case 'min_vote_pct': {
              // Check apartment votes percentage across all open polls
              const { data: buildings } = await ctx.supabase
                .from('buildings').select('id').eq('project_id', input.projectId)
              if (buildings && buildings.length > 0) {
                const buildingIds = buildings.map((b: any) => b.id)
                const { data: groups } = await ctx.supabase
                  .from('building_groups').select('id').in('building_id', buildingIds)
                if (groups && groups.length > 0) {
                  const groupIds = groups.map((g: any) => g.id)
                  const { data: polls } = await ctx.supabase
                    .from('polls').select('id').in('group_id', groupIds)
                  if (polls && polls.length > 0) {
                    // Check latest poll
                    const latestPollId = polls[polls.length - 1].id
                    const { count: totalUnits } = await ctx.supabase
                      .from('units').select('*', { count: 'exact', head: true })
                      .in('building_id', buildingIds)
                    const { count: votedUnits } = await ctx.supabase
                      .from('apartment_votes').select('*', { count: 'exact', head: true })
                      .eq('poll_id', latestPollId).eq('finalized', true)
                    const pct = (totalUnits ?? 0) > 0
                      ? Math.round(((votedUnits ?? 0) / (totalUnits ?? 1)) * 100)
                      : 0
                    isMet = pct >= parseInt(req.requirement_value ?? '67')
                  }
                }
              }
              break
            }
            case 'required_documents': {
              const { count } = await ctx.supabase
                .from('documents').select('*', { count: 'exact', head: true })
                .eq('building_id', input.projectId)
              isMet = (count ?? 0) > 0
              break
            }
            case 'no_open_disputes': {
              const { data: buildings } = await ctx.supabase
                .from('buildings').select('id').eq('project_id', input.projectId)
              if (buildings && buildings.length > 0) {
                const { data: units } = await ctx.supabase
                  .from('units').select('id').in('building_id', buildings.map((b: any) => b.id))
                if (units && units.length > 0) {
                  const { count } = await ctx.supabase
                    .from('ownership_disputes').select('*', { count: 'exact', head: true })
                    .in('apartment_id', units.map((u: any) => u.id))
                    .eq('status', 'open')
                  isMet = (count ?? 0) === 0
                }
              }
              break
            }
            case 'has_representative': {
              const { data: buildings } = await ctx.supabase
                .from('buildings').select('id').eq('project_id', input.projectId)
              if (buildings && buildings.length > 0) {
                const { count } = await ctx.supabase
                  .from('building_representatives').select('*', { count: 'exact', head: true })
                  .in('building_id', buildings.map((b: any) => b.id))
                isMet = (count ?? 0) > 0
              }
              break
            }
            case 'has_lawyer': {
              // Check if project has a provider with lawyer role
              const { data: buildings } = await ctx.supabase
                .from('buildings').select('id').eq('project_id', input.projectId)
              if (buildings && buildings.length > 0) {
                const { count } = await ctx.supabase
                  .from('service_listings').select('*', { count: 'exact', head: true })
                  .eq('category', 'lawyer')
                isMet = (count ?? 0) > 0
              }
              break
            }
            case 'has_protocol': {
              const { data: buildings } = await ctx.supabase
                .from('buildings').select('id').eq('project_id', input.projectId)
              if (buildings && buildings.length > 0) {
                const { count } = await ctx.supabase
                  .from('meeting_minutes').select('*', { count: 'exact', head: true })
                  .in('building_id', buildings.map((b: any) => b.id))
                isMet = (count ?? 0) > 0
              }
              break
            }
          }

          // Update the requirement
          await ctx.supabase
            .from('project_stage_requirements')
            .update({ is_met: isMet, checked_at: new Date().toISOString() })
            .eq('id', req.id)

          return {
            id: req.id,
            type: req.requirement_type,
            value: req.requirement_value,
            isMet,
            nextStage: req.next_stage,
          }
        })
      )

      const canAdvance = checkedReqs.every(r => r.isMet)
      const nextStage = requirements[0]?.next_stage ?? null

      return {
        projectId: input.projectId,
        currentStage,
        nextStage,
        requirements: checkedReqs,
        canAdvance,
      }
    }),

  advanceStage: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Re-check all requirements first
      const { data: project } = await ctx.supabase
        .from('projects')
        .select('id, stage')
        .eq('id', input.projectId)
        .single()
      if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'פרויקט לא נמצא' })

      const currentStage = (project as any).stage ?? 'initial'

      const { data: requirements } = await ctx.supabase
        .from('project_stage_requirements')
        .select('*')
        .eq('project_id', input.projectId)
        .eq('stage', currentStage)

      if (!requirements || requirements.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'אין דרישות מוגדרות לשלב זה' })
      }

      const unmet = requirements.filter((r: any) => !r.is_met)
      if (unmet.length > 0) {
        const missing = unmet.map((r: any) => {
          const labels: Record<string, string> = {
            min_vote_pct: `אחוז הצבעה מינימלי (${r.requirement_value}%)`,
            required_documents: 'מסמכים נדרשים',
            no_open_disputes: 'אין סכסוכי בעלות פתוחים',
            has_representative: 'נציג בניין ממונה',
            has_lawyer: 'עורך דין מלווה',
            has_protocol: 'פרוטוקול ישיבה',
          }
          return labels[r.requirement_type] ?? r.requirement_type
        })
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `לא ניתן להתקדם. חסר: ${missing.join(', ')}`,
        })
      }

      const nextStage = requirements[0].next_stage

      const { error } = await ctx.supabase
        .from('projects')
        .update({ stage: nextStage })
        .eq('id', input.projectId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      return { advanced: true, from: currentStage, to: nextStage }
    }),

  getStageRequirements: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('project_stage_requirements')
        .select('*')
        .eq('project_id', input.projectId)
        .order('stage')
      return data ?? []
    }),

  // ─── Post-Election: Form Upload ────────────────────────
  uploadElectionForm: protectedProcedure
    .input(z.object({
      buildingId: z.string().uuid(),
      formType: z.enum(['representative_election_form', 'organizer_election_form']),
      fileUrl: z.string().url(),
      fileName: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.from('election_forms').insert({
        user_id: ctx.user.id,
        building_id: input.buildingId,
        form_type: input.formType,
        file_url: input.fileUrl,
        file_name: input.fileName,
      }).select().single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  getElectionForms: protectedProcedure
    .input(z.object({ buildingId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('election_forms')
        .select('*, user:profiles(full_name)')
        .eq('building_id', input.buildingId)
        .order('created_at', { ascending: false })
      return data ?? []
    }),

  getElectionStatus: protectedProcedure
    .input(z.object({ buildingId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: rep } = await ctx.supabase
        .from('building_representatives')
        .select('*, user:profiles(full_name)')
        .eq('building_id', input.buildingId)
        .eq('is_active', true)
        .maybeSingle()
      const { data: myForm } = await ctx.supabase
        .from('election_forms')
        .select('id, file_url, created_at')
        .eq('building_id', input.buildingId)
        .eq('user_id', ctx.user.id)
        .eq('form_type', 'representative_election_form')
        .maybeSingle()
      const { count } = await ctx.supabase
        .from('election_forms')
        .select('*', { count: 'exact', head: true })
        .eq('building_id', input.buildingId)
        .eq('form_type', 'representative_election_form')
      return {
        representative: rep ? { name: (rep.user as any)?.full_name, userId: rep.user_id } : null,
        myFormUploaded: !!myForm,
        totalFormsUploaded: count ?? 0,
      }
    }),
})

// Moved to separate route - see index.ts for multipart upload
