import { describe, it, expect, beforeEach } from 'vitest'
import { tenantRouter } from '../routers/tenant'
import { mockSupabaseClient, resetSupabaseMocks, createMockChain } from '../test/mocks/supabase'
import { createPublicContext, createAuthenticatedContext, setupFromMock, makeThenable } from '../test/helpers'
import type { MockContext } from '../test/helpers'
import { TRPCError } from '@trpc/server'

const createTestCaller = (ctx: MockContext) =>
  tenantRouter.createCaller(ctx as Parameters<typeof tenantRouter.createCaller>[0])

describe('Tenant Router', () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  // ── Protected Access ─────────────────────────────────────
  describe('protected procedures - access control', () => {
    it('should reject getMyProfile without token', async () => {
      const ctx = createPublicContext()
      const caller = createTestCaller(ctx)
      await expect(caller.getMyProfile()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })

    it('should reject updateProfile without token', async () => {
      const ctx = createPublicContext()
      const caller = createTestCaller(ctx)
      await expect(caller.updateProfile({ fullName: 'New Name' }))
        .rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })

    it('should reject joinProject without token', async () => {
      const ctx = createPublicContext()
      const caller = createTestCaller(ctx)
      await expect(caller.joinProject({ inviteCode: 'ABC123' }))
        .rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })

    it('should reject saveProfile without token', async () => {
      const ctx = createPublicContext()
      const caller = createTestCaller(ctx)
      await expect(caller.saveProfile({
        idNumber: '123456789', phone: '050', city: 'TLV', street: 'St',
        buildingNumber: '1', floor: 1, apartmentNumber: '1', apartmentSqm: 50, isOwner: true,
      })).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })

    it('should reject with expired token', async () => {
      const ctx: MockContext = {
        supabase: mockSupabaseClient,
        token: 'expired-token',
      }
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Token expired' },
      })
      const caller = createTestCaller(ctx)
      await expect(caller.getMyProfile()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })
  })

  // ── getMyProfile ─────────────────────────────────────────
  describe('getMyProfile', () => {
    it('should return tenant profile data', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      const tenantChain = createMockChain()
      tenantChain.single.mockResolvedValue({
        data: {
          user_id: 'user-1',
          phone: '0501234567',
          id_number: '123456789',
          is_onboarded: true,
          building_id: 'bld-1',
        },
        error: null,
      })
      setupFromMock({ tenant_profiles: tenantChain })

      const result = await caller.getMyProfile()
      expect(result).toEqual({
        user_id: 'user-1',
        phone: '0501234567',
        id_number: '123456789',
        is_onboarded: true,
        building_id: 'bld-1',
      })
    })

    it('should return null when no tenant profile exists', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      const tenantChain = createMockChain()
      tenantChain.single.mockResolvedValue({ data: null, error: null })
      setupFromMock({ tenant_profiles: tenantChain })

      const result = await caller.getMyProfile()
      expect(result).toBeNull()
    })
  })

  // ── updateProfile ────────────────────────────────────────
  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      const profilesChain = createMockChain()
      makeThenable(profilesChain)
      setupFromMock({ profiles: profilesChain })

      const result = await caller.updateProfile({
        fullName: 'Updated Name',
        phone: '0509876543',
        idNumber: '987654321',
      })

      expect(result.success).toBe(true)
      expect(profilesChain.update).toHaveBeenCalledWith({
        full_name: 'Updated Name',
        phone: '0509876543',
        id_number: '987654321',
      })
    })

    it('should handle partial update (only fullName)', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      const profilesChain = createMockChain()
      makeThenable(profilesChain)
      setupFromMock({ profiles: profilesChain })

      const result = await caller.updateProfile({ fullName: 'Only Name' })

      expect(result.success).toBe(true)
      expect(profilesChain.update).toHaveBeenCalledWith({
        full_name: 'Only Name',
        phone: undefined,
        id_number: undefined,
      })
    })

    it('should throw when Supabase update fails', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      const profilesChain = createMockChain()
      makeThenable(profilesChain, { data: null, error: { message: 'DB error' } })
      setupFromMock({ profiles: profilesChain })

      await expect(caller.updateProfile({ fullName: 'Fail' })).rejects.toThrow()
    })
  })

  // ── joinProject ──────────────────────────────────────────
  describe('joinProject', () => {
    it('should join a project with valid invite code', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      const projectsChain = createMockChain()
      projectsChain.single.mockResolvedValue({
        data: { id: 'proj-1', name: 'Silver Castle' },
        error: null,
      })
      const ptChain = makeThenable(createMockChain())
      setupFromMock({ projects: projectsChain, project_tenants: ptChain })

      const result = await caller.joinProject({ inviteCode: 'ABC123' })

      expect(result.projectId).toBe('proj-1')
      expect(result.projectName).toBe('Silver Castle')
    })

    it('should throw NOT_FOUND for invalid invite code', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      const projectsChain = createMockChain()
      projectsChain.single.mockResolvedValue({
        data: null,
        error: { message: 'not found' },
      })
      setupFromMock({ projects: projectsChain })

      await expect(caller.joinProject({ inviteCode: 'BADCOD' }))
        .rejects.toMatchObject({ code: 'NOT_FOUND' })
    })

    it('should reject invite code with wrong length (Zod validation)', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      await expect(caller.joinProject({ inviteCode: 'AB' }))
        .rejects.toThrow()
    })

    it('should throw INTERNAL_SERVER_ERROR when upsert fails', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      const projectsChain = createMockChain()
      projectsChain.single.mockResolvedValue({
        data: { id: 'proj-1', name: 'Project' },
        error: null,
      })
      const ptChain = makeThenable(createMockChain(), { data: null, error: { message: 'Unique constraint violation' } })
      setupFromMock({ projects: projectsChain, project_tenants: ptChain })

      await expect(caller.joinProject({ inviteCode: 'ABC123' }))
        .rejects.toMatchObject({ code: 'INTERNAL_SERVER_ERROR' })
    })
  })

  // ── saveProfile ──────────────────────────────────────────
  describe('saveProfile', () => {
    const validSaveInput = {
      idNumber: '123456789',
      phone: '0501234567',
      city: 'Tel Aviv',
      street: 'Rothschild',
      buildingNumber: '42',
      floor: 3,
      apartmentNumber: '12',
      apartmentSqm: 80,
      isOwner: true,
    }

    it('should save profile and create building if not exists', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      const buildingsChain = createMockChain()
      // First call: maybeSingle for existing building (not found)
      buildingsChain.maybeSingle.mockResolvedValue({ data: null, error: null })
      // Second call: insert + select + single for new building
      buildingsChain.single.mockResolvedValue({ data: { id: 'bld-new' }, error: null })

      const tenantChain = makeThenable(createMockChain())

      // For building group handling
      const bgChain = createMockChain()
      bgChain.maybeSingle.mockResolvedValue({ data: null, error: null })

      setupFromMock({
        buildings: buildingsChain,
        tenant_profiles: tenantChain,
        building_groups: bgChain,
      })

      const result = await caller.saveProfile(validSaveInput)
      expect(result.ok).toBe(true)
    })

    it('should use existing building if found', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      const buildingsChain = createMockChain()
      buildingsChain.maybeSingle.mockResolvedValue({ data: { id: 'bld-existing' }, error: null })

      const tenantChain = makeThenable(createMockChain())

      const bgChain = createMockChain()
      bgChain.maybeSingle.mockResolvedValue({ data: null, error: null })

      setupFromMock({
        buildings: buildingsChain,
        tenant_profiles: tenantChain,
        building_groups: bgChain,
      })

      const result = await caller.saveProfile(validSaveInput)
      expect(result.ok).toBe(true)
      // insert should NOT have been called on buildings (existing one was found)
      expect(buildingsChain.insert).not.toHaveBeenCalled()
    })

    it('should throw when tenant_profiles upsert fails', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      const buildingsChain = createMockChain()
      buildingsChain.maybeSingle.mockResolvedValue({ data: { id: 'bld-1' }, error: null })

      const tenantChain = makeThenable(createMockChain(), { data: null, error: { message: 'DB error' } })

      setupFromMock({
        buildings: buildingsChain,
        tenant_profiles: tenantChain,
      })

      await expect(caller.saveProfile(validSaveInput))
        .rejects.toMatchObject({ code: 'INTERNAL_SERVER_ERROR' })
    })

    it('should reject idNumber with wrong length (Zod validation)', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      await expect(caller.saveProfile({
        ...validSaveInput,
        idNumber: '12345', // Must be exactly 9 characters
      })).rejects.toThrow()
    })
  })

  // ── completeOnboarding ───────────────────────────────────
  describe('completeOnboarding', () => {
    it('should complete onboarding successfully', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      const profilesChain = createMockChain()
      makeThenable(profilesChain)
      const tenantChain = makeThenable(createMockChain())

      setupFromMock({ profiles: profilesChain, tenant_profiles: tenantChain })

      const result = await caller.completeOnboarding({
        fullName: 'Test User',
        idNumber: '123456789',
        phone: '0501234567',
        unitId: 'unit-1',
        isOwner: true,
      })

      expect(result.success).toBe(true)
      expect(profilesChain.update).toHaveBeenCalledWith({
        full_name: 'Test User',
        phone: '0501234567',
        id_number: '123456789',
      })
    })

    it('should reject without token', async () => {
      const ctx = createPublicContext()
      const caller = createTestCaller(ctx)

      await expect(caller.completeOnboarding({
        fullName: 'Test', idNumber: '123', phone: '050',
        unitId: 'u', isOwner: true,
      })).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })
  })

  // ── signDocument ─────────────────────────────────────────
  describe('signDocument', () => {
    it('should sign a document successfully', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      const signaturesChain = makeThenable(createMockChain())
      setupFromMock({ signatures: signaturesChain })

      const result = await caller.signDocument({ docId: 'doc-1' })
      expect(result.success).toBe(true)
      expect(result.signedAt).toBeDefined()
    })
  })

  // ── requestOTP ───────────────────────────────────────────
  describe('requestOTP', () => {
    it('should return sent: true', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      const result = await caller.requestOTP()
      expect(result.sent).toBe(true)
    })

    it('should reject without token', async () => {
      const ctx = createPublicContext()
      const caller = createTestCaller(ctx)

      await expect(caller.requestOTP()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })
  })

  // ── updateApartmentProfile ───────────────────────────────
  describe('updateApartmentProfile', () => {
    it('should update apartment profile successfully', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      const tenantChain = makeThenable(createMockChain())
      setupFromMock({ tenant_profiles: tenantChain })

      const result = await caller.updateApartmentProfile({
        floor: 5,
        apartmentNumber: '12A',
        rooms: 4,
        ownershipType: 'owner',
      })

      expect(result.success).toBe(true)
    })

    it('should reject invalid ownershipType (Zod enum)', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      await expect(caller.updateApartmentProfile({
        ownershipType: 'squatter' as unknown as 'owner', // intentionally invalid to test Zod
      })).rejects.toThrow()
    })
  })

  // ── getMyRole ────────────────────────────────────────────
  describe('getMyRole', () => {
    it('should return role information', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      const profilesChain = createMockChain()
      profilesChain.single.mockResolvedValue({
        data: {
          is_building_representative: true,
          representative_building_id: 'bld-1',
          full_name: 'Rep User',
        },
        error: null,
      })
      setupFromMock({ profiles: profilesChain })

      const result = await caller.getMyRole()
      expect(result.isRepresentative).toBe(true)
      expect(result.buildingId).toBe('bld-1')
      expect(result.fullName).toBe('Rep User')
    })

    it('should return defaults when no profile found', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      const profilesChain = createMockChain()
      profilesChain.single.mockResolvedValue({ data: null, error: null })
      setupFromMock({ profiles: profilesChain })

      const result = await caller.getMyRole()
      expect(result.isRepresentative).toBe(false)
      expect(result.buildingId).toBeNull()
      expect(result.fullName).toBeNull()
    })
  })

  // ── getChatMessages ──────────────────────────────────────
  describe('getChatMessages', () => {
    it('should reject non-member access', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      const bgmChain = createMockChain()
      bgmChain.maybeSingle.mockResolvedValue({ data: null, error: null })
      setupFromMock({ building_group_members: bgmChain })

      await expect(caller.getChatMessages({ groupId: 'grp-1' }))
        .rejects.toMatchObject({ code: 'FORBIDDEN' })
    })

    it('should return messages for group member', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      const bgmChain = createMockChain()
      bgmChain.maybeSingle.mockResolvedValue({ data: { user_id: 'user-1' }, error: null })

      const messagesChain = makeThenable(createMockChain(), {
        data: [
          { id: 'msg-1', content: 'Hello', message_type: 'text', sender_id: 'user-1', created_at: '2024-01-01' },
        ],
        error: null,
      })

      setupFromMock({
        building_group_members: bgmChain,
        group_messages: messagesChain,
      })

      const result = await caller.getChatMessages({ groupId: 'grp-1' })
      expect(result).toHaveLength(1)
      expect(result[0].content).toBe('Hello')
    })
  })

  // ── sendChatMessage ──────────────────────────────────────
  describe('sendChatMessage', () => {
    it('should reject non-member', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      const bgmChain = createMockChain()
      bgmChain.maybeSingle.mockResolvedValue({ data: null, error: null })
      setupFromMock({ building_group_members: bgmChain })

      await expect(caller.sendChatMessage({ groupId: 'grp-1', content: 'Hi' }))
        .rejects.toMatchObject({ code: 'FORBIDDEN' })
    })

    it('should reject empty content (Zod min(1))', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      await expect(caller.sendChatMessage({ groupId: 'grp-1', content: '' }))
        .rejects.toThrow()
    })

    it('should send message successfully', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      const bgmChain = createMockChain()
      bgmChain.maybeSingle.mockResolvedValue({ data: { user_id: 'user-1' }, error: null })

      const gmChain = makeThenable(createMockChain())

      setupFromMock({
        building_group_members: bgmChain,
        group_messages: gmChain,
      })

      const result = await caller.sendChatMessage({ groupId: 'grp-1', content: 'Hello!' })
      expect(result.ok).toBe(true)
    })
  })
})
