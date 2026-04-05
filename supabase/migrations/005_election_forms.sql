CREATE TABLE IF NOT EXISTS election_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  building_id uuid REFERENCES buildings(id) NOT NULL,
  form_type text NOT NULL CHECK (form_type IN ('representative_election_form', 'organizer_election_form')),
  file_url text NOT NULL,
  file_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE election_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view building forms" ON election_forms FOR SELECT
  USING (building_id IN (SELECT building_id FROM tenant_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can upload own forms" ON election_forms FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_election_forms_building ON election_forms(building_id);
CREATE INDEX idx_election_forms_user ON election_forms(user_id);
