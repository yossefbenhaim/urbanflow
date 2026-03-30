import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../middleware/auth'

const deviceInfoSchema = z.object({
  user_agent: z.string(),
  screen_width: z.number(),
  screen_height: z.number(),
  platform: z.string(),
  registered_at: z.string(),
}).optional()

export const authRouter = router({

  // ── Sign In ────────────────────────────────────────────────────────────────
  signIn: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(6),
      deviceInfo: deviceInfoSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      })
      if (error) throw new TRPCError({ code: 'UNAUTHORIZED', message: error.message })

      // Save device info if provided and not yet saved
      if (input.deviceInfo) {
        const { data: existingProfile } = await ctx.supabase
          .from('profiles')
          .select('original_device')
          .eq('id', data.user.id)
          .single()
        if (existingProfile && !existingProfile.original_device) {
          await ctx.supabase
            .from('profiles')
            .update({ original_device: input.deviceInfo })
            .eq('id', data.user.id)
        }
      }

      // Fetch role from profiles table
      const { data: profile } = await ctx.supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', data.user.id)
        .single()

      return {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        user: {
          id: data.user.id,
          email: data.user.email!,
          role: profile?.role ?? null,
          fullName: profile?.full_name ?? null,
        },
      }
    }),

  // ── Sign Up ────────────────────────────────────────────────────────────────
  signUp: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(6),
      deviceInfo: deviceInfoSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.auth.signUp({
        email: input.email,
        password: input.password,
      })
      if (error) throw new TRPCError({ code: 'BAD_REQUEST', message: error.message })

      // Save device info for new user
      if (data.user?.id && input.deviceInfo) {
        await ctx.supabase
          .from('profiles')
          .update({ original_device: input.deviceInfo })
          .eq('id', data.user.id)
      }

      return {
        accessToken: data.session?.access_token ?? null,
        refreshToken: data.session?.refresh_token ?? null,
        userId: data.user?.id ?? null,
      }
    }),


  // ── Refresh Token ────────────────────────────────────────────────────────
  refreshToken: publicProcedure
    .input(z.object({ refreshToken: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.auth.refreshSession({ refresh_token: input.refreshToken })
      if (error || !data.session) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Refresh token invalid' })
      }
      return {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      }
    }),

  // ── Sign Out ───────────────────────────────────────────────────────────────
  signOut: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.supabase.auth.admin.signOut(ctx.token!)
    return { success: true }
  }),

  // ── Me (current user + role) ───────────────────────────────────────────────
  me: protectedProcedure.query(async ({ ctx }) => {
    const { data: profile } = await ctx.supabase
      .from('profiles')
      .select('role, full_name, phone, id_number, is_building_representative')
      .eq('id', ctx.user.id)
      .single()

    return {
      id: ctx.user.id,
      email: ctx.user.email!,
      role: profile?.role ?? null,
      fullName: profile?.full_name ?? null,
      phone: profile?.phone ?? null,
      idNumber: profile?.id_number ?? null,
      isBuildingRepresentative: profile?.is_building_representative ?? false,
    }
  }),

  // ── Reset Password ─────────────────────────────────────────────────────────
  resetPassword: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase.auth.resetPasswordForEmail(input.email)
      if (error) throw new TRPCError({ code: 'BAD_REQUEST', message: error.message })
      return { sent: true }
    }),

  // ── Register Tenant ────────────────────────────────────────────────────────
  registerTenant: publicProcedure
    .input(z.object({
      email: z.string().email(), password: z.string().min(6),
      fullName: z.string(), phone: z.string(), idNumber: z.string(),
      city: z.string(), street: z.string(), buildingNumber: z.string(),
      floor: z.string().optional(), apartmentSqm: z.string().optional(),
      isOwner: z.boolean(), moveInYear: z.string().optional(),
      inviteCode: z.string().optional(),
      deviceInfo: deviceInfoSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.auth.signUp({ email: input.email, password: input.password })
      if (error || !data.user) throw new TRPCError({ code: 'BAD_REQUEST', message: error?.message ?? 'שגיאה בהרשמה' })
      const userId = data.user.id
      await ctx.supabase.from('profiles').upsert({
        id: userId, full_name: input.fullName, email: input.email,
        phone: input.phone, id_number: input.idNumber, role: 'tenant',
        ...(input.deviceInfo ? { original_device: input.deviceInfo } : {}),
      }, { onConflict: 'id' })
      await ctx.supabase.from('tenant_profiles').upsert({
        user_id: userId, phone: input.phone, id_number: input.idNumber,
        address: `${input.street} ${input.buildingNumber}, ${input.city}`,
        building_number: input.buildingNumber,
        floor: input.floor ? parseInt(input.floor) : null,
        apartment_sqm: input.apartmentSqm ? parseFloat(input.apartmentSqm) : null,
        is_owner: input.isOwner,
        move_in_year: input.moveInYear ? parseInt(input.moveInYear) : null,
        invite_code: input.inviteCode || null, is_onboarded: true,
      }, { onConflict: 'user_id' })
      return { accessToken: data.session?.access_token ?? null,
        refreshToken: data.session?.refresh_token ?? null, userId }
    }),

  // ── Register Manager ───────────────────────────────────────────────────────
  registerManager: publicProcedure
    .input(z.object({
      email: z.string().email(), password: z.string().min(6),
      fullName: z.string(), phone: z.string(), idNumber: z.string(),
      company: z.string(), licenseNumber: z.string().optional(),
      yearsExperience: z.number().optional(), specializations: z.array(z.string()).optional(),
      deviceInfo: deviceInfoSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.auth.signUp({ email: input.email, password: input.password })
      if (error || !data.user) throw new TRPCError({ code: 'BAD_REQUEST', message: error?.message ?? 'שגיאה בהרשמה' })
      const userId = data.user.id
      await ctx.supabase.from('profiles').upsert({
        id: userId, full_name: input.fullName, email: input.email,
        phone: input.phone, id_number: input.idNumber, role: 'manager',
        ...(input.deviceInfo ? { original_device: input.deviceInfo } : {}),
      }, { onConflict: 'id' })
      await ctx.supabase.from('manager_profiles').upsert({
        id: userId, company: input.company,
        license_number: input.licenseNumber,
        years_experience: input.yearsExperience,
        specializations: input.specializations,
      }, { onConflict: 'id' })
      return { accessToken: data.session?.access_token ?? null,
        refreshToken: data.session?.refresh_token ?? null, userId }
    }),

  // ── Register Provider ──────────────────────────────────────────────────────
  registerProvider: publicProcedure
    .input(z.object({
      email: z.string().email(), password: z.string().min(6),
      fullName: z.string(), phone: z.string(), idNumber: z.string(),
      company: z.string().optional(), serviceTypes: z.array(z.string()),
      operatingRegions: z.array(z.string()), bio: z.string().optional(),
      licenseNumber: z.string().optional(), website: z.string().optional(),
      yearsExperience: z.number().optional(), portfolioUrls: z.array(z.string()).optional(),
      deviceInfo: deviceInfoSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.auth.signUp({ email: input.email, password: input.password })
      if (error || !data.user) throw new TRPCError({ code: 'BAD_REQUEST', message: error?.message ?? 'שגיאה בהרשמה' })
      const userId = data.user.id
      await ctx.supabase.from('profiles').upsert({
        id: userId, full_name: input.fullName, email: input.email,
        phone: input.phone, id_number: input.idNumber, role: 'provider',
        ...(input.deviceInfo ? { original_device: input.deviceInfo } : {}),
      }, { onConflict: 'id' })
      await ctx.supabase.from('provider_profiles').upsert({
        id: userId, company: input.company, bio: input.bio || '',
        service_types: input.serviceTypes, operating_regions: input.operatingRegions,
        license_number: input.licenseNumber, website: input.website,
        years_experience: input.yearsExperience, portfolio_urls: input.portfolioUrls,
      }, { onConflict: 'id' })
      return { accessToken: data.session?.access_token ?? null,
        refreshToken: data.session?.refresh_token ?? null, userId }
    }),

  // ── Complete OAuth Profile ─────────────────────────────────────────────────
  completeOAuthProfile: protectedProcedure
    .input(z.object({
      fullName: z.string().min(1).optional(),
      role: z.enum(['tenant', 'manager', 'organizer', 'provider']),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const email = ctx.user.email!

      const { error } = await ctx.supabase.from('profiles').upsert({
        id: userId,
        full_name: input.fullName,
        email,
        role: input.role,
      }, { onConflict: 'id' })

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true, role: input.role }
    }),
})
