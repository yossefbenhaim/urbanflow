import { z } from 'zod'
import { router, protectedProcedure, publicProcedure } from '../middleware/auth'
import { TRPCError } from '@trpc/server'

interface ValidationResult {
  request_type: string
  requested_value: string
  validation_result: 'possible' | 'unlikely' | 'not_possible' | 'needs_review'
  explanation: string
}

interface MunicipalityOutline {
  city: string
  max_floors?: number
  sukkah_balcony_allowed?: boolean
  parking_required_per_unit?: number
  [key: string]: unknown
}

function validateSingleExpectation(
  requestType: string,
  requestedValue: string,
  outline: MunicipalityOutline
): ValidationResult {
  const value = requestedValue.trim()
  const numValue = parseFloat(value)

  switch (requestType) {
    case 'floor': {
      if (!isNaN(numValue) && outline.max_floors) {
        if (numValue > outline.max_floors) {
          return {
            request_type: requestType,
            requested_value: value,
            validation_result: 'not_possible',
            explanation: `המתווה מאפשר עד ${outline.max_floors} קומות. הבקשה לקומה ${Math.floor(numValue)} לא אפשרית.`,
          }
        }
        if (numValue > outline.max_floors * 0.85) {
          return {
            request_type: requestType,
            requested_value: value,
            validation_result: 'unlikely',
            explanation: `הקומות הגבוהות (${Math.floor(numValue)} מתוך ${outline.max_floors}) נדירות ותלויות בתכנון. סביר שיהיה קשה לקבל.`,
          }
        }
        return {
          request_type: requestType,
          requested_value: value,
          validation_result: 'possible',
          explanation: `קומה ${Math.floor(numValue)} אפשרית לפי המתווה (עד ${outline.max_floors} קומות).`,
        }
      }
      return {
        request_type: requestType,
        requested_value: value,
        validation_result: 'needs_review',
        explanation: 'לא ניתן לבדוק — אין מידע על מספר קומות מקסימלי במתווה.',
      }
    }

    case 'sukkah':
    case 'balcony': {
      const wantsSukkah = value.includes('סוכה') || requestType === 'sukkah'
      if (wantsSukkah) {
        if (outline.sukkah_balcony_allowed) {
          return {
            request_type: requestType,
            requested_value: value,
            validation_result: 'possible',
            explanation: 'מרפסת סוכה מותרת לפי המתווה העירוני.',
          }
        }
        return {
          request_type: requestType,
          requested_value: value,
          validation_result: 'not_possible',
          explanation: 'מרפסת סוכה לא מותרת לפי המתווה העירוני באזור זה.',
        }
      }
      return {
        request_type: requestType,
        requested_value: value,
        validation_result: 'possible',
        explanation: 'מרפסת רגילה כלולה בדרך כלל בכל פרויקט פינוי בינוי.',
      }
    }

    case 'parking': {
      const wantsDouble = value.includes('כפול') || value.includes('2') || value.includes('שתיים')
      if (wantsDouble) {
        return {
          request_type: requestType,
          requested_value: value,
          validation_result: 'needs_review',
          explanation: 'חניה כפולה תלויה בתכנון האדריכל ובזמינות. דורש בדיקה מול היזם.',
        }
      }
      if ((outline.parking_required_per_unit ?? 0) >= 1) {
        return {
          request_type: requestType,
          requested_value: value,
          validation_result: 'possible',
          explanation: `חניה אחת לפחות מובטחת לפי המתווה (${outline.parking_required_per_unit} ליחידת דיור).`,
        }
      }
      return {
        request_type: requestType,
        requested_value: value,
        validation_result: 'needs_review',
        explanation: 'דורש בדיקה מול היזם.',
      }
    }

    case 'rooms': {
      if (!isNaN(numValue)) {
        if (numValue <= 5) {
          return {
            request_type: requestType,
            requested_value: value,
            validation_result: 'possible',
            explanation: `${Math.floor(numValue)} חדרים — בדרך כלל אפשרי בפרויקטי פינוי בינוי.`,
          }
        }
        if (numValue <= 6) {
          return {
            request_type: requestType,
            requested_value: value,
            validation_result: 'unlikely',
            explanation: `${Math.floor(numValue)} חדרים — זה גודל גדול ותלוי בזכויות הבנייה שיאושרו.`,
          }
        }
        return {
          request_type: requestType,
          requested_value: value,
          validation_result: 'not_possible',
          explanation: `${Math.floor(numValue)} חדרים — לא סביר בפרויקט פינוי בינוי סטנדרטי.`,
        }
      }
      return {
        request_type: requestType,
        requested_value: value,
        validation_result: 'needs_review',
        explanation: 'דורש בדיקה מול התכנון.',
      }
    }

    case 'sqm': {
      if (!isNaN(numValue)) {
        if (numValue <= 120) {
          return {
            request_type: requestType,
            requested_value: value,
            validation_result: 'possible',
            explanation: `${Math.floor(numValue)} מ"ר — גודל סביר לדירת פינוי בינוי.`,
          }
        }
        if (numValue <= 150) {
          return {
            request_type: requestType,
            requested_value: value,
            validation_result: 'unlikely',
            explanation: `${Math.floor(numValue)} מ"ר — גודל גדול, תלוי בזכויות הבנייה ובמו"מ.`,
          }
        }
        return {
          request_type: requestType,
          requested_value: value,
          validation_result: 'not_possible',
          explanation: `${Math.floor(numValue)} מ"ר — לא סביר בפינוי בינוי סטנדרטי.`,
        }
      }
      return {
        request_type: requestType,
        requested_value: value,
        validation_result: 'needs_review',
        explanation: 'דורש בדיקה מול תכנון.',
      }
    }

    default:
      return {
        request_type: requestType,
        requested_value: value,
        validation_result: 'needs_review',
        explanation: 'סוג הבקשה לא מוכר — דורש בדיקה ידנית.',
      }
  }
}

