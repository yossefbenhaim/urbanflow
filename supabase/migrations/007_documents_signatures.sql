-- Add slug column to documents for frontend lookup by string key
ALTER TABLE documents ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Update existing documents with slugs based on content_key
UPDATE documents SET slug = 'agreement_principles' WHERE content_key = 'agreement_principles' AND slug IS NULL;
UPDATE documents SET slug = 'power_of_attorney' WHERE content_key = 'power_of_attorney_lawyer' AND slug IS NULL;
UPDATE documents SET slug = 'disclosure_letter' WHERE content_key = 'disclosure_letter' AND slug IS NULL;

-- Seed all stage documents
INSERT INTO documents (id, title, type, file_url, uploaded_by, slug) VALUES
  (gen_random_uuid(), 'אישור הצטרפות לפרויקט', 'SIGN_REQUIRED', '', (SELECT id FROM profiles LIMIT 1), 'join_form'),
  (gen_random_uuid(), 'שאלון פרטי דייר', 'SIGN_REQUIRED', '', (SELECT id FROM profiles LIMIT 1), 'tenant_survey'),
  (gen_random_uuid(), 'מסמכי בעלות (נסח טאבו)', 'INFO_ONLY', '', (SELECT id FROM profiles LIMIT 1), 'ownership_docs'),
  (gen_random_uuid(), 'טופס בחירת נציגות', 'SIGN_REQUIRED', '', (SELECT id FROM profiles LIMIT 1), 'election_form'),
  (gen_random_uuid(), 'סיכומי פגישות מו"מ', 'INFO_ONLY', '', (SELECT id FROM profiles LIMIT 1), 'meeting_summary'),
  (gen_random_uuid(), 'הסכם מפורט סופי', 'SIGN_REQUIRED', '', (SELECT id FROM profiles LIMIT 1), 'final_agreement'),
  (gen_random_uuid(), 'אישור חתימות דיירים', 'INFO_ONLY', '', (SELECT id FROM profiles LIMIT 1), 'tenant_signatures'),
  (gen_random_uuid(), 'תוכניות אדריכליות', 'INFO_ONLY', '', (SELECT id FROM profiles LIMIT 1), 'arch_plans'),
  (gen_random_uuid(), 'דו"ח שמאי', 'INFO_ONLY', '', (SELECT id FROM profiles LIMIT 1), 'appraisal_report'),
  (gen_random_uuid(), 'היתר בנייה', 'INFO_ONLY', '', (SELECT id FROM profiles LIMIT 1), 'building_permit'),
  (gen_random_uuid(), 'הסכם דיור חלופי', 'SIGN_REQUIRED', '', (SELECT id FROM profiles LIMIT 1), 'alt_housing'),
  (gen_random_uuid(), 'פרוטוקול פינוי', 'SIGN_REQUIRED', '', (SELECT id FROM profiles LIMIT 1), 'evac_protocol'),
  (gen_random_uuid(), 'דו"חות התקדמות', 'INFO_ONLY', '', (SELECT id FROM profiles LIMIT 1), 'progress_reports'),
  (gen_random_uuid(), 'בדיקות איכות', 'INFO_ONLY', '', (SELECT id FROM profiles LIMIT 1), 'quality_checks'),
  (gen_random_uuid(), 'פרוטוקול מסירה', 'SIGN_REQUIRED', '', (SELECT id FROM profiles LIMIT 1), 'delivery_protocol'),
  (gen_random_uuid(), 'תעודת גמר (טופס 4)', 'INFO_ONLY', '', (SELECT id FROM profiles LIMIT 1), 'form4')
ON CONFLICT (slug) DO NOTHING;

-- RLS policies for signatures
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "signatures_select" ON signatures FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "signatures_insert" ON signatures FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
