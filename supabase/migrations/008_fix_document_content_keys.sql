-- Fix: set content_key for all documents so templates render correctly
UPDATE documents SET content_key = slug WHERE (content_key IS NULL OR content_key = '') AND slug IS NOT NULL;

-- Insert missing stage documents
INSERT INTO documents (id, title, type, file_url, uploaded_by, slug, content_key) VALUES
  (gen_random_uuid(), 'הצהרת דייר', 'SIGN_REQUIRED', '', (SELECT id FROM profiles LIMIT 1), 'tenant_declaration', 'tenant_declaration'),
  (gen_random_uuid(), 'אישור קבלת מידע', 'SIGN_REQUIRED', '', (SELECT id FROM profiles LIMIT 1), 'info_receipt', 'info_receipt'),
  (gen_random_uuid(), 'אישור בדיקת זכויות', 'INFO_ONLY', '', (SELECT id FROM profiles LIMIT 1), 'rights_verification', 'rights_verification'),
  (gen_random_uuid(), 'נספח תנאים', 'SIGN_REQUIRED', '', (SELECT id FROM profiles LIMIT 1), 'conditions_appendix', 'conditions_appendix')
ON CONFLICT (slug) DO NOTHING;
