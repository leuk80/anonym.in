// ============================================================
// DATABASE ENTITIES
// ============================================================

export type SubscriptionStatus = 'trial' | 'active' | 'inactive' | 'cancelled'
export type SubscriptionPlan = 'starter' | 'professional' | 'enterprise'
export type ReportStatus = 'neu' | 'in_bearbeitung' | 'abgeschlossen'
export type MessageSender = 'melder' | 'compliance'
export type UserRole = 'admin' | 'officer'

export interface Organization {
  id: string
  name: string
  slug: string
  contact_email: string
  subscription_status: SubscriptionStatus
  subscription_plan: SubscriptionPlan | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  encryption_key_hash: string
  created_at: string
  updated_at: string
}

export interface ComplianceUser {
  id: string
  organization_id: string
  email: string
  password_hash: string
  role: UserRole
  name: string | null
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface Report {
  id: string
  organization_id: string
  melder_token: string
  category: ReportCategory
  title_encrypted: string
  description_encrypted: string
  status: ReportStatus
  received_at: string
  confirmation_deadline: string
  response_deadline: string
  confirmed_at: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  report_id: string
  sender: MessageSender
  content_encrypted: string
  is_read: boolean
  created_at: string
}

// ============================================================
// DOMAIN TYPES (entschlüsselt, für die Anwendungslogik)
// ============================================================

export type ReportCategory =
  | 'korruption'
  | 'betrug'
  | 'datenschutz'
  | 'diskriminierung'
  | 'sicherheit'
  | 'sonstiges'

export const REPORT_CATEGORIES: Record<ReportCategory, string> = {
  korruption: 'Korruption & Bestechung',
  betrug: 'Betrug & Untreue',
  datenschutz: 'Datenschutzverletzung',
  diskriminierung: 'Diskriminierung & Belästigung',
  sicherheit: 'Arbeits- & Produktsicherheit',
  sonstiges: 'Sonstiges',
}

export interface DecryptedReport extends Omit<Report, 'title_encrypted' | 'description_encrypted'> {
  title: string
  description: string
  is_overdue: boolean
  unread_messages: number
  messages?: DecryptedMessage[]
}

export interface DecryptedMessage extends Omit<Message, 'content_encrypted'> {
  content: string
}

export interface EncryptedData {
  iv: string
  authTag: string
  ciphertext: string
}

// ============================================================
// API REQUEST / RESPONSE TYPES
// ============================================================

// POST /api/reports
export interface CreateReportRequest {
  category: ReportCategory
  title: string
  description: string
}

export interface CreateReportResponse {
  success: true
  melder_token: string
}

// GET /api/reports/token/[token]
export interface GetReportByTokenResponse {
  success: true
  report: DecryptedReport
}

// POST /api/reports/token/[token]
export interface SendMelderMessageRequest {
  content: string
}

export interface SendMelderMessageResponse {
  success: true
  message_id: string
}

// GET /api/dashboard/reports
export interface GetDashboardReportsResponse {
  success: true
  reports: DecryptedReport[]
  stats: DashboardStats
}

export interface DashboardStats {
  total: number
  neu: number
  in_bearbeitung: number
  abgeschlossen: number
  overdue: number
}

// PATCH /api/dashboard/reports/[id]
export interface UpdateReportRequest {
  status?: ReportStatus
  confirmed_at?: string
}

export interface UpdateReportResponse {
  success: true
}

// POST /api/dashboard/reports/[id]/messages
export interface SendComplianceMessageRequest {
  content: string
}

export interface SendComplianceMessageResponse {
  success: true
  message_id: string
}

// POST /api/admin/organizations
export interface CreateOrganizationRequest {
  name: string
  slug: string
  contact_email: string
  subscription_plan: SubscriptionPlan
  admin_email: string
  admin_password: string
  admin_name?: string
}

export interface CreateOrganizationResponse {
  success: true
  organization_id: string
  encryption_key: string  // Einmalig ausgegeben – muss als Env-Var gespeichert werden!
  env_var_name: string    // z.B. ORG_KEY_550e8400...
}

// Generische Fehler-Response
export interface ErrorResponse {
  success: false
  message: string
}

// ============================================================
// NEXTAUTH SESSION TYPES
// ============================================================

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      organizationId: string
      role: UserRole
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    organizationId: string
    role: UserRole
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    organizationId: string
    role: UserRole
  }
}
