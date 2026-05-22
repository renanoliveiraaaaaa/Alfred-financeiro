-- organization_id em import_sessions e categories + activity_logs restrito

ALTER TABLE import_sessions
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;

UPDATE import_sessions s
SET organization_id = (
  SELECT o.id FROM organizations o
  WHERE o.owner_id = s.user_id AND o.type = 'personal'
  LIMIT 1
)
WHERE organization_id IS NULL;

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

UPDATE categories c
SET organization_id = (
  SELECT o.id FROM organizations o
  WHERE o.owner_id = c.user_id AND o.type = 'personal'
  LIMIT 1
)
WHERE organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_import_sessions_organization_id ON import_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_categories_organization_id ON categories(organization_id);

-- Restringe actions válidas em activity_logs
ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_action_check;
ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_action_check CHECK (
  action IN (
    'login', 'logout', 'profile_update', 'export_data', 'delete_records',
    '2fa_enroll', '2fa_unenroll', 'password_change', 'account_delete', 'settings_change'
  )
);
