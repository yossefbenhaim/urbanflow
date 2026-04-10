import { describe, it, expect, beforeEach } from 'vitest'
import { tenantRouter } from '../routers/tenant'
import { mockSupabaseClient, resetSupabaseMocks, createMockChain } from '../test/mocks/supabase'
import { createPublicContext, createAuthenticatedContext, setupFromMock, makeThenable } from '../test/helpers'
import type { MockContext } from '../test/helpers'

const createTestCaller = (ctx: MockContext) =>
  tenantRouter.createCaller(ctx as Parameters<typeof tenantRouter.createCaller>[0])

describe('Documents & Signatures', () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  // ── getDocuments ─────────────────────────────────────
  describe('getDocuments', () => {
    it('rejects unauthenticated access', async () => {
      const caller = createTestCaller(createPublicContext())
      await expect(caller.getDocuments()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })

    it('returns empty array when user has no project', async () => {
      const ctx = createAuthenticatedContext()
      const ptChain = createMockChain()
      ptChain.single.mockResolvedValue({ data: null, error: null })
      const tpChain = createMockChain()
      tpChain.single.mockResolvedValue({ data: null, error: null })

      setupFromMock({
        profiles: createMockChain({ single: vi.fn().mockResolvedValue({ data: { role: 'tenant' }, error: null }) }),
        project_tenants: ptChain,
        tenant_profiles: tpChain,
      })

      const caller = createTestCaller(ctx)
      const result = await caller.getDocuments()
      expect(result).toEqual([])
    })

    it('returns documents when user has project via project_tenants', async () => {
      const ctx = createAuthenticatedContext()
      const ptChain = createMockChain()
      ptChain.single.mockResolvedValue({ data: { project_id: 'proj-1' }, error: null })

      const docsChain = createMockChain()
      const mockDocs = [
        { id: 'doc-1', title: 'הסכם עקרונות', type: 'SIGN_REQUIRED', slug: 'agreement_principles', signatures: [] },
        { id: 'doc-2', title: 'מכתב גילוי', type: 'INFO_ONLY', slug: 'disclosure_letter', signatures: [{ signed_at: '2026-01-01' }] },
      ]
      makeThenable(docsChain, { data: mockDocs, error: null })

      setupFromMock({
        profiles: createMockChain({ single: vi.fn().mockResolvedValue({ data: { role: 'tenant' }, error: null }) }),
        project_tenants: ptChain,
        documents: docsChain,
      })

      const caller = createTestCaller(ctx)
      const result = await caller.getDocuments()
      expect(result).toHaveLength(2)
      expect(result[0].title).toBe('הסכם עקרונות')
    })
  })

  // ── signDocument ─────────────────────────────────────
  describe('signDocument', () => {
    it('rejects unauthenticated access', async () => {
      const caller = createTestCaller(createPublicContext())
      await expect(caller.signDocument({ docId: 'doc-1' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })

    it('signs document successfully', async () => {
      const ctx = createAuthenticatedContext()
      const sigChain = createMockChain()
      makeThenable(sigChain, { data: { id: 'sig-1' }, error: null })

      setupFromMock({
        profiles: createMockChain({ single: vi.fn().mockResolvedValue({ data: { role: 'tenant' }, error: null }) }),
        signatures: sigChain,
      })

      const caller = createTestCaller(ctx)
      const result = await caller.signDocument({ docId: 'doc-1' })
      expect(result.success).toBe(true)
      expect(result.signedAt).toBeDefined()
    })

    it('throws on insert error', async () => {
      const ctx = createAuthenticatedContext()
      const sigChain = createMockChain()
      makeThenable(sigChain, { data: null, error: { message: 'duplicate key' } })

      setupFromMock({
        profiles: createMockChain({ single: vi.fn().mockResolvedValue({ data: { role: 'tenant' }, error: null }) }),
        signatures: sigChain,
      })

      const caller = createTestCaller(ctx)
      await expect(caller.signDocument({ docId: 'doc-1' })).rejects.toThrow()
    })
  })

  // ── getDocumentContent ─────────────────────────────────────
  describe('getDocumentContent', () => {
    it('rejects unauthenticated access', async () => {
      const caller = createTestCaller(createPublicContext())
      await expect(caller.getDocumentContent({ docId: 'agreement_principles' }))
        .rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })

    it('returns document with mySig=null when not signed', async () => {
      const ctx = createAuthenticatedContext('user-123')
      const docChain = createMockChain()
      docChain.single.mockResolvedValue({
        data: {
          id: 'doc-1',
          title: 'הסכם עקרונות',
          slug: 'agreement_principles',
          content_key: 'agreement_principles',
          signatures: [],
        },
        error: null,
      })

      setupFromMock({
        profiles: createMockChain({ single: vi.fn().mockResolvedValue({ data: { role: 'tenant' }, error: null }) }),
        documents: docChain,
      })

      const caller = createTestCaller(ctx)
      const result = await caller.getDocumentContent({ docId: 'agreement_principles' })
      expect(result.title).toBe('הסכם עקרונות')
      expect(result.mySig).toBeNull()
    })

    it('returns document with mySig when user signed', async () => {
      const ctx = createAuthenticatedContext('user-123')
      const docChain = createMockChain()
      docChain.single.mockResolvedValue({
        data: {
          id: 'doc-1',
          title: 'הסכם עקרונות',
          slug: 'agreement_principles',
          signatures: [
            { user_id: 'user-123', signed_at: '2026-01-01', signature_image: 'data:image/png;base64,...', full_name: 'Test', id_number: '123456789' },
          ],
        },
        error: null,
      })

      setupFromMock({
        profiles: createMockChain({ single: vi.fn().mockResolvedValue({ data: { role: 'tenant' }, error: null }) }),
        documents: docChain,
      })

      const caller = createTestCaller(ctx)
      const result = await caller.getDocumentContent({ docId: 'agreement_principles' })
      expect(result.mySig).not.toBeNull()
      expect(result.mySig.user_id).toBe('user-123')
    })

    it('throws NOT_FOUND for missing document', async () => {
      const ctx = createAuthenticatedContext()
      const docChain = createMockChain()
      docChain.single.mockResolvedValue({ data: null, error: { message: 'not found' } })

      setupFromMock({
        profiles: createMockChain({ single: vi.fn().mockResolvedValue({ data: { role: 'tenant' }, error: null }) }),
        documents: docChain,
      })

      const caller = createTestCaller(ctx)
      await expect(caller.getDocumentContent({ docId: 'nonexistent' }))
        .rejects.toMatchObject({ code: 'NOT_FOUND' })
    })
  })

  // ── signDocumentWithSignature ─────────────────────────────────────
  describe('signDocumentWithSignature', () => {
    const signInput = {
      docId: 'agreement_principles',
      signatureImage: 'data:image/png;base64,iVBOR...',
      fullName: 'ישראל ישראלי',
      idNumber: '123456789',
    }

    it('rejects unauthenticated access', async () => {
      const caller = createTestCaller(createPublicContext())
      await expect(caller.signDocumentWithSignature(signInput))
        .rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })

    it('signs document with full signature data', async () => {
      const ctx = createAuthenticatedContext('user-123')

      const docChain = createMockChain()
      docChain.single.mockResolvedValue({ data: { id: 'doc-uuid-1' }, error: null })

      const existingChain = createMockChain()
      existingChain.maybeSingle.mockResolvedValue({ data: null, error: null })

      const insertChain = createMockChain()
      makeThenable(insertChain, { data: { id: 'sig-1' }, error: null })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') return createMockChain({ single: vi.fn().mockResolvedValue({ data: { role: 'tenant' }, error: null }) })
        if (table === 'documents') return docChain
        if (table === 'signatures') {
          callCount++
          return callCount === 1 ? existingChain : insertChain
        }
        return createMockChain()
      })

      const caller = createTestCaller(ctx)
      const result = await caller.signDocumentWithSignature(signInput)
      expect(result.success).toBe(true)
      expect(result.signedAt).toBeDefined()
    })

    it('throws BAD_REQUEST if already signed', async () => {
      const ctx = createAuthenticatedContext('user-123')

      const docChain = createMockChain()
      docChain.single.mockResolvedValue({ data: { id: 'doc-uuid-1' }, error: null })

      const existingChain = createMockChain()
      existingChain.maybeSingle.mockResolvedValue({ data: { id: 'existing-sig' }, error: null })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') return createMockChain({ single: vi.fn().mockResolvedValue({ data: { role: 'tenant' }, error: null }) })
        if (table === 'documents') return docChain
        if (table === 'signatures') return existingChain
        return createMockChain()
      })

      const caller = createTestCaller(ctx)
      await expect(caller.signDocumentWithSignature(signInput))
        .rejects.toMatchObject({ code: 'BAD_REQUEST' })
    })

    it('throws NOT_FOUND if document slug invalid', async () => {
      const ctx = createAuthenticatedContext()
      const docChain = createMockChain()
      docChain.single.mockResolvedValue({ data: null, error: null })

      setupFromMock({
        profiles: createMockChain({ single: vi.fn().mockResolvedValue({ data: { role: 'tenant' }, error: null }) }),
        documents: docChain,
      })

      const caller = createTestCaller(ctx)
      await expect(caller.signDocumentWithSignature(signInput))
        .rejects.toMatchObject({ code: 'NOT_FOUND' })
    })
  })
})
