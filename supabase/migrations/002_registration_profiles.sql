-- Add role, phone, id_number to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS role text CHECK (role IN ('tenant', 'manager', 'provider')),
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS id_number text;

-- Create manager_profiles
CREATE TABLE IF NOT EXISTS public.manager_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text,
  company_registration text,
  role_type text CHECK (role_type IN ('developer', 'lawyer', 'project_manager', 'committee')),
  license_number text,
  phone text,
  city text,
  experience_years integer,
  projects_count text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.manager_profiles ENABLE ROW LEVEL SECURITY;

-- Extend tenant_profiles
ALTER TABLE public.tenant_profiles
  ADD COLUMN IF NOT EXISTS id_number text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS building_number text,
  ADD COLUMN IF NOT EXISTS floor integer,
  ADD COLUMN IF NOT EXISTS apartment_sqm numeric,
  ADD COLUMN IF NOT EXISTS is_owner boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS move_in_year integer,
  ADD COLUMN IF NOT EXISTS invite_code text;

-- Extend provider_profiles
ALTER TABLE public.provider_profiles
  ADD COLUMN IF NOT EXISTS id_number text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS profession_types text[],
  ADD COLUMN IF NOT EXISTS license_authority text,
  ADD COLUMN IF NOT EXISTS license_expiry date,
  ADD COLUMN IF NOT EXISTS experience_years integer,
  ADD COLUMN IF NOT EXISTS pinuy_binuy_experience boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS portfolio_url text,
  ADD COLUMN IF NOT EXISTS past_projects jsonb,
  ADD COLUMN IF NOT EXISTS full_name text;
