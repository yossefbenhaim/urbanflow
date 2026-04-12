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

  // ── saveProfile with new registration fields ────────────
  describe('saveProfile - new registration fields', () => {
    const baseSaveInput = {
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

    const setupSaveProfileMocks = () => {
      const buildingsChain = createMockChain()
      buildingsChain.maybeSingle.mockResolvedValue({ data: { id: 'bld-1' }, error: null })

      const tenantChain = makeThenable(createMockChain())

      const bgChain = createMockChain()
      bgChain.maybeSingle.mockResolvedValue({ data: null, error: null })

      setupFromMock({
        buildings: buildingsChain,
        tenant_profiles: tenantChain,
        building_groups: bgChain,
      })

      return { buildingsChain, tenantChain, bgChain }
    }

    it('should accept isResiding and residingStatus fields', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)
      const { tenantChain } = setupSaveProfileMocks()

      const result = await caller.saveProfile({
        ...baseSaveInput,
        isResiding: false,
        residingStatus: 'renter',
      })

      expect(result.ok).toBe(true)
      expect(tenantChain.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          is_residing: false,
          residing_status: 'renter',
        }),
        expect.anything(),
      )
    })

    it('should set residing_status to null when isResiding is true', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)
      const { tenantChain } = setupSaveProfileMocks()

      const result = await caller.saveProfile({
        ...baseSaveInput,
        isResiding: true,
        residingStatus: 'renter', // should be ignored
      })

      expect(result.ok).toBe(true)
      expect(tenantChain.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          is_residing: true,
          residing_status: null,
        }),
        expect.anything(),
      )
    })

    it('should accept all residingStatus enum values', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      for (const status of ['renter', 'family_member', 'empty'] as const) {
        resetSupabaseMocks()
        const authedCtx = createAuthenticatedContext('user-1', 'user@example.com')
        const authedCaller = createTestCaller(authedCtx)
        setupSaveProfileMocks()

        const result = await authedCaller.saveProfile({
          ...baseSaveInput,
          isResiding: false,
          residingStatus: status,
        })
        expect(result.ok).toBe(true)
      }
    })

    it('should accept propertyRelation enum values', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)
      const { tenantChain } = setupSaveProfileMocks()

      const result = await caller.saveProfile({
        ...baseSaveInput,
        propertyRelation: 'heir',
      })

      expect(result.ok).toBe(true)
      expect(tenantChain.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          property_relation: 'heir',
        }),
        expect.anything(),
      )
    })

    it('should reject invalid propertyRelation value (Zod validation)', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      await expect(caller.saveProfile({
        ...baseSaveInput,
        propertyRelation: 'squatter' as any,
      })).rejects.toThrow()
    })

    it('should accept all valid propertyRelation enums', async () => {
      for (const relation of ['owner', 'renter', 'heir', 'power_of_attorney'] as const) {
        resetSupabaseMocks()
        const ctx = createAuthenticatedContext('user-1', 'user@example.com')
        const caller = createTestCaller(ctx)
        setupSaveProfileMocks()

        const result = await caller.saveProfile({
          ...baseSaveInput,
          propertyRelation: relation,
        })
        expect(result.ok).toBe(true)
      }
    })

    it('should set ownership_complexity_flag to complex when coOwnersCount > 1', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)
      const { tenantChain } = setupSaveProfileMocks()

      const result = await caller.saveProfile({
        ...baseSaveInput,
        coOwnersCount: 3,
      })

      expect(result.ok).toBe(true)
      expect(tenantChain.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          co_owners_count: 3,
          ownership_complexity_flag: 'complex',
        }),
        expect.anything(),
      )
    })

    it('should set ownership_complexity_flag to simple when coOwnersCount is not provided', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)
      const { tenantChain } = setupSaveProfileMocks()

      const result = await caller.saveProfile(baseSaveInput)

      expect(result.ok).toBe(true)
      expect(tenantChain.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          co_owners_count: 0,
          ownership_complexity_flag: 'simple',
        }),
        expect.anything(),
      )
    })

    it('should reject coOwnersCount less than 2 (Zod min(2))', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      await expect(caller.saveProfile({
        ...baseSaveInput,
        coOwnersCount: 1,
      })).rejects.toThrow()
    })

    it('should accept declarationsAccepted and set timestamp', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)
      const { tenantChain } = setupSaveProfileMocks()

      const result = await caller.saveProfile({
        ...baseSaveInput,
        declarationsAccepted: true,
      })

      expect(result.ok).toBe(true)
      expect(tenantChain.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          declarations_accepted: true,
          declarations_accepted_at: expect.any(String),
        }),
        expect.anything(),
      )
    })

    it('should set declarations_accepted_at to null when declarationsAccepted is false', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)
      const { tenantChain } = setupSaveProfileMocks()

      const result = await caller.saveProfile({
        ...baseSaveInput,
        declarationsAccepted: false,
      })

      expect(result.ok).toBe(true)
      expect(tenantChain.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          declarations_accepted: false,
          declarations_accepted_at: null,
        }),
        expect.anything(),
      )
    })
  })

  // ── addPartner ───────────────────────────────────────────
  describe('addPartner', () => {
    it('should add a partner with fullName and phone', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      const partnersChain = createMockChain()
      partnersChain.single.mockResolvedValue({
        data: { id: 'partner-1', user_id: 'user-1', full_name: 'Partner Name', phone: '0521234567' },
        error: null,
      })
      setupFromMock({ tenant_partners: partnersChain })

      const result = await caller.addPartner({ fullName: 'Partner Name', phone: '0521234567' })
      expect(result).toEqual({
        id: 'partner-1',
        user_id: 'user-1',
        full_name: 'Partner Name',
        phone: '0521234567',
      })
      expect(partnersChain.insert).toHaveBeenCalledWith({
        user_id: 'user-1',
        full_name: 'Partner Name',
        phone: '0521234567',
      })
    })

    it('should throw when insert fails', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      const partnersChain = createMockChain()
      partnersChain.single.mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' },
      })
      setupFromMock({ tenant_partners: partnersChain })

      await expect(caller.addPartner({ fullName: 'Partner', phone: '050' }))
        .rejects.toMatchObject({ code: 'INTERNAL_SERVER_ERROR' })
    })

    it('should reject fullName shorter than 2 characters (Zod min(2))', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      await expect(caller.addPartner({ fullName: 'A', phone: '050' }))
        .rejects.toThrow()
    })

    it('should reject without token', async () => {
      const ctx = createPublicContext()
      const caller = createTestCaller(ctx)

      await expect(caller.addPartner({ fullName: 'Partner', phone: '050' }))
        .rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })
  })

  // ── removePartner ────────────────────────────────────────
  describe('removePartner', () => {
    it('should remove a partner by partnerId', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      const partnersChain = makeThenable(createMockChain())
      setupFromMock({ tenant_partners: partnersChain })

      const result = await caller.removePartner({ partnerId: '550e8400-e29b-41d4-a716-446655440000' })
      expect(result.ok).toBe(true)
      expect(partnersChain.delete).toHaveBeenCalled()
      expect(partnersChain.eq).toHaveBeenCalledWith('id', '550e8400-e29b-41d4-a716-446655440000')
      expect(partnersChain.eq).toHaveBeenCalledWith('user_id', 'user-1')
    })

    it('should throw when delete fails', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      const partnersChain = makeThenable(createMockChain(), { data: null, error: { message: 'Delete failed' } })
      setupFromMock({ tenant_partners: partnersChain })

      await expect(caller.removePartner({ partnerId: '550e8400-e29b-41d4-a716-446655440000' }))
        .rejects.toMatchObject({ code: 'INTERNAL_SERVER_ERROR' })
    })

    it('should reject non-UUID partnerId (Zod uuid())', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      await expect(caller.removePartner({ partnerId: 'not-a-uuid' }))
        .rejects.toThrow()
    })

    it('should reject without token', async () => {
      const ctx = createPublicContext()
      const caller = createTestCaller(ctx)

      await expect(caller.removePartner({ partnerId: '550e8400-e29b-41d4-a716-446655440000' }))
        .rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })
  })

  // ── getPartners ──────────────────────────────────────────
  describe('getPartners', () => {
    it('should return list of partners', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      const partnersChain = makeThenable(createMockChain(), {
        data: [
          { id: 'p-1', user_id: 'user-1', full_name: 'Partner A', phone: '0501111111', created_at: '2024-01-01' },
          { id: 'p-2', user_id: 'user-1', full_name: 'Partner B', phone: '0502222222', created_at: '2024-01-02' },
        ],
        error: null,
      })
      setupFromMock({ tenant_partners: partnersChain })

      const result = await caller.getPartners()
      expect(result).toHaveLength(2)
      expect(result[0].full_name).toBe('Partner A')
      expect(result[1].full_name).toBe('Partner B')
    })

    it('should return empty array when no partners exist', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      const partnersChain = makeThenable(createMockChain(), { data: null, error: null })
      setupFromMock({ tenant_partners: partnersChain })

      const result = await caller.getPartners()
      expect(result).toEqual([])
    })

    it('should reject without token', async () => {
      const ctx = createPublicContext()
      const caller = createTestCaller(ctx)

      await expect(caller.getPartners()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })
  })

  // ── saveCompanion ────────────────────────────────────────
  describe('saveCompanion', () => {
    it('should save companion with fullName and phone', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      const companionChain = createMockChain()
      companionChain.single.mockResolvedValue({
        data: { user_id: 'user-1', full_name: 'Companion Name', phone: '0531234567', role: 'viewer' },
        error: null,
      })
      setupFromMock({ tenant_companions: companionChain })

      const result = await caller.saveCompanion({ fullName: 'Companion Name', phone: '0531234567' })
      expect(result).toEqual({
        user_id: 'user-1',
        full_name: 'Companion Name',
        phone: '0531234567',
        role: 'viewer',
      })
      expect(companionChain.upsert).toHaveBeenCalledWith(
        {
          user_id: 'user-1',
          full_name: 'Companion Name',
          phone: '0531234567',
          role: 'viewer',
        },
        { onConflict: 'user_id' },
      )
    })

    it('should throw when upsert fails', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      const companionChain = createMockChain()
      companionChain.single.mockResolvedValue({
        data: null,
        error: { message: 'Upsert failed' },
      })
      setupFromMock({ tenant_companions: companionChain })

      await expect(caller.saveCompanion({ fullName: 'Companion', phone: '050' }))
        .rejects.toMatchObject({ code: 'INTERNAL_SERVER_ERROR' })
    })

    it('should reject fullName shorter than 2 characters (Zod min(2))', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      await expect(caller.saveCompanion({ fullName: 'X', phone: '050' }))
        .rejects.toThrow()
    })

    it('should reject without token', async () => {
      const ctx = createPublicContext()
      const caller = createTestCaller(ctx)

      await expect(caller.saveCompanion({ fullName: 'Companion', phone: '050' }))
        .rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })
  })

  // ── getCompanion ─────────────────────────────────────────
  describe('getCompanion', () => {
    it('should return companion data', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      const companionChain = createMockChain()
      companionChain.maybeSingle.mockResolvedValue({
        data: { user_id: 'user-1', full_name: 'My Companion', phone: '0541234567', role: 'viewer' },
        error: null,
      })
      setupFromMock({ tenant_companions: companionChain })

      const result = await caller.getCompanion()
      expect(result).toEqual({
        user_id: 'user-1',
        full_name: 'My Companion',
        phone: '0541234567',
        role: 'viewer',
      })
    })

    it('should return null when no companion exists', async () => {
      const ctx = createAuthenticatedContext('user-1', 'user@example.com')
      const caller = createTestCaller(ctx)

      const companionChain = createMockChain()
      companionChain.maybeSingle.mockResolvedValue({ data: null, error: null })
      setupFromMock({ tenant_companions: companionChain })

      const result = await caller.getCompanion()
      expect(result).toBeNull()
    })

    it('should reject without token', async () => {
      const ctx = createPublicContext()
      const caller = createTestCaller(ctx)

      await expect(caller.getCompanion()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })
  })
})
