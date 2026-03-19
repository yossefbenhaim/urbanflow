import { z } from 'zod'
import { router, protectedProcedure } from '../middleware/auth'

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
      pollType: z.enum(['single', 'multiple']).default('single'),
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
})

// Moved to separate route - see index.ts for multipart upload