export const validationRouter = router({
  getMunicipalityOutline: publicProcedure
    .input(z.object({ city: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('municipality_outlines')
        .select('*')
        .eq('city', input.city)
        .maybeSingle()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  getMunicipalityOutlines: publicProcedure
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from('municipality_outlines')
        .select('*')
        .order('city')
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  validateExpectations: protectedProcedure
    .input(z.object({
      userId: z.string().uuid(),
      apartmentId: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Get tenant profile + building city
      const { data: profile, error: profileErr } = await ctx.supabase
        .from('tenant_profiles')
        .select('id, special_requests, building_id, buildings(city)')
        .eq('user_id', input.userId)
        .maybeSingle()

      if (profileErr || !profile) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'פרופיל דייר לא נמצא',
        })
      }

      const city = (profile.buildings as { city?: string } | null)?.city
      if (!city) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'לא נמצאה עיר עבור הבניין שלך',
        })
      }

      // 2. Get municipality outline
      const { data: outline } = await ctx.supabase
        .from('municipality_outlines')
        .select('*')
        .eq('city', city)
        .maybeSingle()

      if (!outline) {
        return {
          city,
          outline: null,
          validations: [],
          message: 'אין מתווה עירוני זמין עבור עיר זו. הבדיקה לא יכולה להתבצע כרגע.',
        }
      }

      // 3. Parse special_requests
      const specialRequests = profile.special_requests
      if (!specialRequests || specialRequests.trim() === '') {
        return {
          city,
          outline,
          validations: [],
          message: 'לא הוזנו ציפיות מיוחדות. מלא את הציפיות שלך בפרופיל.',
        }
      }

      // Parse requests — support both JSON array and free text
      let requests: { type: string; value: string }[] = []
      try {
        const parsed = JSON.parse(specialRequests)
        if (Array.isArray(parsed)) {
          requests = parsed.map((r: Record<string, string>) => ({
            type: r.type || r.request_type || 'other',
            value: r.value || r.requested_value || String(r),
          }))
        }
      } catch {
        // Free text — try to extract requests from text
        const text = specialRequests.toLowerCase()
        const patterns: { regex: RegExp; type: string }[] = [
          { regex: /קומה\s*(\d+)/g, type: 'floor' },
          { regex: /(\d+)\s*חדרים/g, type: 'rooms' },
          { regex: /(\d+)\s*מ"ר/g, type: 'sqm' },
          { regex: /מרפסת\s*סוכה/g, type: 'sukkah' },
          { regex: /חניה\s*(כפולה|שתיים|2)/g, type: 'parking' },
          { regex: /חניה/g, type: 'parking' },
          { regex: /מרפסת/g, type: 'balcony' },
        ]

        for (const { regex, type } of patterns) {
          let match
          while ((match = regex.exec(text)) !== null) {
            requests.push({ type, value: match[0] })
          }
        }

        if (requests.length === 0) {
          requests.push({ type: 'other', value: specialRequests })
        }
      }

      // 4. Validate each request
      const validations: ValidationResult[] = requests.map(req =>
        validateSingleExpectation(req.type, req.value, outline)
      )

      // 5. Save validations to DB
      const inserts = validations.map(v => ({
        user_id: input.userId,
        apartment_id: input.apartmentId || null,
        request_type: v.request_type,
        requested_value: v.requested_value,
        validation_result: v.validation_result,
        explanation: v.explanation,
      }))

      if (inserts.length > 0) {
        await ctx.supabase.from('expectation_validations').insert(inserts)
      }

      return { city, outline, validations }
    }),

  getMyValidations: protectedProcedure
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from('expectation_validations')
        .select('*')
        .eq('user_id', ctx.user.id)
        .order('validated_at', { ascending: false })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),
})
