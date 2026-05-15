import { z } from 'zod'
import { router, protectedProcedure } from '../middleware/auth'
import { TRPCError } from '@trpc/server'

// ── Schema reminder (migration 021_provider_negotiations.sql) ────────
// provider_negotiations: id, building_id, project_id, invited_by, provider_id,
//   provider_role, status, committee_agreed_at, provider_agreed_at, poll_id,
//   poll_deadline, result, decided_at
// negotiation_messages: id, negotiation_id, sender_id, kind, body, created_at
// building_tasks: id, building_id, project_id, assigned_to, assigned_role,
//   source, source_id, kind, title, description, status, file_url, due_at
// ─────────────────────────────────────────────────────────────────────

const ProviderRole = z.enum(['architect', 'appraiser', 'lawyer', 'developer', 'engineer', 'inspector', 'other'])

interface NegotiationRow {
  id: string
  building_id: string
  project_id: string | null
  invited_by: string
  provider_id: string
  provider_role: string
  status: string
  committee_agreed_at: string | null
  provider_agreed_at: string | null
  poll_id: string | null
  poll_deadline: string | null
  result: string | null
  decided_at: string | null
  created_at: string
  updated_at: string
}

async function systemMessage(ctx: { supabase: unknown }, negotiationId: string, body: string, kind = 'system') {
  const sb = ctx.supabase as { from: (t: string) => { insert: (r: unknown) => Promise<unknown> } }
  await sb.from('negotiation_messages').insert({
    negotiation_id: negotiationId,
    sender_id: null,
    kind,
    body,
  })
}

async function assertParty(
  ctx: { supabase: unknown; user: { id: string } },
  negotiationId: string,
): Promise<NegotiationRow> {
  const sb = ctx.supabase as { from: (t: string) => { select: (q: string) => { eq: (c: string, v: string) => { single: () => Promise<{ data: NegotiationRow | null }> } } } }
  const { data: n } = await sb
    .from('provider_negotiations')
    .select('*')
    .eq('id', negotiationId)
    .single()
  if (!n) throw new TRPCError({ code: 'NOT_FOUND', message: 'משא ומתן לא נמצא' })
  if (n.invited_by !== ctx.user.id && n.provider_id !== ctx.user.id) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'אין הרשאה' })
  }
  return n
}

