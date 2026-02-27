import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { decryptFromString, getOrgEncryptionKey } from '@/lib/crypto'
import type {
  DecryptedReport,
  DashboardStats,
  GetDashboardReportsResponse,
  ErrorResponse,
} from '@/types'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json<ErrorResponse>(
        { success: false, message: 'Nicht authentifiziert' },
        { status: 401 }
      )
    }

    const orgId = session.user.organizationId
    const orgKey = await getOrgEncryptionKey(orgId)

    const { data: reports, error } = await supabaseAdmin
      .from('reports')
      .select('*, messages(id, sender, is_read)')
      .eq('organization_id', orgId)
      .order('received_at', { ascending: false })

    if (error) {
      return NextResponse.json<ErrorResponse>(
        { success: false, message: 'Fehler beim Laden der Meldungen' },
        { status: 500 }
      )
    }

    const now = new Date()

    const decryptedReports: DecryptedReport[] = reports.map((report) => {
      const { title_encrypted, description_encrypted, messages, ...rest } = report
      return {
        ...rest,
        title: decryptFromString(title_encrypted, orgKey),
        description: decryptFromString(description_encrypted, orgKey),
        is_overdue: new Date(report.response_deadline) < now && report.status !== 'abgeschlossen',
        unread_messages:
          messages?.filter(
            (m: { sender: string; is_read: boolean }) => m.sender === 'melder' && !m.is_read
          ).length ?? 0,
      }
    })

    const stats: DashboardStats = {
      total: decryptedReports.length,
      neu: decryptedReports.filter((r) => r.status === 'neu').length,
      bestaetigt: decryptedReports.filter((r) => r.status === 'bestaetigt').length,
      in_bearbeitung: decryptedReports.filter((r) => r.status === 'in_bearbeitung').length,
      abgeschlossen: decryptedReports.filter((r) => r.status === 'abgeschlossen').length,
      overdue: decryptedReports.filter((r) => r.is_overdue).length,
    }

    return NextResponse.json<GetDashboardReportsResponse>({ success: true, reports: decryptedReports, stats })
  } catch {
    return NextResponse.json<ErrorResponse>(
      { success: false, message: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
