/**
 * Mock Supabase client for backend tests.
 *
 * Each test should call `resetSupabaseMocks()` in beforeEach to start fresh.
 * Chain methods return `this` so queries like `.from('x').select('y').eq('a','b').single()`
 * can be configured per-table.
 */

/** Type for the mock chain object returned by createMockChain */
export type MockChain = Record<string, ReturnType<typeof vi.fn>>

/** Per-table mock chains. Each chain is an independent object with its own spies. */
export function createMockChain(overrides?: Record<string, unknown>): MockChain {
  const chain: MockChain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  }
  // Make every chainable method return the chain itself
  for (const key of ['select', 'insert', 'update', 'upsert', 'delete', 'eq', 'neq', 'in', 'is', 'or', 'ilike', 'gte', 'lte', 'order', 'limit']) {
    chain[key].mockReturnValue(chain)
  }
  // Default resolution for terminal await (when no .single()/.maybeSingle() is called)
  ;(chain as any).then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null })
  return chain
}

export const mockSupabaseClient = {
  from: vi.fn((_table: string) => createMockChain()),
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not configured' } }),
    signUp: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not configured' } }),
    refreshSession: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not configured' } }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    admin: {
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getUserById: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }),
    },
  },
}

export function resetSupabaseMocks() {
  vi.clearAllMocks()
}