export const negotiationsRouter = router({
  // Committee invites a provider for a building+role.
  invite: protectedProcedure
    .input(
      z.object({
        buildingId: z.string().uuid(),
        providerId: z.string().uuid(),
        providerRole: ProviderRole,
        projectId: z.string().uuid().optional(),
        message: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Reject duplicates (active negotiation for same building+provider+role)
      const { data: existing } = await ctx.supabase
        .from('provider_negotiations')
        .select('id, status')
        .eq('building_id', input.buildingId)
        .eq('provider_id', input.providerId)
        .eq('provider_role', input.providerRole)
        .not('status', 'in', '(cancelled,superseded,rejected_by_tenants)')
        .maybeSingle()
      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'כבר נשלחה הזמנה לנותן השירות הזה בתפקיד זה' })
      }

      const { data: created, error } = await ctx.supabase
        .from('provider_negotiations')
        .insert({
          building_id: input.buildingId,
          project_id: input.projectId ?? null,
          invited_by: ctx.user.id,
          provider_id: input.providerId,
          provider_role: input.providerRole,
          status: 'invited',
        })
        .select()
        .single()
      if (error || !created) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message ?? 'שגיאה' })

      await systemMessage(ctx, created.id, `הוועד שלח הזמנה לתפקיד ${input.providerRole}.`)
      if (input.message) {
        await ctx.supabase.from('negotiation_messages').insert({
          negotiation_id: created.id,
          sender_id: ctx.user.id,
          kind: 'chat',
          body: input.message,
        })
      }

      // Notify the provider
      await ctx.supabase.from('notifications').insert({
        user_id: input.providerId,
        type: 'negotiation_invite',
        title: '✉️ הזמנה לפרויקט',
        message: `הוועד הזמין אותך לתפקיד ${input.providerRole}`,
        action_url: `/negotiations/${created.id}`,
      })

      return created as NegotiationRow
    }),

  // Provider accepts the invitation → opens chat.
  accept: protectedProcedure
    .input(z.object({ negotiationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const n = await assertParty(ctx, input.negotiationId)
      if (n.provider_id !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN', message: 'רק נותן השירות יכול לאשר' })
      if (n.status !== 'invited') throw new TRPCError({ code: 'BAD_REQUEST', message: `מצב לא תקין: ${n.status}` })

      await ctx.supabase
        .from('provider_negotiations')
        .update({ status: 'in_negotiation' })
        .eq('id', n.id)
      await systemMessage(ctx, n.id, 'נותן השירות אישר את ההזמנה. החל משא ומתן.')

      await ctx.supabase.from('notifications').insert({
        user_id: n.invited_by,
        type: 'negotiation_accepted',
        title: '✅ נותן השירות אישר',
        message: 'משא ומתן נפתח',
        action_url: `/negotiations/${n.id}`,
      })
      return { ok: true }
    }),

  // Either side declines / cancels.
  cancel: protectedProcedure
    .input(z.object({ negotiationId: z.string().uuid(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const n = await assertParty(ctx, input.negotiationId)
      if (['polling', 'approved'].includes(n.status)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'לא ניתן לבטל אחרי הצבעת דיירים' })
      }
      await ctx.supabase
        .from('provider_negotiations')
        .update({ status: 'cancelled' })
        .eq('id', n.id)
      const who = ctx.user.id === n.invited_by ? 'הוועד' : 'נותן השירות'
      await systemMessage(ctx, n.id, `${who} ביטל את המשא ומתן${input.reason ? ` — ${input.reason}` : ''}.`)
      return { ok: true }
    }),

  // Send a chat message.
  sendMessage: protectedProcedure
    .input(z.object({ negotiationId: z.string().uuid(), body: z.string().min(1).max(4000) }))
    .mutation(async ({ ctx, input }) => {
      const n = await assertParty(ctx, input.negotiationId)
      if (['cancelled', 'rejected_by_tenants', 'superseded'].includes(n.status)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'משא ומתן סגור' })
      }
      const { data, error } = await ctx.supabase
        .from('negotiation_messages')
        .insert({
          negotiation_id: n.id,
          sender_id: ctx.user.id,
          kind: 'chat',
          body: input.body,
        })
        .select()
        .single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Notify the other party
      const recipient = ctx.user.id === n.invited_by ? n.provider_id : n.invited_by
      await ctx.supabase.from('notifications').insert({
        user_id: recipient,
        type: 'negotiation_message',
        title: '💬 הודעה חדשה במשא ומתן',
        message: input.body.slice(0, 80),
        action_url: `/negotiations/${n.id}`,
      })
      return data
    }),

  // Mark "I agree". Once both have agreed → status='both_agreed' and a poll is opened.
  markAgreed: protectedProcedure
    .input(z.object({ negotiationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const n = await assertParty(ctx, input.negotiationId)
      if (!['in_negotiation', 'agreed_by_provider', 'agreed_by_committee'].includes(n.status)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'לא ניתן לאשר במצב הנוכחי' })
      }
      const isCommittee = ctx.user.id === n.invited_by
      const patch: Record<string, unknown> = {}
      if (isCommittee && !n.committee_agreed_at) patch.committee_agreed_at = new Date().toISOString()
      if (!isCommittee && !n.provider_agreed_at) patch.provider_agreed_at = new Date().toISOString()

      const bothNow =
        (isCommittee ? true : !!n.committee_agreed_at) &&
        (!isCommittee ? true : !!n.provider_agreed_at)

      if (bothNow) {
        patch.status = 'both_agreed'
      } else {
        patch.status = isCommittee ? 'agreed_by_committee' : 'agreed_by_provider'
      }

      await ctx.supabase.from('provider_negotiations').update(patch).eq('id', n.id)
      await systemMessage(
        ctx,
        n.id,
        `${isCommittee ? 'הוועד' : 'נותן השירות'} אישר את ההסכם.`,
        'agreement',
      )

      // When both agreed, automatically open the tenant poll.
      if (bothNow) {
        return await openPollImpl(ctx, { ...n, ...patch } as NegotiationRow)
      }
      return { ok: true, status: patch.status }
    }),

  // Manually trigger poll (defensive — normally markAgreed does it).
  openPoll: protectedProcedure
    .input(z.object({ negotiationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const n = await assertParty(ctx, input.negotiationId)
      if (n.status !== 'both_agreed') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'נדרשת הסכמה דו-צדדית לפני סקר' })
      }
      return await openPollImpl(ctx, n)
    }),

  // Tally + finalize a running poll. Idempotent — safe to call repeatedly.
  finalizePoll: protectedProcedure
    .input(z.object({ negotiationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const n = await assertParty(ctx, input.negotiationId)
      if (n.status !== 'polling' || !n.poll_id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'אין סקר פעיל' })
      }
      return await finalizePollImpl(ctx, n)
    }),

  // List my negotiations (committee sees ones I invited; provider sees ones I was invited to).
  listMine: protectedProcedure.query(async ({ ctx }) => {
    const { data: invited } = await ctx.supabase
      .from('provider_negotiations')
      .select(`
        *,
        building:buildings(id, address, city),
        provider:profiles!provider_negotiations_provider_id_fkey(id, full_name)
      `)
      .eq('invited_by', ctx.user.id)
      .order('created_at', { ascending: false })

    const { data: asProvider } = await ctx.supabase
      .from('provider_negotiations')
      .select(`
        *,
        building:buildings(id, address, city),
        inviter:profiles!provider_negotiations_invited_by_fkey(id, full_name)
      `)
      .eq('provider_id', ctx.user.id)
      .order('created_at', { ascending: false })

    return { asCommittee: invited ?? [], asProvider: asProvider ?? [] }
  }),

  // Detail page: negotiation + messages.
  getById: protectedProcedure
    .input(z.object({ negotiationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const n = await assertParty(ctx, input.negotiationId)
      const { data: messages } = await ctx.supabase
        .from('negotiation_messages')
        .select('*, sender:profiles(id, full_name)')
        .eq('negotiation_id', n.id)
        .order('created_at', { ascending: true })
      return { negotiation: n, messages: messages ?? [], myRole: ctx.user.id === n.invited_by ? 'committee' : 'provider' }
    }),
})

