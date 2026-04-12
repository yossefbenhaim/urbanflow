import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://supabase.byclick.co.il'
const SUPABASE_ANON_KEY = 'eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9.eyJyb2xlIjogImFub24iLCAiaXNzIjogInN1cGFiYXNlIiwgImlhdCI6IDE3MDAwMDAwMDAsICJleHAiOiAyMDAwMDAwMDAwfQ.wTmOz3TCdhnx-swY9p2aHf6gvg9zgI0_TLTs8W28Ris'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
