-- DI2: Apartment Wishes / Expectations Form
-- Stores tenant preferences for their new apartment in the Pinui Binui project

CREATE TABLE IF NOT EXISTS apartment_wishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic info (auto-filled from profile where possible)
  full_name TEXT,
  id_number TEXT,
  phone TEXT,
  email TEXT,
  apartment_number TEXT,
  current_floor INT,

  -- Current apartment type
  current_type TEXT CHECK (current_type IN ('regular', 'garden', 'penthouse', 'duplex', 'other')),
  current_type_other TEXT,

  -- What tenant currently has (array of features)
  current_features TEXT[] DEFAULT '{}',
  current_features_other TEXT,

  -- Tabu match
  tabu_match BOOLEAN,
  tabu_mismatch_details TEXT,

  -- Floor preference
  floor_preference TEXT CHECK (floor_preference IN ('same', 'up', 'down', 'any')),
  floor_change_amount INT,

  -- Size preference
  size_preference TEXT CHECK (size_preference IN ('same', 'bigger', 'smaller', 'any')),

  -- Rooms preference
  rooms_preference TEXT CHECK (rooms_preference IN ('same', 'add', 'remove', 'any')),

  -- Air directions
  air_directions TEXT CHECK (air_directions IN ('same', 'important', 'any')),

  -- Desired apartment type
  desired_type TEXT CHECK (desired_type IN ('regular', 'garden', 'penthouse', 'duplex', 'split_two', 'premium', 'any')),

  -- Standard additions (JSONB for flexibility)
  -- { mamad: { want: bool, sqm: number }, balcony: { want: bool, sqm: number }, ... }
  standard_additions JSONB DEFAULT '{}',

  -- Extra additions (array)
  extra_additions TEXT[] DEFAULT '{}',
  extra_additions_other TEXT,

  -- Interior planning
  wants_interior_changes BOOLEAN DEFAULT false,
  interior_changes TEXT[] DEFAULT '{}',
  interior_changes_other TEXT,

  -- Ceiling height
  ceiling_height TEXT CHECK (ceiling_height IN ('standard', 'high')),
  ceiling_height_meters NUMERIC(3,1),

  -- Parking current & desired
  parking_current TEXT CHECK (parking_current IN ('none', 'one', 'two')),
  parking_desired TEXT CHECK (parking_desired IN ('none', 'one', 'two')),

  -- Balconies current & desired
  balcony_current TEXT CHECK (balcony_current IN ('none', 'regular', 'sukkah', 'large')),
  balcony_desired TEXT CHECK (balcony_desired IN ('none', 'regular', 'sukkah', 'large')),

  -- Garden / roof
  garden_roof_preference TEXT CHECK (garden_roof_preference IN ('garden', 'roof', 'any')),

  -- Building preferences (array)
  building_preferences TEXT[] DEFAULT '{}',
  building_preferences_other TEXT,

  -- Top 3 priorities (ordered array, max 3)
  top_priorities TEXT[] DEFAULT '{}',
  top_priorities_other TEXT,

  -- AI analysis result
  ai_analysis JSONB,
  ai_analyzed_at TIMESTAMPTZ,

  -- Metadata
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'analyzed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- One form per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_apartment_wishes_user ON apartment_wishes(user_id);

-- RLS
ALTER TABLE apartment_wishes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wishes" ON apartment_wishes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wishes" ON apartment_wishes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wishes" ON apartment_wishes
  FOR UPDATE USING (auth.uid() = user_id);