// ── Helpers ──────────────────────────────────────────────────────────

async function openPollImpl(
  ctx: { supabase: any; user: { id: string } },
  n: NegotiationRow,
): Promise<{ ok: true; pollId: string }> {
  // Find the building's primary group to attach the poll to.
  const { data: group } = await ctx.supabase
    .from('building_groups')
    .select('id')
    .eq('building_id', n.building_id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!group) {
    throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'לבניין אין קבוצת תקשורת' })
  }

  // 48-hour deadline.
  const closeAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

  // Fetch provider name for the question text.
  const { data: provider } = await ctx.supabase
    .from('profiles')
    .select('full_name')
    .eq('id', n.provider_id)
    .single()
  const providerName = provider?.full_name ?? 'נותן השירות'

  const { data: poll, error: pollErr } = await ctx.supabase
    .from('polls')
    .insert({
      group_id: group.id,
      question: `האם לבחור את ${providerName} כ${n.provider_role}?`,
      options: ['בעד', 'נגד'],
      poll_type: 'single',
      is_anonymous: true,
      close_at: closeAt,
      threshold_pct: 60,
      status: 'open',
      related_negotiation_id: n.id,
    })
    .select()
    .single()
  if (pollErr || !poll) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: pollErr?.message ?? 'נכשלה פתיחת סקר' })
  }

  await ctx.supabase
    .from('provider_negotiations')
    .update({ status: 'polling', poll_id: poll.id, poll_deadline: closeAt })
    .eq('id', n.id)

  await systemMessage(
    { supabase: ctx.supabase },
    n.id,
    `נפתח סקר דיירים — דדליין ${new Date(closeAt).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}. נדרש רוב של 60% מכלל הדיירים.`,
    'poll_started',
  )

  // Notify all tenants in the building.
  const { data: tenants } = await ctx.supabase
    .from('tenant_profiles')
    .select('user_id')
    .eq('building_id', n.building_id)
  if (tenants && tenants.length > 0) {
    type T = { user_id: string }
    await ctx.supabase.from('notifications').insert(
      (tenants as T[]).map((t) => ({
        user_id: t.user_id,
        type: 'poll',
        title: '📊 סקר חדש — בחירת נותן שירות',
        message: `${providerName} כ${n.provider_role}`,
        action_url: `/building-chat/${group.id}`,
      })),
    )
  }

  return { ok: true, pollId: poll.id }
}

