CREATE TABLE IF NOT EXISTS ownership_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  building_id uuid REFERENCES buildings(id),
  file_url text NOT NULL,
  file_name text NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('tabu_extract', 'purchase_contract', 'ownership_certificate', 'inheritance_docs', 'power_of_attorney_doc', 'other')),
  notes text,
  is_confidential boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ownership_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents" ON ownership_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own documents" ON ownership_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents" ON ownership_documents FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_ownership_docs_user ON ownership_documents(user_id);
CREATE INDEX idx_ownership_docs_building ON ownership_documents(building_id);
