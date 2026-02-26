-- Migration: Envelope Encryption für Org-Keys
-- Hintergrund: Org-Keys werden nicht mehr als Env-Var pro Organisation gespeichert,
-- sondern mit einem einzigen MASTER_ENCRYPTION_KEY verschlüsselt in der DB abgelegt.
-- Dies ermöglicht vollautomatisches Onboarding ohne manuelle Konfigurationsschritte.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS encryption_key_enc TEXT;

-- Wichtig: Nach der Migration müssen alle bestehenden Organisationen migriert werden.
-- Führe dazu das Script scripts/migrate-org-keys.ts aus (sofern Org-Keys als Env-Vars vorliegen).
-- Neue Organisationen erhalten encryption_key_enc automatisch beim Anlegen.
