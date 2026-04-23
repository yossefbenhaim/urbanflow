import { z } from 'zod'
import { router, protectedProcedure } from '../middleware/auth'
import { TRPCError } from '@trpc/server'

/** Format an RFC-5545 ICS calendar event for a confirmed meeting */
function toIcs(opts: { uid: string; title: string; start: Date; end: Date; location?: string; description?: string }): string {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//UrbanFlow//meetings//HE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${opts.uid}@urbanflow.byclick.co.il`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(opts.start)}`,
    `DTEND:${fmt(opts.end)}`,
    `SUMMARY:${opts.title.replace(/\n/g, ' ')}`,
    opts.location ? `LOCATION:${opts.location.replace(/\n/g, ' ')}` : '',
    opts.description ? `DESCRIPTION:${opts.description.replace(/\n/g, '\\n')}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)
  return lines.join('\r\n')
}

export const meetingsRouter = router({
  // ═══════════════ Date polls ═══════════════
  createPoll: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid().optional(),
      tenderId: z.string().uuid().optional(),
      tenderMeetingId: z.string().uuid().optional(),
      topic: z.string().min(2),
      description: z.string().optional(),
      options: z.array(z.object({
        optionAt: z.string(), // ISO datetime
        location: z.string().optional(),
        notes: z.string().optional(),
      })).min(1).max(10),
      majorityRequiredPct: z.number().min(0).max(100).default(50),
      closesAt: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!input.projectId && !input.tenderId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'נדרש projectId או tenderId' })
      }
      const { data: poll, error } = await ctx.supabase
        .from('meeting_date_polls')
        .insert({
          project_id: input.projectId ?? null,
          tender_id: input.tenderId ?? null,
          tender_meeting_id: input.tenderMeetingId ?? null,
          proposer_id: ctx.user.id,
          topic: input.topic,
          description: input.description,
          majority_required_pct: input.majorityRequiredPct,
          closes_at: input.closesAt,
        })
        .select().single()
      if (error || !poll) throw new TRPCError({ code: 'BAD_REQUEST', message: error?.message ?? 'שגיאה' })

      const rows = input.options.map(o => ({
        poll_id: (poll as { id: string }).id,
        option_at: o.optionAt,
        location: o.location,
        notes: o.notes,
      }))
      const { error: optErr } = await ctx.supabase.from('meeting_date_options').insert(rows)
      if (optErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: optErr.message })
      return poll
    }),

  listPolls: protectedProcedure
    .input(z.object({ projectId: z.string().uuid().optional(), tenderId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
      let q = ctx.supabase
        .from('meeting_date_polls')
        .select('*, options:meeting_date_options(*), votes:meeting_date_options(id, votes:meeting_date_votes(voter_id, vote_weight))')
        .order('created_at', { ascending: false })
      if (input?.projectId) q = q.eq('project_id', input.projectId)
      if (input?.tenderId) q = q.eq('tender_id', input.tenderId)
      const { data } = await q
      return data ?? []
    }),

  getPoll: protectedProcedure
    .input(z.string().uuid())
    .query(async ({ ctx, input }) => {
      const { data: poll } = await ctx.supabase
        .from('meeting_date_polls')
        .select('*')
        .eq('id', input)
        .single()
      if (!poll) throw new TRPCError({ code: 'NOT_FOUND' })
      const { data: options } = await ctx.supabase
        .from('meeting_date_options')
        .select('*')
        .eq('poll_id', input)
        .order('option_at')
      const { data: votes } = await ctx.supabase
        .from('meeting_date_votes')
        .select('option_id, voter_id, vote_weight')
        .in('option_id', (options ?? []).map((o: { id: string }) => o.id))
      return { poll, options: options ?? [], votes: votes ?? [] }
    }),

  vote: protectedProcedure
    .input(z.object({ optionId: z.string().uuid(), voteWeight: z.number().default(1) }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('meeting_date_votes')
        .upsert({
          option_id: input.optionId,
          voter_id: ctx.user.id,
          vote_weight: input.voteWeight,
        }, { onConflict: 'option_id,voter_id' })
        .select().single()
      if (error) throw new TRPCError({ code: 'BAD_REQUEST', message: error.message })
      return data
    }),

  finalizePoll: protectedProcedure
    .input(z.object({ pollId: z.string().uuid(), optionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('meeting_date_polls')
        .update({
          status: 'finalized',
          finalized_option_id: input.optionId,
          closed_at: new Date().toISOString(),
        })
        .eq('id', input.pollId)
        .eq('proposer_id', ctx.user.id)
        .select().single()
      if (error || !data) throw new TRPCError({ code: 'BAD_REQUEST', message: error?.message ?? 'לא ניתן לסגור' })
      return data
    }),

  // ═══════════════ Summaries ═══════════════
  uploadSummary: protectedProcedure
    .input(z.object({
      tenderMeetingId: z.string().uuid(),
      summaryText: z.string().min(10, 'סיכום פגישה חייב להיות לפחות 10 תווים'),
      fileUrl: z.string().url().optional(),
      actionItems: z.array(z.object({ text: z.string(), assignee: z.string().optional() })).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('meeting_summaries')
        .upsert({
          tender_meeting_id: input.tenderMeetingId,
          uploaded_by: ctx.user.id,
          summary_text: input.summaryText,
          file_url: input.fileUrl ?? null,
          action_items: input.actionItems,
        }, { onConflict: 'tender_meeting_id' })
        .select().single()
      if (error) throw new TRPCError({ code: 'BAD_REQUEST', message: error.message })
      return data
    }),

  getSummary: protectedProcedure
    .input(z.string().uuid())
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('meeting_summaries')
        .select('*')
        .eq('tender_meeting_id', input)
        .maybeSingle()
      return data
    }),

  // ═══════════════ ICS export ═══════════════
  /** Returns an .ics calendar string for a confirmed meeting */
  exportIcs: protectedProcedure
    .input(z.object({ tenderMeetingId: z.string().uuid(), durationMinutes: z.number().default(60) }))
    .query(async ({ ctx, input }) => {
      const { data: m } = await ctx.supabase
        .from('tender_meetings')
        .select('id, scheduled_at, location, notes')
        .eq('id', input.tenderMeetingId)
        .single()
      if (!m) throw new TRPCError({ code: 'NOT_FOUND', message: 'פגישה לא נמצאה' })
      const row = m as { id: string; scheduled_at: string; location: string | null; notes: string | null }
      const start = new Date(row.scheduled_at)
      const end = new Date(start.getTime() + input.durationMinutes * 60_000)
      const ics = toIcs({
        uid: row.id,
        title: 'פגישת פרויקט',
        start,
        end,
        location: row.location ?? undefined,
        description: row.notes ?? undefined,
      })
      return { ics, filename: `meeting-${row.id}.ics` }
    }),
})
