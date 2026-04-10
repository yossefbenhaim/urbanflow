/**
 * Test helpers for creating tRPC callers with mocked Supabase.
 */
import { mockSupabaseClient, createMockChain, MockChain } from './mocks/supabase'

/** Minimal context shape that satisfies both public and protected tRPC procedures. */
export interface MockContext {
  supabase: typeof mockSupabaseClient
  token?: string
  user?: { id: string; email: string }
}

/**
 * Create a public (unauthenticated) context.
 * Use `as unknown as Context` when passing to createCaller if full Context is needed.
 */
export function createPublicContext(): MockContext {
  return {
    supabase: mockSupabaseClient,
    token: undefined,
  }
}

/**
 * Create an authenticated context with a fake user.
 */
export function createAuthenticatedContext(
  userId = 'test-user-id',
  email = 'test@example.com'
): MockContext {
  // Configure getUser to return the authenticated user
  mockSupabaseClient.auth.getUser.mockResolvedValue({
    data: { user: { id: userId, email } },
    error: null,
  })
  return {
    supabase: mockSupabaseClient,
    token: 'valid-test-token',
  }
}

/**
 * Set up mockSupabaseClient.from() to return specific chains per table.
 * Example:
 *   const profilesChain = createMockChain()
 *   profilesChain.single.mockResolvedValue({ data: { role: 'tenant' }, error: null })
 *   setupFromMock({ profiles: profilesChain })
 */
export function setupFromMock(tableChains: Record<string, MockChain>) {
  mockSupabaseClient.from.mockImplementation((table: string) => {
    if (tableChains[table]) return tableChains[table]
    return createMockChain()
  })
}

/**
 * Make a mock chain resolve as a thenable (for terminal await without .single()/.maybeSingle()).
 * Eliminates the need for `(chain as any).then = ...` pattern.
 */
export function makeThenable(
  chain: MockChain,
  result: { data: unknown; error: unknown } = { data: null, error: null }
): MockChain {
  ;(chain as ThenableMockChain).then = (resolve: (v: unknown) => void) => resolve(result)
  return chain
}

/** Internal type for thenable chains */
interface ThenableMockChain extends MockChain {
  then: (resolve: (v: unknown) => void) => void
}

export { createMockChain }
