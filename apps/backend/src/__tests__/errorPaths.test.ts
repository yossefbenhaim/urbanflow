/**
 * Session 6 — Error path tests.
 * Verifies that every router returns clear TRPCError messages (not raw DB errors).
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { TRPCError } from '@trpc/server'
import { committeeRouter } from '../routers/committee'
import { managerRouter } from '../routers/manager'
import { providerRouter } from '../routers/provider'
import { tenantRouter } from '../routers/tenant'
import { faqRouter } from '../routers/faq'
import { mockSupabaseClient, resetSupabaseMocks, createMockChain } from '../test/mocks/supabase'
import { createPublicContext, createAuthenticatedContext, setupFromMock, makeThenable } from '../test/helpers'
import type { MockContext } from '../test/helpers'

// ── Caller factories ─────────────────────────────────────────────────────────
const committeeCallerFor = (ctx: MockContext) =>
  committeeRouter.createCaller(ctx as Parameters<typeof committeeRouter.createCaller>[0])

const managerCallerFor = (ctx: MockContext) =>
  managerRouter.createCaller(ctx as Parameters<typeof managerRouter.createCaller>[0])

const providerCallerFor = (ctx: MockContext) =>
  providerRouter.createCaller(ctx as Parameters<typeof providerRouter.createCaller>[0])

const tenantCallerFor = (ctx: MockContext) =>
  tenantRouter.createCaller(ctx as Parameters<typeof tenantRouter.createCaller>[0])

const faqCallerFor = (ctx: MockContext) =>
  faqRouter.createCaller(ctx as Parameters<typeof faqRouter.createCaller>[0])

// ── committee router ─────────────────────────────────────────────────────────
describe('committeeRouter error paths', () => {
  beforeEach(() => resetSupabaseMocks())

  it('broadcastMessage: DB error throws TRPCError with message', async () => {
    const ctx = createAuthenticatedContext()
    const unitsChain = createMockChain()
    unitsChain.single.mockResolvedValue({ data: null, error: null })
    makeThenable(unitsChain, { data: [{ count: 0 }], error: null })

    const broadcastChain = createMockChain()
    broadcastChain.single.mockResolvedValue({ data: null, error: { message: 'DB connection failed' } })

    setupFromMock({ units: unitsChain, broadcast_messages: broadcastChain })

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'u@example.com' } },
      error: null,
    })

    const caller = committeeCallerFor(ctx)
    await expect(
      caller.broadcastMessage({ buildingId: 'b1', title: 'Test', body: 'Body' })
    ).rejects.toMatchObject({ constructor: TRPCError, message: 'DB connection failed' })
  })

  it('uploadDocument: NOT_FOUND when building missing', async () => {
    const ctx = createAuthenticatedContext()
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'u@example.com' } },
      error: null,
    })

    const buildingsChain = createMockChain()
    buildingsChain.single.mockResolvedValue({ data: null, error: null })
    setupFromMock({ buildings: buildingsChain })

    const caller = committeeCallerFor(ctx)
    await expect(
      caller.uploadDocument({
        name: 'test.pdf',
        docType: 'contract',
        fileUrl: 'https://example.com/doc.pdf',
        buildingId: '00000000-0000-0000-0000-000000000001',
      })
    ).rejects.toMatchObject({ constructor: TRPCError, code: 'NOT_FOUND' })
  })
})

// ── manager router ───────────────────────────────────────────────────────────
describe('managerRouter error paths', () => {
  beforeEach(() => resetSupabaseMocks())

  it('createProject: DB error throws TRPCError', async () => {
    const ctx = createAuthenticatedContext()
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'mgr-1', email: 'mgr@example.com' } },
      error: null,
    })

    const projectsChain = createMockChain()
    projectsChain.single.mockResolvedValue({ data: null, error: { message: 'unique constraint violation' } })
    setupFromMock({ projects: projectsChain })

    const caller = managerCallerFor(ctx)
    await expect(
      caller.createProject({ name: 'Project A', type: 'PINUY_BINUY' })
    ).rejects.toMatchObject({ constructor: TRPCError, message: 'unique constraint violation' })
  })

  it('updateProject: DB error throws TRPCError', async () => {
    const ctx = createAuthenticatedContext()
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'mgr-1', email: 'mgr@example.com' } },
      error: null,
    })

    const projectsChain = createMockChain()
    makeThenable(projectsChain, { data: null, error: { message: 'Row not found' } })
    setupFromMock({ projects: projectsChain })

    const caller = managerCallerFor(ctx)
    await expect(
      caller.updateProject({ id: 'proj-1', name: 'New Name' })
    ).rejects.toMatchObject({ constructor: TRPCError })
  })
})

// ── provider router ───────────────────────────────────────────────────────────
describe('providerRouter error paths', () => {
  beforeEach(() => resetSupabaseMocks())

  it('applyToJob: DB error throws TRPCError', async () => {
    const ctx = createAuthenticatedContext()
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'prov-1', email: 'prov@example.com' } },
      error: null,
    })

    const appsChain = createMockChain()
    appsChain.single.mockResolvedValue({ data: null, error: { message: 'foreign key violation' } })
    setupFromMock({ service_applications: appsChain })

    const caller = providerCallerFor(ctx)
    await expect(
      caller.applyToJob({ listingId: 'listing-1', coverLetter: 'I am a good fit.' })
    ).rejects.toMatchObject({ constructor: TRPCError, message: 'foreign key violation' })
  })
})

// ── tenant router ─────────────────────────────────────────────────────────────
describe('tenantRouter error paths', () => {
  beforeEach(() => resetSupabaseMocks())

  it('updateProfile: DB error throws TRPCError', async () => {
    const ctx = createAuthenticatedContext()
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'u@example.com' } },
      error: null,
    })

    const profilesChain = createMockChain()
    makeThenable(profilesChain, { data: null, error: { message: 'update failed' } })
    setupFromMock({ profiles: profilesChain })

    const caller = tenantCallerFor(ctx)
    await expect(
      caller.updateProfile({ fullName: 'Test' })
    ).rejects.toMatchObject({ constructor: TRPCError, message: 'update failed' })
  })

  it('signDocument: DB error throws TRPCError', async () => {
    const ctx = createAuthenticatedContext()
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'u@example.com' } },
      error: null,
    })

    const signaturesChain = createMockChain()
    makeThenable(signaturesChain, { data: null, error: { message: 'duplicate signature' } })
    setupFromMock({ signatures: signaturesChain })

    const caller = tenantCallerFor(ctx)
    await expect(
      caller.signDocument({ docId: 'doc-abc' })
    ).rejects.toMatchObject({ constructor: TRPCError, message: 'duplicate signature' })
  })

  it('joinProject: NOT_FOUND when invite code invalid', async () => {
    const ctx = createAuthenticatedContext()
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'u@example.com' } },
      error: null,
    })

    const projectsChain = createMockChain()
    projectsChain.single.mockResolvedValue({ data: null, error: { message: 'not found' } })
    setupFromMock({ projects: projectsChain })

    const caller = tenantCallerFor(ctx)
    await expect(
      caller.joinProject({ inviteCode: 'BADCOD' })
    ).rejects.toMatchObject({ constructor: TRPCError, code: 'NOT_FOUND' })
  })
})

// ── faq router ────────────────────────────────────────────────────────────────
describe('faqRouter error paths', () => {
  beforeEach(() => resetSupabaseMocks())

  it('getTopics: DB error throws TRPCError INTERNAL_SERVER_ERROR', async () => {
    const ctx = createPublicContext()

    const faqChain = createMockChain()
    makeThenable(faqChain, { data: null, error: { message: 'connection timeout' } })
    setupFromMock({ faq_nodes: faqChain })

    const caller = faqCallerFor(ctx)
    await expect(caller.getTopics()).rejects.toMatchObject({
      constructor: TRPCError,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'connection timeout',
    })
  })

  it('getNode: NOT_FOUND when node missing', async () => {
    const ctx = createPublicContext()

    const faqChain = createMockChain()
    faqChain.single.mockResolvedValue({ data: null, error: { message: 'not found' } })
    setupFromMock({ faq_nodes: faqChain })

    const caller = faqCallerFor(ctx)
    await expect(
      caller.getNode({ id: '00000000-0000-0000-0000-000000000001' })
    ).rejects.toMatchObject({
      constructor: TRPCError,
      code: 'NOT_FOUND',
    })
  })

  it('askAI: returns fallback answer when no API key', async () => {
    const ctx = createPublicContext()
    const savedKey = process.env.OPENAI_API_KEY
    delete process.env.OPENAI_API_KEY
    delete process.env.ANTHROPIC_API_KEY

    const caller = faqCallerFor(ctx)
    const result = await caller.askAI({ question: 'מה זה פינוי בינוי?' })

    expect(result.source).toBe('fallback')
    expect(result.answer).toContain('AI')

    if (savedKey) process.env.OPENAI_API_KEY = savedKey
  })
})
