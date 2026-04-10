import { describe, it, expect, beforeEach } from 'vitest'
import { inspectionsRouter } from '../routers/inspections'
import { mockSupabaseClient, resetSupabaseMocks, createMockChain } from '../test/mocks/supabase'
import { createPublicContext, createAuthenticatedContext, setupFromMock, makeThenable } from '../test/helpers'
import type { MockContext } from '../test/helpers'

const createTestCaller = (ctx: MockContext) =>
  inspectionsRouter.createCaller(ctx as Parameters<typeof inspectionsRouter.createCaller>[0])

describe('Inspections Router', () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  // ── saveDraft ─────────────────────────────────────
  describe('saveDraft', () => {
    const architectInput = {
      projectId: '11111111-1111-1111-1111-111111111111',
      inspectionType: 'architectural_feasibility' as const,
      buildingAddress: 'רחוב הרצל 10',
      apartmentCount: 20,
      floorCount: 5,
      conclusion: 'single_building' as const,
    }

    it('rejects unauthenticated access', async () => {
      const caller = createTestCaller(createPublicContext())
      await expect(caller.saveDraft(architectInput)).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })

    it('rejects non-provider role', async () => {
      const ctx = createAuthenticatedContext()

      const profileChain = createMockChain()
      profileChain.single.mockResolvedValue({ data: { role: 'tenant' }, error: null })

      setupFromMock({ profiles: profileChain })

      const caller = createTestCaller(ctx)
      await expect(caller.saveDraft(architectInput)).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })

    it('saves architectural feasibility draft successfully', async () => {
      const ctx = createAuthenticatedContext()

      const profileChain = createMockChain()
      profileChain.single.mockResolvedValue({ data: { role: 'architect' }, error: null })

      const slotChain = createMockChain()
      makeThenable(slotChain, { data: [{ id: 'insp-1', slot_number: 1 }], error: null })

      const upsertChain = createMockChain()
      upsertChain.single.mockResolvedValue({
        data: { id: 'insp-2', inspection_type: 'architectural_feasibility', status: 'draft' },
        error: null,
      })

      let inspCallCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain
        if (table === 'inspections') {
          inspCallCount++
          return inspCallCount === 1 ? slotChain : upsertChain
        }
        return createMockChain()
      })

      const caller = createTestCaller(ctx)
      const result = await caller.saveDraft(architectInput)
      expect(result.inspection_type).toBe('architectural_feasibility')
      expect(result.status).toBe('draft')
    })

    it('rejects when max slots reached (3)', async () => {
      const ctx = createAuthenticatedContext()

      const profileChain = createMockChain()
      profileChain.single.mockResolvedValue({ data: { role: 'architect' }, error: null })

      const slotChain = createMockChain()
      makeThenable(slotChain, {
        data: [{ id: 'i1', slot_number: 1 }, { id: 'i2', slot_number: 2 }, { id: 'i3', slot_number: 3 }],
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain
        if (table === 'inspections') return slotChain
        return createMockChain()
      })

      const caller = createTestCaller(ctx)
      await expect(caller.saveDraft(architectInput)).rejects.toMatchObject({ code: 'CONFLICT' })
    })

    it('saves economic feasibility draft (appraiser type)', async () => {
      const ctx = createAuthenticatedContext()

      const profileChain = createMockChain()
      profileChain.single.mockResolvedValue({ data: { role: 'appraiser' }, error: null })

      const slotChain = createMockChain()
      makeThenable(slotChain, { data: [], error: null })

      const upsertChain = createMockChain()
      upsertChain.single.mockResolvedValue({
        data: { id: 'insp-3', inspection_type: 'economic_feasibility', status: 'draft' },
        error: null,
      })

      let inspCallCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain
        if (table === 'inspections') {
          inspCallCount++
          return inspCallCount === 1 ? slotChain : upsertChain
        }
        return createMockChain()
      })

      const caller = createTestCaller(ctx)
      const result = await caller.saveDraft({
        projectId: '11111111-1111-1111-1111-111111111111',
        inspectionType: 'economic_feasibility',
        conclusion: 'economic',
      })
      expect(result.inspection_type).toBe('economic_feasibility')
    })

    it('saves planning check with plan details', async () => {
      const ctx = createAuthenticatedContext()

      const profileChain = createMockChain()
      profileChain.single.mockResolvedValue({ data: { role: 'architect' }, error: null })

      const slotChain = createMockChain()
      makeThenable(slotChain, { data: [], error: null })

      const upsertChain = createMockChain()
      upsertChain.single.mockResolvedValue({
        data: { id: 'insp-4', inspection_type: 'planning_check', status: 'draft' },
        error: null,
      })

      let inspCallCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain
        if (table === 'inspections') {
          inspCallCount++
          return inspCallCount === 1 ? slotChain : upsertChain
        }
        return createMockChain()
      })

      const caller = createTestCaller(ctx)
      const result = await caller.saveDraft({
        projectId: '11111111-1111-1111-1111-111111111111',
        inspectionType: 'planning_check',
        planNumber: 'תמא 38/2',
        landUse: 'מגורים',
        conclusion: 'single_building',
      })
      expect(result.inspection_type).toBe('planning_check')
    })
  })

  // ── submit ─────────────────────────────────────
  describe('submit', () => {
    it('rejects unauthenticated access', async () => {
      const caller = createTestCaller(createPublicContext())
      await expect(caller.submit({ inspectionId: '11111111-1111-1111-1111-111111111111' }))
        .rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })

    it('submits draft inspection', async () => {
      const ctx = createAuthenticatedContext()

      const inspChain = createMockChain()
      inspChain.single.mockResolvedValue({
        data: { id: 'insp-1', status: 'submitted' },
        error: null,
      })

      setupFromMock({ inspections: inspChain })

      const caller = createTestCaller(ctx)
      const result = await caller.submit({ inspectionId: '11111111-1111-1111-1111-111111111111' })
      expect(result.status).toBe('submitted')
    })

    it('throws when inspection not found or not draft', async () => {
      const ctx = createAuthenticatedContext()

      const inspChain = createMockChain()
      inspChain.single.mockResolvedValue({ data: null, error: { message: 'not found' } })

      setupFromMock({ inspections: inspChain })

      const caller = createTestCaller(ctx)
      await expect(caller.submit({ inspectionId: '11111111-1111-1111-1111-111111111111' }))
        .rejects.toMatchObject({ code: 'BAD_REQUEST' })
    })
  })

  // ── addFile ─────────────────────────────────────
  describe('addFile', () => {
    const fileInput = {
      inspectionId: '11111111-1111-1111-1111-111111111111',
      fileType: 'report_pdf' as const,
      fileName: 'report.pdf',
      fileUrl: 'https://storage.example.com/report.pdf',
      fileSizeBytes: 1024000,
    }

    it('rejects unauthenticated access', async () => {
      const caller = createTestCaller(createPublicContext())
      await expect(caller.addFile(fileInput)).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })

    it('adds file to inspection successfully', async () => {
      const ctx = createAuthenticatedContext()

      const inspChain = createMockChain()
      inspChain.single.mockResolvedValue({ data: { id: fileInput.inspectionId }, error: null })

      const fileChain = createMockChain()
      fileChain.single.mockResolvedValue({
        data: { id: 'file-1', file_name: fileInput.fileName, file_type: 'report_pdf' },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'inspections') return inspChain
        if (table === 'inspection_files') return fileChain
        return createMockChain()
      })

      const caller = createTestCaller(ctx)
      const result = await caller.addFile(fileInput)
      expect(result.id).toBe('file-1')
      expect(result.file_type).toBe('report_pdf')
    })

    it('throws FORBIDDEN when inspection not owned by user', async () => {
      const ctx = createAuthenticatedContext()

      const inspChain = createMockChain()
      inspChain.single.mockResolvedValue({ data: null, error: null })

      setupFromMock({ inspections: inspChain })

      const caller = createTestCaller(ctx)
      await expect(caller.addFile(fileInput)).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })

    it('throws on file insert error', async () => {
      const ctx = createAuthenticatedContext()

      const inspChain = createMockChain()
      inspChain.single.mockResolvedValue({ data: { id: fileInput.inspectionId }, error: null })

      const fileChain = createMockChain()
      fileChain.single.mockResolvedValue({ data: null, error: { message: 'insert error' } })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'inspections') return inspChain
        if (table === 'inspection_files') return fileChain
        return createMockChain()
      })

      const caller = createTestCaller(ctx)
      await expect(caller.addFile(fileInput)).rejects.toMatchObject({ code: 'INTERNAL_SERVER_ERROR' })
    })

    it('supports different file types', async () => {
      const ctx = createAuthenticatedContext()

      const inspChain = createMockChain()
      inspChain.single.mockResolvedValue({ data: { id: fileInput.inspectionId }, error: null })

      const fileChain = createMockChain()
      fileChain.single.mockResolvedValue({
        data: { id: 'file-2', file_name: 'sketch.png', file_type: 'sketch' },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'inspections') return inspChain
        if (table === 'inspection_files') return fileChain
        return createMockChain()
      })

      const caller = createTestCaller(ctx)
      const result = await caller.addFile({
        ...fileInput,
        fileType: 'sketch',
        fileName: 'sketch.png',
      })
      expect(result.file_type).toBe('sketch')
    })
  })

  // ── getMyInspections ─────────────────────────────────────
  describe('getMyInspections', () => {
    it('rejects unauthenticated access', async () => {
      const caller = createTestCaller(createPublicContext())
      await expect(caller.getMyInspections()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })

    it('returns inspections for the provider', async () => {
      const ctx = createAuthenticatedContext()

      const inspChain = createMockChain()
      makeThenable(inspChain, {
        data: [
          { id: 'i1', inspection_type: 'architectural_feasibility', status: 'draft' },
          { id: 'i2', inspection_type: 'economic_feasibility', status: 'submitted' },
        ],
        error: null,
      })

      setupFromMock({ inspections: inspChain })

      const caller = createTestCaller(ctx)
      const result = await caller.getMyInspections()
      expect(result).toHaveLength(2)
    })

    it('returns empty array when no inspections', async () => {
      const ctx = createAuthenticatedContext()

      const inspChain = createMockChain()
      makeThenable(inspChain, { data: null, error: null })

      setupFromMock({ inspections: inspChain })

      const caller = createTestCaller(ctx)
      const result = await caller.getMyInspections()
      expect(result).toEqual([])
    })
  })

  // ── getMyPlan ─────────────────────────────────────
  describe('getMyPlan', () => {
    it('rejects unauthenticated access', async () => {
      const caller = createTestCaller(createPublicContext())
      await expect(caller.getMyPlan()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })

    it('returns provider plan info', async () => {
      const ctx = createAuthenticatedContext()

      const ppChain = createMockChain()
      ppChain.single.mockResolvedValue({
        data: { plan: 'pro', contribution_score: 80, quality_score: 90, ranking_score: 85 },
        error: null,
      })

      setupFromMock({ provider_profiles: ppChain })

      const caller = createTestCaller(ctx)
      const result = await caller.getMyPlan()
      expect(result!.plan).toBe('pro')
    })
  })

  // ── markUseful ─────────────────────────────────────
  describe('markUseful', () => {
    const markInput = {
      inspectionId: '11111111-1111-1111-1111-111111111111',
      isUseful: true,
    }

    it('rejects unauthenticated access', async () => {
      const caller = createTestCaller(createPublicContext())
      await expect(caller.markUseful(markInput)).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })

    it('rejects non-manager role', async () => {
      const ctx = createAuthenticatedContext()

      const profileChain = createMockChain()
      profileChain.single.mockResolvedValue({ data: { role: 'tenant' }, error: null })

      const inspChain = createMockChain()
      makeThenable(inspChain, { data: null, error: null })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain
        if (table === 'inspections') return inspChain
        return createMockChain()
      })

      const caller = createTestCaller(ctx)
      await expect(caller.markUseful(markInput)).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })

    it('marks inspection as useful for manager', async () => {
      const ctx = createAuthenticatedContext()

      const profileChain = createMockChain()
      profileChain.single.mockResolvedValue({ data: { role: 'manager' }, error: null })

      const inspChain = createMockChain()
      makeThenable(inspChain, { data: null, error: null })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain
        if (table === 'inspections') return inspChain
        return createMockChain()
      })

      const caller = createTestCaller(ctx)
      const result = await caller.markUseful(markInput)
      expect(result.success).toBe(true)
    })
  })
})
