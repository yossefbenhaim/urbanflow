import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../middleware/auth'
import { sendEmail } from '../emails/emailService'
import { findOrCreateBuilding, handleBuildingGroup } from './tenant'
import { logger } from '../logger'

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
  // Generate recovery link via admin API and send it using our HTML template
  // instead of Supabase's default email. Silently returns success for unknown
  // emails to avoid leaking which addresses are registered.
  resetPassword: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const siteUrl = process.env.SITE_URL || 'https://urbanflow.byclick.co.il'
      const { data, error } = await ctx.supabase.auth.admin.generateLink({
        type: 'recovery',
        email: input.email,
        options: { redirectTo: `${siteUrl}/reset-password` },
      })
      if (error || !data?.properties?.action_link) {
        return { sent: true }
      }
      const { data: profile } = await ctx.supabase
        .from('profiles')
        .select('full_name')
        .eq('email', input.email)
        .maybeSingle()
      void sendEmail('passwordReset', input.email, {
        userName: profile?.full_name || input.email,
        userEmail: input.email,
        resetUrl: data.properties.action_link,
      })
      return { sent: true }
    }),

  // ── Register Tenant ────────────────────────────────────────────────────────
  registerTenant: publicProcedure
    .input(z.object({
      email: z.string().email(), password: z.string().min(6),
      fullName: z.string(), phone: z.string(), idNumber: z.string(),
      city: z.string(), street: z.string(), buildingNumber: z.string(),
      apartmentNumber: z.string(),
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

      const buildingId = await findOrCreateBuilding(ctx.supabase, input.city, input.street, input.buildingNumber)

      await ctx.supabase.from('tenant_profiles').upsert({
        user_id: userId, phone: input.phone, id_number: input.idNumber,
        address: `${input.street} ${input.buildingNumber}, ${input.city}`,
        building_number: input.buildingNumber,
        apartment_number: input.apartmentNumber,
        floor: input.floor ? parseInt(input.floor) : null,
        apartment_sqm: input.apartmentSqm ? parseFloat(input.apartmentSqm) : null,
        is_owner: input.isOwner,
        move_in_year: input.moveInYear ? parseInt(input.moveInYear) : null,
        invite_code: input.inviteCode || null, is_onboarded: true,
        building_id: buildingId,
      }, { onConflict: 'user_id' })

      // If building already belongs to an active project, auto-join the tenant.
      const { data: buildingRow } = await ctx.supabase
        .from('buildings').select('project_id').eq('id', buildingId).maybeSingle()
      const projectId = (buildingRow as { project_id?: string | null } | null)?.project_id ?? null
      if (projectId) {
        await ctx.supabase.from('project_tenants')
          .upsert({ project_id: projectId, tenant_id: userId, status: 'active' }, { onConflict: 'project_id,tenant_id' })
      }

      try { await handleBuildingGroup(ctx.supabase, buildingId, userId) }
      catch (e) { logger.error({ err: e }, '[registerTenant] handleBuildingGroup failed') }

      void sendEmail('welcome', input.email, { userName: input.fullName, userEmail: input.email })
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
      void sendEmail('welcome', input.email, { userName: input.fullName, userEmail: input.email })
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
      void sendEmail('welcome', input.email, { userName: input.fullName, userEmail: input.email })
      return { accessToken: data.session?.access_token ?? null,
        refreshToken: data.session?.refresh_token ?? null, userId }
    }),

  // ── Delete My Account ──────────────────────────────────────────────────────
  // Permanently removes the current user: deletes rows from all tables that
  // reference the user (incl. tables without ON DELETE CASCADE), then deletes
  // the auth.users row which cascades remaining role-specific profiles.
  // Requires the user to type their email for confirmation.
  deleteMyAccount: protectedProcedure
    .input(z.object({ confirmEmail: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const userEmail = ctx.user.email ?? ''

      if (input.confirmEmail.trim().toLowerCase() !== userEmail.toLowerCase()) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'האימייל שהוזן לא תואם לאימייל שלך' })
      }

      const db = ctx.supabase

      // Nullify nullable refs first (keep row, just disassociate)
      await db.from('contract_approvals').update({ approved_by: null }).eq('approved_by', userId)
      await db.from('developer_project_proposals').update({ reviewer_id: null }).eq('reviewer_id', userId)
      await db.from('provider_ratings').update({ submitted_by: null }).eq('submitted_by', userId)
      await db.from('provider_insights_uploads').update({ admin_reviewer_id: null }).eq('admin_reviewer_id', userId)
      await db.from('tenders').update({ winner_id: null }).eq('winner_id', userId)

      // Delete rows in tables without ON DELETE CASCADE (NOT NULL refs)
      await db.from('negotiation_rounds').delete().eq('created_by', userId)
      await db.from('tender_proposals').delete().eq('provider_id', userId)
      await db.from('tenders').delete().eq('created_by', userId)
      await db.from('match_proposals').delete().or(`sender_id.eq.${userId},target_id.eq.${userId}`)
      await db.from('tender_meetings').delete().or(`reporter_id.eq.${userId},counterpart_id.eq.${userId}`)
      await db.from('meeting_summaries').delete().eq('uploaded_by', userId)
      await db.from('meeting_date_polls').delete().eq('proposer_id', userId)
      await db.from('project_tasks').delete().eq('created_by', userId)
      await db.from('tenant_documents').delete().eq('user_id', userId)
      await db.from('ownership_documents').delete().eq('user_id', userId)
      await db.from('election_forms').delete().eq('user_id', userId)

      // Finally delete the auth user — cascades:
      //   profiles → tenant/provider/manager/lawyer/architect/appraiser/developer_profiles
      //   provider_match_preferences, provider_ratings, provider_notifications,
      //   inspections, apartment_wishes, tenant_partners, tenant_companions,
      //   meeting_date_votes, contract_assignments, legal_opinions,
      //   provider_insights_uploads, developer_project_proposals, developer_bids
      const { error } = await db.auth.admin.deleteUser(userId)
      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `שגיאה במחיקת החשבון: ${error.message}`,
        })
      }

      return { success: true }
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

      // Detect first-time OAuth completion. A profiles row is auto-created
      // by Supabase's on_auth_user_created trigger, so row existence is not
      // a reliable signal. Instead, check if role was set — the role column
      // is only populated here in completeOAuthProfile.
      const { data: existingProfile } = await ctx.supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle()
      const isFirstCompletion = !existingProfile?.role

      const { error } = await ctx.supabase.from('profiles').upsert({
        id: userId,
        full_name: input.fullName,
        email,
        role: input.role,
      }, { onConflict: 'id' })

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Create role-specific sub-profile only if one doesn't already exist,
      // so returning OAuth users don't wipe data saved in their onboarding.
      if (input.role === 'tenant') {
        const { data: exists } = await ctx.supabase.from('tenant_profiles')
          .select('user_id').eq('user_id', userId).maybeSingle()
        if (!exists) {
          await ctx.supabase.from('tenant_profiles').insert({
            user_id: userId, phone: '', id_number: '',
          })
        }
      } else if (input.role === 'manager' || input.role === 'organizer') {
        const { data: exists } = await ctx.supabase.from('manager_profiles')
          .select('id').eq('id', userId).maybeSingle()
        if (!exists) {
          await ctx.supabase.from('manager_profiles').insert({
            id: userId, company_name: '',
          })
        }
      } else if (input.role === 'provider') {
        const { data: exists } = await ctx.supabase.from('provider_profiles')
          .select('id').eq('id', userId).maybeSingle()
        if (!exists) {
          await ctx.supabase.from('provider_profiles').insert({
            id: userId, bio: '', service_types: [], operating_regions: [],
          })
        }
      }

      if (isFirstCompletion) {
        void sendEmail('welcome', email, {
          userName: input.fullName || email,
          userEmail: email,
        })
      }

      return { success: true, role: input.role }
    }),
})
