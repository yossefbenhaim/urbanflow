import { describe, it, expect, beforeEach } from 'vitest'
import { committeeRouter } from '../routers/committee'
import { mockSupabaseClient, resetSupabaseMocks, createMockChain } from '../test/mocks/supabase'
import { createPublicContext, createAuthenticatedContext, setupFromMock, makeThenable } from '../test/helpers'
import type { MockContext } from '../test/helpers'

const createTestCaller = (ctx: MockContext) =>
  committeeRouter.createCaller(ctx as Parameters<typeof committeeRouter.createCaller>[0])

describe('Committee Router', () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  // ── createPoll ─────────────────────────────────────
  describe('createPoll', () => {
    const pollInput = {
      question: 'האם לאשר את הפרויקט?',
      options: ['כן', 'לא'],
      isAnonymous: true,
      pollType: 'single' as const,
      thresholdPct: 60,
      groupId: '11111111-1111-1111-1111-111111111111',
    }

    it('rejects unauthenticated access', async () => {
      const caller = createTestCaller(createPublicContext())
      await expect(caller.createPoll(pollInput)).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })

    it('creates poll and group message successfully', async () => {
      const ctx = createAuthenticatedContext()

      const pollChain = createMockChain()
      pollChain.single.mockResolvedValue({ data: { id: 'poll-1', question: pollInput.question }, error: null })

      const msgChain = createMockChain()
      msgChain.single.mockResolvedValue({ data: { id: 'msg-1' }, error: null })

      const membersChain = createMockChain()
      makeThenable(membersChain, { data: [{ user_id: 'u2' }, { user_id: 'u3' }], error: null })

      const notiChain = createMockChain()
      makeThenable(notiChain, { data: null, error: null })

      let pollsCallCount = 0
      let groupMsgCallCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'polls') {
          pollsCallCount++
          return pollChain
        }
        if (table === 'group_messages') {
          groupMsgCallCount++
          return msgChain
        }
        if (table === 'building_group_members') return membersChain
        if (table === 'notifications') return notiChain
        return createMockChain()
      })

      const caller = createTestCaller(ctx)
      const result = await caller.createPoll(pollInput)
      expect(result.pollId).toBe('poll-1')
      expect(result.messageId).toBe('msg-1')
    })

    it('throws on poll insert error', async () => {
      const ctx = createAuthenticatedContext()

      const pollChain = createMockChain()
      pollChain.single.mockResolvedValue({ data: null, error: { message: 'DB error' } })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'polls') return pollChain
        return createMockChain()
      })

      const caller = createTestCaller(ctx)
      await expect(caller.createPoll(pollInput)).rejects.toThrow()
    })

    it('validates threshold between 50-90', async () => {
      const caller = createTestCaller(createPublicContext())
      await expect(caller.createPoll({ ...pollInput, thresholdPct: 40 })).rejects.toThrow()
      await expect(caller.createPoll({ ...pollInput, thresholdPct: 95 })).rejects.toThrow()
    })

    it('requires at least 2 options', async () => {
      const caller = createTestCaller(createPublicContext())
      await expect(caller.createPoll({ ...pollInput, options: ['only one'] })).rejects.toThrow()
    })
  })

  // ── castApartmentVote ─────────────────────────────────────
  describe('castApartmentVote', () => {
    const voteInput = {
      pollId: '22222222-2222-2222-2222-222222222222',
      apartmentId: '33333333-3333-3333-3333-333333333333',
      value: 'כן',
    }

    it('rejects unauthenticated access', async () => {
      const caller = createTestCaller(createPublicContext())
      await expect(caller.castApartmentVote(voteInput)).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })

    it('blocks voting when ownership dispute exists', async () => {
      const ctx = createAuthenticatedContext('owner-1')

      const disputeChain = createMockChain()
      makeThenable(disputeChain, { data: [{ id: 'dispute-1' }], error: null })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'ownership_disputes') return disputeChain
        return createMockChain()
      })

      const caller = createTestCaller(ctx)
      await expect(caller.castApartmentVote(voteInput)).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })

    it('allows proxy holder to vote when power of attorney exists', async () => {
      const ctx = createAuthenticatedContext('proxy-user')

      const disputeChain = createMockChain()
      makeThenable(disputeChain, { data: [], error: null })

      const poaChain = createMockChain()
      poaChain.maybeSingle.mockResolvedValue({ data: { receiver_user_id: 'proxy-user' }, error: null })

      const upsertChain = createMockChain()
      makeThenable(upsertChain, { data: { id: 'vote-1' }, error: null })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'ownership_disputes') return disputeChain
        if (table === 'power_of_attorney') return poaChain
        if (table === 'apartment_votes') return upsertChain
        return createMockChain()
      })

      const caller = createTestCaller(ctx)
      const result = await caller.castApartmentVote(voteInput)
      expect(result.status).toBe('finalized')
      expect(result.decidedBy).toBe('proxy')
    })

    it('rejects non-proxy user when power of attorney exists', async () => {
      const ctx = createAuthenticatedContext('non-proxy-user')

      const disputeChain = createMockChain()
      makeThenable(disputeChain, { data: [], error: null })

      const poaChain = createMockChain()
      poaChain.maybeSingle.mockResolvedValue({ data: { receiver_user_id: 'proxy-user' }, error: null })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'ownership_disputes') return disputeChain
        if (table === 'power_of_attorney') return poaChain
        return createMockChain()
      })

      const caller = createTestCaller(ctx)
      await expect(caller.castApartmentVote(voteInput)).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })

    it('finalizes vote for single owner', async () => {
      const ctx = createAuthenticatedContext('owner-1')

      const disputeChain = createMockChain()
      makeThenable(disputeChain, { data: [], error: null })

      const poaChain = createMockChain()
      poaChain.maybeSingle.mockResolvedValue({ data: null, error: null })

      const ownersChain = createMockChain()
      makeThenable(ownersChain, { data: [{ user_id: 'owner-1' }], error: null })

      const voteChain = createMockChain()
      makeThenable(voteChain, { data: { id: 'vote-1' }, error: null })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'ownership_disputes') return disputeChain
        if (table === 'power_of_attorney') return poaChain
        if (table === 'apartment_owners') return ownersChain
        if (table === 'apartment_votes') return voteChain
        return createMockChain()
      })

      const caller = createTestCaller(ctx)
      const result = await caller.castApartmentVote(voteInput)
      expect(result.status).toBe('finalized')
      expect(result.decidedBy).toBe('unanimous')
      expect(result.voteValue).toBe('כן')
    })

    it('rejects non-owner voting', async () => {
      const ctx = createAuthenticatedContext('non-owner')

      const disputeChain = createMockChain()
      makeThenable(disputeChain, { data: [], error: null })

      const poaChain = createMockChain()
      poaChain.maybeSingle.mockResolvedValue({ data: null, error: null })

      const ownersChain = createMockChain()
      makeThenable(ownersChain, { data: [{ user_id: 'owner-1' }], error: null })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'ownership_disputes') return disputeChain
        if (table === 'power_of_attorney') return poaChain
        if (table === 'apartment_owners') return ownersChain
        return createMockChain()
      })

      const caller = createTestCaller(ctx)
      await expect(caller.castApartmentVote(voteInput)).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })

    it('returns pending when first of 2 owners votes', async () => {
      const ctx = createAuthenticatedContext('owner-1')

      const disputeChain = createMockChain()
      makeThenable(disputeChain, { data: [], error: null })

      const poaChain = createMockChain()
      poaChain.maybeSingle.mockResolvedValue({ data: null, error: null })

      const ownersChain = createMockChain()
      makeThenable(ownersChain, { data: [{ user_id: 'owner-1' }, { user_id: 'owner-2' }], error: null })

      const existingVoteChain = createMockChain()
      existingVoteChain.maybeSingle.mockResolvedValue({ data: null, error: null })

      const upsertChain = createMockChain()
      makeThenable(upsertChain, { data: null, error: null })

      let votesCallCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'ownership_disputes') return disputeChain
        if (table === 'power_of_attorney') return poaChain
        if (table === 'apartment_owners') return ownersChain
        if (table === 'apartment_votes') {
          votesCallCount++
          return votesCallCount === 1 ? existingVoteChain : upsertChain
        }
        return createMockChain()
      })

      const caller = createTestCaller(ctx)
      const result = await caller.castApartmentVote(voteInput)
      expect(result.status).toBe('pending')
    })

    it('finalizes when both owners agree (2 owners unanimous)', async () => {
      const ctx = createAuthenticatedContext('owner-2')

      const disputeChain = createMockChain()
      makeThenable(disputeChain, { data: [], error: null })

      const poaChain = createMockChain()
      poaChain.maybeSingle.mockResolvedValue({ data: null, error: null })

      const ownersChain = createMockChain()
      makeThenable(ownersChain, { data: [{ user_id: 'owner-1' }, { user_id: 'owner-2' }], error: null })

      // First owner already voted 'כן'
      const existingVoteChain = createMockChain()
      existingVoteChain.maybeSingle.mockResolvedValue({
        data: { internal_votes: { 'owner-1': 'כן' } },
        error: null,
      })

      const upsertChain = createMockChain()
      makeThenable(upsertChain, { data: null, error: null })

      let votesCallCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'ownership_disputes') return disputeChain
        if (table === 'power_of_attorney') return poaChain
        if (table === 'apartment_owners') return ownersChain
        if (table === 'apartment_votes') {
          votesCallCount++
          return votesCallCount === 1 ? existingVoteChain : upsertChain
        }
        return createMockChain()
      })

      const caller = createTestCaller(ctx)
      const result = await caller.castApartmentVote({ ...voteInput, value: 'כן' })
      expect(result.status).toBe('finalized')
      expect(result.decidedBy).toBe('unanimous')
      expect(result.voteValue).toBe('כן')
    })

    it('returns disputed when 2 owners disagree', async () => {
      const ctx = createAuthenticatedContext('owner-2')

      const disputeChain = createMockChain()
      makeThenable(disputeChain, { data: [], error: null })

      const poaChain = createMockChain()
      poaChain.maybeSingle.mockResolvedValue({ data: null, error: null })

      const ownersChain = createMockChain()
      makeThenable(ownersChain, { data: [{ user_id: 'owner-1' }, { user_id: 'owner-2' }], error: null })

      // First owner voted 'כן', second owner votes 'לא'
      const existingVoteChain = createMockChain()
      existingVoteChain.maybeSingle.mockResolvedValue({
        data: { internal_votes: { 'owner-1': 'כן' } },
        error: null,
      })

      const upsertChain = createMockChain()
      makeThenable(upsertChain, { data: null, error: null })

      let votesCallCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'ownership_disputes') return disputeChain
        if (table === 'power_of_attorney') return poaChain
        if (table === 'apartment_owners') return ownersChain
        if (table === 'apartment_votes') {
          votesCallCount++
          return votesCallCount === 1 ? existingVoteChain : upsertChain
        }
        return createMockChain()
      })

      const caller = createTestCaller(ctx)
      const result = await caller.castApartmentVote({ ...voteInput, value: 'לא' })
      expect(result.status).toBe('disputed')
    })

    it('finalizes by majority for 3+ owners', async () => {
      const ctx = createAuthenticatedContext('owner-2')

      const disputeChain = createMockChain()
      makeThenable(disputeChain, { data: [], error: null })

      const poaChain = createMockChain()
      poaChain.maybeSingle.mockResolvedValue({ data: null, error: null })

      const ownersChain = createMockChain()
      makeThenable(ownersChain, {
        data: [{ user_id: 'owner-1' }, { user_id: 'owner-2' }, { user_id: 'owner-3' }],
        error: null,
      })

      // owner-1 already voted 'כן', now owner-2 votes 'כן' → majority (2/3)
      const existingVoteChain = createMockChain()
      existingVoteChain.maybeSingle.mockResolvedValue({
        data: { internal_votes: { 'owner-1': 'כן' } },
        error: null,
      })

      const upsertChain = createMockChain()
      makeThenable(upsertChain, { data: null, error: null })

      let votesCallCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'ownership_disputes') return disputeChain
        if (table === 'power_of_attorney') return poaChain
        if (table === 'apartment_owners') return ownersChain
        if (table === 'apartment_votes') {
          votesCallCount++
          return votesCallCount === 1 ? existingVoteChain : upsertChain
        }
        return createMockChain()
      })

      const caller = createTestCaller(ctx)
      const result = await caller.castApartmentVote({ ...voteInput, value: 'כן' })
      expect(result.status).toBe('finalized')
      expect(result.decidedBy).toBe('majority')
      expect(result.voteValue).toBe('כן')
    })

    it('returns pending when no majority yet (3+ owners)', async () => {
      const ctx = createAuthenticatedContext('owner-2')

      const disputeChain = createMockChain()
      makeThenable(disputeChain, { data: [], error: null })

      const poaChain = createMockChain()
      poaChain.maybeSingle.mockResolvedValue({ data: null, error: null })

      const ownersChain = createMockChain()
      makeThenable(ownersChain, {
        data: [{ user_id: 'owner-1' }, { user_id: 'owner-2' }, { user_id: 'owner-3' }],
        error: null,
      })

      // owner-1 voted 'כן', owner-2 votes 'לא' → no majority yet (need 2 of 3)
      const existingVoteChain = createMockChain()
      existingVoteChain.maybeSingle.mockResolvedValue({
        data: { internal_votes: { 'owner-1': 'כן' } },
        error: null,
      })

      const upsertChain = createMockChain()
      makeThenable(upsertChain, { data: null, error: null })

      let votesCallCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'ownership_disputes') return disputeChain
        if (table === 'power_of_attorney') return poaChain
        if (table === 'apartment_owners') return ownersChain
        if (table === 'apartment_votes') {
          votesCallCount++
          return votesCallCount === 1 ? existingVoteChain : upsertChain
        }
        return createMockChain()
      })

      const caller = createTestCaller(ctx)
      const result = await caller.castApartmentVote({ ...voteInput, value: 'לא' })
      expect(result.status).toBe('pending')
    })

    it('rejects when no owners found', async () => {
      const ctx = createAuthenticatedContext('owner-1')

      const disputeChain = createMockChain()
      makeThenable(disputeChain, { data: [], error: null })

      const poaChain = createMockChain()
      poaChain.maybeSingle.mockResolvedValue({ data: null, error: null })

      const ownersChain = createMockChain()
      makeThenable(ownersChain, { data: [], error: null })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'ownership_disputes') return disputeChain
        if (table === 'power_of_attorney') return poaChain
        if (table === 'apartment_owners') return ownersChain
        return createMockChain()
      })

      const caller = createTestCaller(ctx)
      await expect(caller.castApartmentVote(voteInput)).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    })
  })

  // ── sendReminder ─────────────────────────────────────
  describe('sendReminder', () => {
    it('rejects unauthenticated access', async () => {
      const caller = createTestCaller(createPublicContext())
      await expect(caller.sendReminder('tenant-1')).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })

    it('sends reminder successfully', async () => {
      const ctx = createAuthenticatedContext()
      const caller = createTestCaller(ctx)
      const result = await caller.sendReminder('tenant-1')
      expect(result.sent).toBe(true)
      expect(result.tenantId).toBe('tenant-1')
    })
  })

  // ── broadcastMessage ─────────────────────────────────────
  describe('broadcastMessage', () => {
    it('rejects unauthenticated access', async () => {
      const caller = createTestCaller(createPublicContext())
      await expect(caller.broadcastMessage({ buildingId: 'b1', title: 'test', body: 'body' }))
        .rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })

    it('creates broadcast message successfully', async () => {
      const ctx = createAuthenticatedContext()

      const unitsChain = createMockChain()
      makeThenable(unitsChain, { data: [{ count: 10 }], error: null })

      const broadcastChain = createMockChain()
      broadcastChain.single.mockResolvedValue({
        data: { id: 'bc-1', title: 'test', recipient_count: 10 },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'units') return unitsChain
        if (table === 'broadcast_messages') return broadcastChain
        return createMockChain()
      })

      const caller = createTestCaller(ctx)
      const result = await caller.broadcastMessage({ buildingId: 'b1', title: 'test', body: 'body' })
      expect(result.id).toBe('bc-1')
    })
  })

  // ── uploadElectionForm ─────────────────────────────────────
  describe('uploadElectionForm', () => {
    it('rejects unauthenticated access', async () => {
      const caller = createTestCaller(createPublicContext())
      await expect(caller.uploadElectionForm({
        buildingId: '11111111-1111-1111-1111-111111111111',
        formType: 'representative_election_form',
        fileUrl: 'https://example.com/form.pdf',
        fileName: 'form.pdf',
      })).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })

    it('uploads election form successfully', async () => {
      const ctx = createAuthenticatedContext()

      const formChain = createMockChain()
      formChain.single.mockResolvedValue({
        data: { id: 'form-1', form_type: 'representative_election_form' },
        error: null,
      })

      setupFromMock({ election_forms: formChain })

      const caller = createTestCaller(ctx)
      const result = await caller.uploadElectionForm({
        buildingId: '11111111-1111-1111-1111-111111111111',
        formType: 'representative_election_form',
        fileUrl: 'https://example.com/form.pdf',
        fileName: 'form.pdf',
      })
      expect(result.id).toBe('form-1')
    })
  })
})
