import { describe, it, expect, beforeEach } from 'vitest'
import { authRouter } from '../routers/auth'
import { mockSupabaseClient, resetSupabaseMocks, createMockChain } from '../test/mocks/supabase'
import { createPublicContext, createAuthenticatedContext, setupFromMock, makeThenable } from '../test/helpers'
import type { MockContext } from '../test/helpers'
import { TRPCError } from '@trpc/server'

// Create a caller factory from the router
// We cast MockContext to satisfy the tRPC context requirement in tests
const createTestCaller = (ctx: MockContext) =>
  authRouter.createCaller(ctx as Parameters<typeof authRouter.createCaller>[0])

describe('Auth Router', () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  // ── Sign In ──────────────────────────────────────────────
  describe('signIn', () => {
    it('should sign in successfully and return tokens + user info', async () => {
      const ctx = createPublicContext()
      const caller = createTestCaller(ctx)

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'user-1', email: 'test@example.com' },
          session: { access_token: 'at-123', refresh_token: 'rt-456' },
        },
        error: null,
      })

      const profilesChain = createMockChain()
      profilesChain.single.mockResolvedValue({
        data: { role: 'tenant', full_name: 'Test User', original_device: null },
        error: null,
      })
      setupFromMock({ profiles: profilesChain })

      const result = await caller.signIn({
        email: 'test@example.com',
        password: 'password123',
      })

      expect(result.accessToken).toBe('at-123')
      expect(result.refreshToken).toBe('rt-456')
      expect(result.user.id).toBe('user-1')
      expect(result.user.email).toBe('test@example.com')
      expect(result.user.role).toBe('tenant')
      expect(result.user.fullName).toBe('Test User')
    })

    it('should save device info on sign in when not yet saved', async () => {
      const ctx = createPublicContext()
      const caller = createTestCaller(ctx)

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'user-1', email: 'test@example.com' },
          session: { access_token: 'at', refresh_token: 'rt' },
        },
        error: null,
      })

      const profilesChain = createMockChain()
      // First call: check original_device (null = not saved yet)
      // Second call: get role
      let callCount = 0
      profilesChain.single
        .mockImplementation(() => {
          callCount++
          if (callCount === 1) {
            return Promise.resolve({ data: { original_device: null }, error: null })
          }
          return Promise.resolve({ data: { role: 'tenant', full_name: 'Test' }, error: null })
        })
      setupFromMock({ profiles: profilesChain })

      const deviceInfo = {
        user_agent: 'Mozilla/5.0',
        screen_width: 1920,
        screen_height: 1080,
        platform: 'Win32',
        registered_at: '2024-01-01T00:00:00Z',
      }

      await caller.signIn({
        email: 'test@example.com',
        password: 'password123',
        deviceInfo,
      })

      expect(profilesChain.update).toHaveBeenCalledWith({ original_device: deviceInfo })
    })

    it('should throw UNAUTHORIZED on invalid credentials', async () => {
      const ctx = createPublicContext()
      const caller = createTestCaller(ctx)

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      })

      await expect(caller.signIn({
        email: 'test@example.com',
        password: 'wrongpassword',
      })).rejects.toThrow(TRPCError)

      await expect(caller.signIn({
        email: 'test@example.com',
        password: 'wrongpassword',
      })).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })

    it('should reject invalid email format (Zod validation)', async () => {
      const ctx = createPublicContext()
      const caller = createTestCaller(ctx)

      await expect(caller.signIn({
        email: 'not-an-email',
        password: 'password123',
      })).rejects.toThrow()
    })

    it('should reject password shorter than 6 characters (Zod validation)', async () => {
      const ctx = createPublicContext()
      const caller = createTestCaller(ctx)

      await expect(caller.signIn({
        email: 'test@example.com',
        password: '12345',
      })).rejects.toThrow()
    })
  })

  // ── Sign Up ──────────────────────────────────────────────
  describe('signUp', () => {
    it('should sign up successfully and return tokens + userId', async () => {
      const ctx = createPublicContext()
      const caller = createTestCaller(ctx)

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: {
          user: { id: 'new-user-1' },
          session: { access_token: 'at-new', refresh_token: 'rt-new' },
        },
        error: null,
      })

      const result = await caller.signUp({
        email: 'new@example.com',
        password: 'password123',
      })

      expect(result.accessToken).toBe('at-new')
      expect(result.refreshToken).toBe('rt-new')
      expect(result.userId).toBe('new-user-1')
    })

    it('should save device info for new user', async () => {
      const ctx = createPublicContext()
      const caller = createTestCaller(ctx)

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: {
          user: { id: 'new-user-1' },
          session: { access_token: 'at', refresh_token: 'rt' },
        },
        error: null,
      })

      const profilesChain = createMockChain()
      setupFromMock({ profiles: profilesChain })

      const deviceInfo = {
        user_agent: 'Test Agent',
        screen_width: 1024,
        screen_height: 768,
        platform: 'Linux',
        registered_at: '2024-01-01T00:00:00Z',
      }

      await caller.signUp({
        email: 'new@example.com',
        password: 'password123',
        deviceInfo,
      })

      expect(profilesChain.update).toHaveBeenCalledWith({ original_device: deviceInfo })
    })

    it('should throw BAD_REQUEST on signup error', async () => {
      const ctx = createPublicContext()
      const caller = createTestCaller(ctx)

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      })

      await expect(caller.signUp({
        email: 'existing@example.com',
        password: 'password123',
      })).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    })

    it('should return null tokens when session is missing (email confirmation required)', async () => {
      const ctx = createPublicContext()
      const caller = createTestCaller(ctx)

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: {
          user: { id: 'new-user-2' },
          session: null,
        },
        error: null,
      })

      const result = await caller.signUp({
        email: 'new@example.com',
        password: 'password123',
      })

      expect(result.accessToken).toBeNull()
      expect(result.refreshToken).toBeNull()
      expect(result.userId).toBe('new-user-2')
    })
  })

  // ── Refresh Token ────────────────────────────────────────
  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const ctx = createPublicContext()
      const caller = createTestCaller(ctx)

      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: {
          session: { access_token: 'new-at', refresh_token: 'new-rt' },
        },
        error: null,
      })

      const result = await caller.refreshToken({ refreshToken: 'old-rt' })

      expect(result.accessToken).toBe('new-at')
      expect(result.refreshToken).toBe('new-rt')
    })

    it('should throw UNAUTHORIZED on invalid refresh token', async () => {
      const ctx = createPublicContext()
      const caller = createTestCaller(ctx)

      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid refresh token' },
      })

      await expect(caller.refreshToken({ refreshToken: 'bad-rt' }))
        .rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })
  })

  // ── Reset Password ──────────────────────────────────────
  describe('resetPassword', () => {
    it('should send reset password email successfully', async () => {
      const ctx = createPublicContext()
      const caller = createTestCaller(ctx)

      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({ error: null })

      const result = await caller.resetPassword({ email: 'test@example.com' })
      expect(result.sent).toBe(true)
    })

    it('should throw BAD_REQUEST on reset error', async () => {
      const ctx = createPublicContext()
      const caller = createTestCaller(ctx)

      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        error: { message: 'Rate limit exceeded' },
      })

      await expect(caller.resetPassword({ email: 'test@example.com' }))
        .rejects.toMatchObject({ code: 'BAD_REQUEST' })
    })

    it('should reject invalid email (Zod validation)', async () => {
      const ctx = createPublicContext()
      const caller = createTestCaller(ctx)

      await expect(caller.resetPassword({ email: 'invalid' })).rejects.toThrow()
    })
  })

  // ── Protected Procedures (signOut, me) ──────────────────
  describe('signOut (protected)', () => {
    it('should reject access without token', async () => {
      const ctx = createPublicContext()
      const caller = createTestCaller(ctx)

      await expect(caller.signOut()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })

    it('should reject with invalid/expired token', async () => {
      const ctx: MockContext = {
        supabase: mockSupabaseClient,
        token: 'expired-token',
      }
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Token expired' },
      })
      const caller = createTestCaller(ctx)

      await expect(caller.signOut()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })

    it('should sign out successfully with valid token', async () => {
      const ctx = createAuthenticatedContext('user-1', 'test@example.com')
      const caller = createTestCaller(ctx)

      const result = await caller.signOut()
      expect(result.success).toBe(true)
    })
  })

  describe('me (protected)', () => {
    it('should reject access without token', async () => {
      const ctx = createPublicContext()
      const caller = createTestCaller(ctx)

      await expect(caller.me()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })

    it('should return current user profile', async () => {
      const ctx = createAuthenticatedContext('user-1', 'me@example.com')
      const caller = createTestCaller(ctx)

      const profilesChain = createMockChain()
      profilesChain.single.mockResolvedValue({
        data: {
          role: 'tenant',
          full_name: 'My Name',
          phone: '0501234567',
          id_number: '123456789',
          is_building_representative: true,
        },
        error: null,
      })
      setupFromMock({ profiles: profilesChain })

      const result = await caller.me()

      expect(result.id).toBe('user-1')
      expect(result.email).toBe('me@example.com')
      expect(result.role).toBe('tenant')
      expect(result.fullName).toBe('My Name')
      expect(result.phone).toBe('0501234567')
      expect(result.idNumber).toBe('123456789')
      expect(result.isBuildingRepresentative).toBe(true)
    })

    it('should return defaults when profile is missing', async () => {
      const ctx = createAuthenticatedContext('user-1', 'me@example.com')
      const caller = createTestCaller(ctx)

      const profilesChain = createMockChain()
      profilesChain.single.mockResolvedValue({ data: null, error: null })
      setupFromMock({ profiles: profilesChain })

      const result = await caller.me()
      expect(result.role).toBeNull()
      expect(result.fullName).toBeNull()
      expect(result.isBuildingRepresentative).toBe(false)
    })
  })

  // ── Register Tenant ──────────────────────────────────────
  describe('registerTenant', () => {
    const validInput = {
      email: 'tenant@example.com',
      password: 'password123',
      fullName: 'Tenant User',
      phone: '0501234567',
      idNumber: '123456789',
      city: 'Tel Aviv',
      street: 'Rothschild',
      buildingNumber: '42',
      isOwner: true,
    }

    it('should register a tenant successfully', async () => {
      const ctx = createPublicContext()
      const caller = createTestCaller(ctx)

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: {
          user: { id: 'tenant-1' },
          session: { access_token: 'at', refresh_token: 'rt' },
        },
        error: null,
      })

      const profilesChain = createMockChain()
      const tenantProfilesChain = createMockChain()
      setupFromMock({ profiles: profilesChain, tenant_profiles: tenantProfilesChain })

      const result = await caller.registerTenant(validInput)

      expect(result.userId).toBe('tenant-1')
      expect(result.accessToken).toBe('at')
      expect(profilesChain.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'tenant-1',
          full_name: 'Tenant User',
          role: 'tenant',
        }),
        { onConflict: 'id' }
      )
      expect(tenantProfilesChain.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'tenant-1',
          is_owner: true,
          is_onboarded: true,
        }),
        { onConflict: 'user_id' }
      )
    })

    it('should throw BAD_REQUEST when signup fails', async () => {
      const ctx = createPublicContext()
      const caller = createTestCaller(ctx)

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email already in use' },
      })

      await expect(caller.registerTenant(validInput))
        .rejects.toMatchObject({ code: 'BAD_REQUEST' })
    })

    it('should reject invalid email in registration (Zod)', async () => {
      const ctx = createPublicContext()
      const caller = createTestCaller(ctx)

      await expect(caller.registerTenant({ ...validInput, email: 'bad-email' }))
        .rejects.toThrow()
    })

    it('should reject short password in registration (Zod)', async () => {
      const ctx = createPublicContext()
      const caller = createTestCaller(ctx)

      await expect(caller.registerTenant({ ...validInput, password: '123' }))
        .rejects.toThrow()
    })
  })

  // ── Complete OAuth Profile (protected) ──────────────────
  describe('completeOAuthProfile', () => {
    it('should reject access without token', async () => {
      const ctx = createPublicContext()
      const caller = createTestCaller(ctx)

      await expect(caller.completeOAuthProfile({ role: 'tenant' }))
        .rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })

    it('should complete OAuth profile successfully', async () => {
      const ctx = createAuthenticatedContext('user-oauth', 'oauth@example.com')
      const caller = createTestCaller(ctx)

      const profilesChain = createMockChain()
      profilesChain.upsert.mockReturnValue(profilesChain)
      makeThenable(profilesChain)
      setupFromMock({ profiles: profilesChain })

      const result = await caller.completeOAuthProfile({
        fullName: 'OAuth User',
        role: 'tenant',
      })

      expect(result.success).toBe(true)
      expect(result.role).toBe('tenant')
    })

    it('should reject invalid role (Zod enum validation)', async () => {
      const ctx = createAuthenticatedContext()
      const caller = createTestCaller(ctx)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentionally invalid input to test Zod validation
      await expect(caller.completeOAuthProfile({
        role: 'admin' as unknown as 'tenant',
      })).rejects.toThrow()
    })
  })
})