async function finalizePollImpl(
  ctx: { supabase: any; user: { id: string } },
  n: NegotiationRow,
): Promise<{ ok: true; result: 'won' | 'lost'; yesCount: number; tenantsTotal: number }> {
  // Tenant count for this building.
  const { count: tenantsTotal } = await ctx.supabase
    .from('tenant_profiles')
    .select('user_id', { count: 'exact', head: true })
    .eq('building_id', n.building_id)

  // Count yes votes (apartment_votes.vote_value = 'בעד' for this poll).
  const { count: yesCount } = await ctx.supabase
    .from('apartment_votes')
    .select('id', { count: 'exact', head: true })
    .eq('poll_id', n.poll_id)
    .eq('vote_value', 'בעד')

  const total = tenantsTotal ?? 0
  const yes = yesCount ?? 0
  const won = total > 0 && (yes / total) * 100 >= 60

  if (won) {
    // Mark approved + close the poll.
    await ctx.supabase
      .from('provider_negotiations')
      .update({ status: 'approved', result: 'won', decided_at: new Date().toISOString() })
      .eq('id', n.id)
    await ctx.supabase
      .from('polls')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', n.poll_id)

    // Supersede any other ACTIVE negotiation for the same building+role.
    await ctx.supabase
      .from('provider_negotiations')
      .update({ status: 'superseded' })
      .eq('building_id', n.building_id)
      .eq('provider_role', n.provider_role)
      .neq('id', n.id)
      .in('status', ['invited', 'accepted_by_provider', 'in_negotiation', 'agreed_by_provider', 'agreed_by_committee', 'both_agreed', 'polling'])

    // Spawn contract-upload tasks for BOTH parties.
    await ctx.supabase.from('building_tasks').insert([
      {
        building_id: n.building_id,
        project_id: n.project_id,
        assigned_to: n.invited_by,
        assigned_role: 'committee',
        source: 'provider_negotiation',
        source_id: n.id,
        kind: 'upload_contract',
        title: 'העלאת חוזה חתום',
        description: `העלה את החוזה החתום עם נותן השירות בתפקיד ${n.provider_role}.`,
      },
      {
        building_id: n.building_id,
        project_id: n.project_id,
        assigned_to: n.provider_id,
        assigned_role: 'provider',
        source: 'provider_negotiation',
        source_id: n.id,
        kind: 'upload_contract',
        title: 'העלאת חוזה חתום',
        description: 'העלה את עותקך החתום של החוזה.',
      },
    ])

    await systemMessage({ supabase: ctx.supabase }, n.id, `✅ הסקר עבר! ${yes}/${total} דיירים בעד. הוקצו משימות העלאת חוזה לשני הצדדים.`, 'poll_finalized')

    return { ok: true, result: 'won', yesCount: yes, tenantsTotal: total }
  } else {
    await ctx.supabase
      .from('provider_negotiations')
      .update({ status: 'rejected_by_tenants', result: 'lost', decided_at: new Date().toISOString() })
      .eq('id', n.id)
    await ctx.supabase
      .from('polls')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', n.poll_id)
    await systemMessage({ supabase: ctx.supabase }, n.id, `❌ הסקר לא עבר את הרוב הנדרש (${yes}/${total} = ${total > 0 ? Math.round((yes / total) * 100) : 0}%).`, 'poll_finalized')
    return { ok: true, result: 'lost', yesCount: yes, tenantsTotal: total }
  }
}
