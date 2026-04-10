-- Tenant Documents: organized document management system
-- Storage path: {buildingId}/tenants/{userId}/{category}/{timestamp}-{filename}

CREATE TABLE IF NOT EXISTS tenant_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  building_id uuid REFERENCES buildings(id),
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  mime_type text,
  category text NOT NULL CHECK (category IN (
    'signed_forms',        -- טפסים חתומים
    'ownership',           -- מסמכי בעלות (טאבו, חוזה רכישה)
    'personal',            -- מסמכים אישיים (ת.ז., תעודות)
    'correspondence',      -- התכתבויות (מכתבים, אישורים)
    'contracts',           -- חוזים
    'other'                -- אחר
  )),
  description text,
  is_confidential boolean DEFAULT true,
  storage_path text NOT NULL,  -- Full path in Supabase Storage bucket
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tenant_documents ENABLE ROW LEVEL SECURITY;

-- Tenants can only see their own documents
CREATE POLICY "Users can view own tenant_documents"
  ON tenant_documents FOR SELECT
  USING (auth.uid() = user_id);

-- Tenants can upload their own documents
CREATE POLICY "Users can insert own tenant_documents"
  ON tenant_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Tenants can delete their own documents
CREATE POLICY "Users can delete own tenant_documents"
  ON tenant_documents FOR DELETE
  USING (auth.uid() = user_id);

-- Managers can view all documents in their projects
CREATE POLICY "Managers can view project tenant_documents"
  ON tenant_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('manager', 'companion')
    )
  );

CREATE INDEX idx_tenant_docs_user ON tenant_documents(user_id);
CREATE INDEX idx_tenant_docs_building ON tenant_documents(building_id);
CREATE INDEX idx_tenant_docs_category ON tenant_documents(category);

-- Storage bucket policies (run via Supabase dashboard if needed):
-- These are SQL comments for reference, actual storage policies
-- need to be set via the Storage API or dashboard.
--
-- Bucket: documents
-- Policy: Authenticated users can upload to their own folder
-- Policy: Authenticated users can read their own files
-- Policy: Managers can read all files
