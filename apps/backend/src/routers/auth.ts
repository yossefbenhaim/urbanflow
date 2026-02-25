import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../middleware/auth'

export const authRouter = router({

  // ── Sign In ────────────────────────────────────────────────────────────────
  signIn: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(6) }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      })
      if (error) throw new TRPCError({ code: 'UNAUTHORIZED', message: error.message })

      // Fetch role from profiles table
      const { data: profile } = await ctx.supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', data.user.id)
        .single()

      return {
        accessToken: data.session.access_token,
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
    .input(z.object({ email: z.string().email(), password: z.string().min(6) }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.auth.signUp({
        email: input.email,
        password: input.password,
      })
      if (error) throw new TRPCError({ code: 'BAD_REQUEST', message: error.message })
      return {
        accessToken: data.session?.access_token ?? null,
        userId: data.user?.id ?? null,
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
      .select('role, full_name, phone, id_number')
      .eq('id', ctx.user.id)
      .single()

    return {
      id: ctx.user.id,
      email: ctx.user.email!,
      role: profile?.role ?? null,
      fullName: profile?.full_name ?? null,
      phone: profile?.phone ?? null,
      idNumber: profile?.id_number ?? null,
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
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.auth.signUp({ email: input.email, password: input.password })
      if (error || !data.user) throw new TRPCError({ code: 'BAD_REQUEST', message: error?.message ?? 'שגיאה בהרשמה' })
      const userId = data.user.id
      await ctx.supabase.from('profiles').upsert({
        id: userId, full_name: input.fullName, email: input.email,
        phone: input.phone, id_number: input.idNumber, role: 'tenant',
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
      return { accessToken: data.session?.access_token ?? null, userId }
    }),

  // ── Register Manager ───────────────────────────────────────────────────────
  registerManager: publicProcedure
    .input(z.object({
      email: z.string().email(), password: z.string().min(6),
      fullName: z.string(), phone: z.string(), idNumber: z.string(),
      company: z.string(), licenseNumber: z.string().optional(),
      yearsExperience: z.number().optional(), specializations: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.auth.signUp({ email: input.email, password: input.password })
      if (error || !data.user) throw new TRPCError({ code: 'BAD_REQUEST', message: error?.message ?? 'שגיאה בהרשמה' })
      const userId = data.user.id
      await ctx.supabase.from('profiles').upsert({
        id: userId, full_name: input.fullName, email: input.email,
        phone: input.phone, id_number: input.idNumber, role: 'manager',
      }, { onConflict: 'id' })
      await ctx.supabase.from('manager_profiles').upsert({
        id: userId, company: input.company,
        license_number: input.licenseNumber,
        years_experience: input.yearsExperience,
        specializations: input.specializations,
      }, { onConflict: 'id' })
      return { accessToken: data.session?.access_token ?? null, userId }
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
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.auth.signUp({ email: input.email, password: input.password })
      if (error || !data.user) throw new TRPCError({ code: 'BAD_REQUEST', message: error?.message ?? 'שגיאה בהרשמה' })
      const userId = data.user.id
      await ctx.supabase.from('profiles').upsert({
        id: userId, full_name: input.fullName, email: input.email,
        phone: input.phone, id_number: input.idNumber, role: 'provider',
      }, { onConflict: 'id' })
      await ctx.supabase.from('provider_profiles').upsert({
        id: userId, company: input.company, bio: input.bio || '',
        service_types: input.serviceTypes, operating_regions: input.operatingRegions,
        license_number: input.licenseNumber, website: input.website,
        years_experience: input.yearsExperience, portfolio_urls: input.portfolioUrls,
      }, { onConflict: 'id' })
      return { accessToken: data.session?.access_token ?? null, userId }
    }),
})
