-- anonym.in – Compliance Hotline SaaS
-- Datenbankschema (Supabase / PostgreSQL)
-- EU-konform gemäß HinSchG & EU-Whistleblower-Richtlinie 2019/1937

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ============================================================
-- ORGANIZATIONS (Kundenfirmen)
-- ============================================================
CREATE TABLE organizations (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT        NOT NULL,
  slug                 TEXT        UNIQUE NOT NULL,          -- URL-Slug für Meldeportal
  contact_email        TEXT        NOT NULL,                 -- Empfänger für Benachrichtigungen
  subscription_status  TEXT        NOT NULL DEFAULT 'trial'
                         CHECK (subscription_status IN ('trial', 'active', 'inactive', 'cancelled')),
  subscription_plan    TEXT
                         CHECK (subscription_plan IN ('starter', 'professional', 'enterprise')),
  stripe_customer_id   TEXT,
  stripe_subscription_id TEXT,
  encryption_key_hash  TEXT        NOT NULL,                 -- SHA-256 des Org-Keys (zur Verifikation)
  encryption_key_enc   TEXT        NOT NULL,                 -- Org-Key, verschlüsselt mit MASTER_ENCRYPTION_KEY (AES-256-GCM)
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COMPLIANCE USERS (Login-User der Kundenfirmen)
-- ============================================================
CREATE TABLE compliance_users (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email           TEXT        UNIQUE NOT NULL,
  password_hash   TEXT        NOT NULL,                     -- scrypt-Hash
  role            TEXT        NOT NULL DEFAULT 'officer'
                    CHECK (role IN ('admin', 'officer')),
  name            TEXT,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- REPORTS (Meldungen)
-- ============================================================
CREATE TABLE reports (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  melder_token            TEXT        UNIQUE NOT NULL,       -- z.B. WOLF-7342-BLAU
  category                TEXT        NOT NULL,
  title_encrypted         TEXT        NOT NULL,              -- AES-256-GCM JSON
  description_encrypted   TEXT        NOT NULL,              -- AES-256-GCM JSON
  status                  TEXT        NOT NULL DEFAULT 'neu'
                            CHECK (status IN ('neu', 'bestaetigt', 'in_bearbeitung', 'abgeschlossen')),
  -- Fristen gemäß HinSchG
  received_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmation_deadline   TIMESTAMPTZ NOT NULL,              -- +7 Tage (via Trigger)
  response_deadline       TIMESTAMPTZ NOT NULL,              -- +3 Monate (via Trigger)
  confirmed_at            TIMESTAMPTZ,                       -- Eingangsbestätigung gesetzt
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MESSAGES (Zwei-Wege-Kommunikation)
-- ============================================================
CREATE TABLE messages (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id         UUID        NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  sender            TEXT        NOT NULL CHECK (sender IN ('melder', 'compliance')),
  content_encrypted TEXT        NOT NULL,                   -- AES-256-GCM JSON
  is_read           BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_reports_organization_id    ON reports(organization_id);
CREATE INDEX idx_reports_melder_token       ON reports(melder_token);
CREATE INDEX idx_reports_status             ON reports(status);
CREATE INDEX idx_reports_received_at        ON reports(received_at);
CREATE INDEX idx_messages_report_id         ON messages(report_id);
CREATE INDEX idx_compliance_users_org       ON compliance_users(organization_id);
CREATE INDEX idx_organizations_slug         ON organizations(slug);

-- ============================================================
-- TRIGGER: updated_at automatisch setzen
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER compliance_users_updated_at
  BEFORE UPDATE ON compliance_users
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- TRIGGER: Fristen automatisch setzen (HinSchG)
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_report_deadlines()
RETURNS TRIGGER AS $$
BEGIN
  NEW.confirmation_deadline = NEW.received_at + INTERVAL '7 days';
  NEW.response_deadline     = NEW.received_at + INTERVAL '3 months';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reports_set_deadlines
  BEFORE INSERT ON reports
  FOR EACH ROW EXECUTE FUNCTION trigger_set_report_deadlines();

-- ============================================================
-- pg_cron: Automatische Löschung nach 3 Jahren (HinSchG §11)
-- ============================================================
SELECT cron.schedule(
  'delete-old-reports',
  '0 3 * * *',  -- täglich um 03:00 Uhr
  $$
    DELETE FROM reports
    WHERE received_at < NOW() - INTERVAL '3 years';
  $$
);

-- ============================================================
-- ROW LEVEL SECURITY
-- Server-seitiger Code nutzt Service-Role (umgeht RLS).
-- RLS schützt gegen direkten DB-Zugriff ohne Service-Role.
-- ============================================================
ALTER TABLE organizations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports          ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages         ENABLE ROW LEVEL SECURITY;

-- Keine öffentlichen Policies – nur Service-Role darf zugreifen
CREATE POLICY "no_public_access_organizations"    ON organizations    FOR ALL USING (false);
CREATE POLICY "no_public_access_compliance_users" ON compliance_users FOR ALL USING (false);
CREATE POLICY "no_public_access_reports"          ON reports          FOR ALL USING (false);
CREATE POLICY "no_public_access_messages"         ON messages         FOR ALL USING (false);
