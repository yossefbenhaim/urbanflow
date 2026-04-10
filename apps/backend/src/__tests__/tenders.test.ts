import { describe, it, expect, beforeEach } from 'vitest'
import { tendersRouter } from '../routers/tenders'
import { mockSupabaseClient, resetSupabaseMocks, createMockChain } from '../test/mocks/supabase'
import { createPublicContext, createAuthenticatedContext, setupFromMock, makeThenable } from '../test/helpers'
import type { MockContext } from '../test/helpers'

const createTestCaller = (ctx: MockContext) =>
  tendersRouter.createCaller(ctx as Parameters<typeof tendersRouter.createCaller>[0])

describe('Tenders Router', () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  // ── createTender ─────────────────────────────────────
  describe('createTender', () => {
    const tenderInput = {
      projectId: '11111111-1111-1111-1111-111111111111',
      title: 'מכרז עורך דין',
      tenderType: 'lawyer' as const,
      description: 'חיפוש עורך דין לפרויקט',
    }

    it('rejects unauthenticated access', async () => {
      const caller = createTestCaller(createPublicContext())
      await expect(caller.createTender(tenderInput)).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })

    it('rejects non-organizer/committee users', async () => {
      const ctx = createAuthenticatedContext()

      const profileChain = createMockChain()
      profileChain.single.mockResolvedValue({ data: { role: 'tenant' }, error: null })

      setupFromMock({ profiles: profileChain })

      const caller = createTestCaller(ctx)
      await expect(caller.createTender(tenderInput)).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })

    it('creates tender successfully for organizer', async () => {
      const ctx = createAuthenticatedContext()

      const profileChain = createMockChain()
      profileChain.single.mockResolvedValue({ data: { role: 'organizer' }, error: null })

      const tenderChain = createMockChain()
      tenderChain.single.mockResolvedValue({
        data: { id: 'tender-1', title: tenderInput.title, status: 'open' },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain
        if (table === 'tenders') return tenderChain
        return createMockChain()
      })

      const caller = createTestCaller(ctx)
      const result = await caller.createTender(tenderInput)
      expect(result.id).toBe('tender-1')
      expect(result.status).toBe('open')
    })

    it('creates tender for committee_rep', async () => {
      const ctx = createAuthenticatedContext()

      const profileChain = createMockChain()
      profileChain.single.mockResolvedValue({ data: { role: 'committee_rep' }, error: null })

      const tenderChain = createMockChain()
      tenderChain.single.mockResolvedValue({
        data: { id: 'tender-2', title: tenderInput.title, status: 'open' },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain
        if (table === 'tenders') return tenderChain
        return createMockChain()
      })

      const caller = createTestCaller(ctx)
      const result = await caller.createTender(tenderInput)
      expect(result.id).toBe('tender-2')
    })

    it('throws on DB insert error', async () => {
      const ctx = createAuthenticatedContext()

      const profileChain = createMockChain()
      profileChain.single.mockResolvedValue({ data: { role: 'organizer' }, error: null })

      const tenderChain = createMockChain()
      tenderChain.single.mockResolvedValue({ data: null, error: { message: 'insert failed' } })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain
        if (table === 'tenders') return tenderChain
        return createMockChain()
      })

      const caller = createTestCaller(ctx)
      await expect(caller.createTender(tenderInput)).rejects.toMatchObject({ code: 'INTERNAL_SERVER_ERROR' })
    })

    it('validates title minimum length', async () => {
      const caller = createTestCaller(createPublicContext())
      await expect(caller.createTender({ ...tenderInput, title: 'ab' })).rejects.toThrow()
    })
  })

  // ── submitProposal ─────────────────────────────────────
  describe('submitProposal', () => {
    const proposalInput = {
      tenderId: '22222222-2222-2222-2222-222222222222',
      description: 'הצעה מפורטת לפרויקט',
      price: 50000,
      timelineMonths: 12,
    }

    it('rejects unauthenticated access', async () => {
      const caller = createTestCaller(createPublicContext())
      await expect(caller.submitProposal(proposalInput)).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })

    it('submits proposal successfully', async () => {
      const ctx = createAuthenticatedContext()

      const proposalChain = createMockChain()
      proposalChain.single.mockResolvedValue({
        data: { id: 'proposal-1', tender_id: proposalInput.tenderId, price: 50000 },
        error: null,
      })

      setupFromMock({ tender_proposals: proposalChain })

      const caller = createTestCaller(ctx)
      const result = await caller.submitProposal(proposalInput)
      expect(result.id).toBe('proposal-1')
    })

    it('throws CONFLICT on duplicate proposal', async () => {
      const ctx = createAuthenticatedContext()

      const proposalChain = createMockChain()
      proposalChain.single.mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'duplicate key' },
      })

      setupFromMock({ tender_proposals: proposalChain })

      const caller = createTestCaller(ctx)
      await expect(caller.submitProposal(proposalInput)).rejects.toMatchObject({ code: 'CONFLICT' })
    })

    it('validates description min length', async () => {
      const caller = createTestCaller(createPublicContext())
      await expect(caller.submitProposal({ ...proposalInput, description: 'ab' })).rejects.toThrow()
    })
  })

  // ── awardTender ─────────────────────────────────────
  describe('awardTender', () => {
    const awardInput = {
      tenderId: '22222222-2222-2222-2222-222222222222',
      winnerId: '44444444-4444-4444-4444-444444444444',
    }

    it('rejects unauthenticated access', async () => {
      const caller = createTestCaller(createPublicContext())
      await expect(caller.awardTender(awardInput)).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })

    it('awards tender and creates contract assignment', async () => {
      const ctx = createAuthenticatedContext()

      const tenderChain = createMockChain()
      tenderChain.single.mockResolvedValue({
        data: { id: awardInput.tenderId, status: 'awarded', project_id: 'proj-1', tender_type: 'lawyer', winner_id: awardInput.winnerId },
        error: null,
      })

      const winnerProposalChain = createMockChain()
      makeThenable(winnerProposalChain, { data: null, error: null })

      const rejectProposalChain = createMockChain()
      makeThenable(rejectProposalChain, { data: null, error: null })

      const assignmentChain = createMockChain()
      assignmentChain.single.mockResolvedValue({
        data: { id: 'assign-1', tender_id: awardInput.tenderId, provider_id: awardInput.winnerId },
        error: null,
      })

      let proposalCallCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'tenders') return tenderChain
        if (table === 'tender_proposals') {
          proposalCallCount++
          return proposalCallCount === 1 ? winnerProposalChain : rejectProposalChain
        }
        if (table === 'contract_assignments') return assignmentChain
        if (table === 'profiles') {
          const c = createMockChain()
          c.single.mockResolvedValue({ data: { full_name: 'Test Winner' }, error: null })
          return c
        }
        if (table === 'project_tenants') {
          const c = createMockChain()
          makeThenable(c, { data: [], error: null })
          return c
        }
        return createMockChain()
      })

      const caller = createTestCaller(ctx)
      const result = await caller.awardTender(awardInput)
      expect(result.tender.status).toBe('awarded')
      expect(result.assignment.id).toBe('assign-1')
    })

    it('throws FORBIDDEN when non-creator tries to award', async () => {
      const ctx = createAuthenticatedContext()

      const tenderChain = createMockChain()
      tenderChain.single.mockResolvedValue({ data: null, error: null })

      setupFromMock({ tenders: tenderChain })

      const caller = createTestCaller(ctx)
      await expect(caller.awardTender(awardInput)).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })
  })

  // ── closeTender ─────────────────────────────────────
  describe('closeTender', () => {
    it('rejects unauthenticated access', async () => {
      const caller = createTestCaller(createPublicContext())
      await expect(caller.closeTender({ tenderId: '22222222-2222-2222-2222-222222222222' }))
        .rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })

    it('closes tender successfully', async () => {
      const ctx = createAuthenticatedContext()

      const tenderChain = createMockChain()
      tenderChain.single.mockResolvedValue({
        data: { id: 'tender-1', status: 'closed' },
        error: null,
      })

      setupFromMock({ tenders: tenderChain })

      const caller = createTestCaller(ctx)
      const result = await caller.closeTender({ tenderId: '22222222-2222-2222-2222-222222222222' })
      expect(result.status).toBe('closed')
    })
  })

  // ── getProjectTenders ─────────────────────────────────────
  describe('getProjectTenders', () => {
    it('returns empty array when no tenders', async () => {
      const ctx = createAuthenticatedContext()

      const tendersChain = createMockChain()
      makeThenable(tendersChain, { data: null, error: null })

      setupFromMock({ tenders: tendersChain })

      const caller = createTestCaller(ctx)
      const result = await caller.getProjectTenders({ projectId: '11111111-1111-1111-1111-111111111111' })
      expect(result).toEqual([])
    })
  })

  // ── approveContract ─────────────────────────────────────
  describe('approveContract', () => {
    const approveInput = {
      assignmentId: '55555555-5555-5555-5555-555555555555',
      apartmentId: '66666666-6666-6666-6666-666666666666',
    }

    it('rejects unauthenticated access', async () => {
      const caller = createTestCaller(createPublicContext())
      await expect(caller.approveContract(approveInput)).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })

    it('throws CONFLICT when already approved', async () => {
      const ctx = createAuthenticatedContext()

      const approvalChain = createMockChain()
      makeThenable(approvalChain, { data: null, error: { code: '23505', message: 'duplicate' } })

      setupFromMock({ contract_approvals: approvalChain })

      const caller = createTestCaller(ctx)
      await expect(caller.approveContract(approveInput)).rejects.toMatchObject({ code: 'CONFLICT' })
    })

    it('approves contract and returns count', async () => {
      const ctx = createAuthenticatedContext()

      const insertApprovalChain = createMockChain()
      makeThenable(insertApprovalChain, { data: null, error: null })

      const countApprovalChain = createMockChain()
      makeThenable(countApprovalChain, { data: null, error: null, count: 3 })

      const assignmentChain = createMockChain()
      assignmentChain.single.mockResolvedValue({
        data: { id: approveInput.assignmentId, approval_required_count: 5, approvals_received: 3 },
        error: null,
      })

      let approvalsCallCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'contract_approvals') {
          approvalsCallCount++
          return approvalsCallCount === 1 ? insertApprovalChain : countApprovalChain
        }
        if (table === 'contract_assignments') return assignmentChain
        return createMockChain()
      })

      const caller = createTestCaller(ctx)
      const result = await caller.approveContract(approveInput)
      expect(result.approved).toBe(true)
    })
  })

  // ── addNegotiationRound ─────────────────────────────────────
  describe('addNegotiationRound', () => {
    const roundInput = {
      tenderId: '22222222-2222-2222-2222-222222222222',
      title: 'סבב משא ומתן ראשון',
    }

    it('rejects unauthenticated access', async () => {
      const caller = createTestCaller(createPublicContext())
      await expect(caller.addNegotiationRound(roundInput)).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })

    it('adds round with incremented round number', async () => {
      const ctx = createAuthenticatedContext()

      const existingRoundsChain = createMockChain()
      makeThenable(existingRoundsChain, { data: [{ round_number: 2 }], error: null })

      const insertRoundChain = createMockChain()
      insertRoundChain.single.mockResolvedValue({
        data: { id: 'round-3', round_number: 3, title: roundInput.title },
        error: null,
      })

      let roundsCallCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'negotiation_rounds') {
          roundsCallCount++
          return roundsCallCount === 1 ? existingRoundsChain : insertRoundChain
        }
        return createMockChain()
      })

      const caller = createTestCaller(ctx)
      const result = await caller.addNegotiationRound(roundInput)
      expect(result.round_number).toBe(3)
    })
  })
})
