import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { decryptFromString, getOrgEncryptionKey } from '@/lib/crypto'
import type {
  DecryptedReport,
  DecryptedMessage,
  UpdateReportRequest,
  UpdateReportResponse,
  ErrorResponse,
  ReportStatus,
} from '@/types'

const VALID_STATUSES: ReportStatus[] = ['neu', 'in_bearbeitung', 'abgeschlossen']

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json<ErrorResponse>(
        { success: false, message: 'Nicht authentifiziert' },
        { status: 401 }
      )
    }

    const orgId = session.user.organizationId
    const orgKey = getOrgEncryptionKey(orgId)

    const { data: report, error } = await supabaseAdmin
      .from('reports')
      .select('*, messages(*)')
      .eq('id', params.id)
      .eq('organization_id', orgId) // Sicherstellen, dass die Meldung zur Org gehört
      .single()

    if (error || !report) {
      return NextResponse.json<ErrorResponse>(
        { success: false, message: 'Meldung nicht gefunden' },
        { status: 404 }
      )
    }

    // Melder-Nachrichten als gelesen markieren
    await supabaseAdmin
      .from('messages')
      .update({ is_read: true })
      .eq('report_id', params.id)
      .eq('sender', 'melder')
      .eq('is_read', false)

    const { title_encrypted, description_encrypted, messages, ...rest } = report

    const decryptedMessages: DecryptedMessage[] = (messages ?? []).map(
      (m: { content_encrypted: string; [key: string]: unknown }) => {
        const { content_encrypted, ...msgRest } = m
        return { ...msgRest, content: decryptFromString(content_encrypted, orgKey) }
      }
    )

    const decryptedReport: DecryptedReport = {
      ...rest,
      title: decryptFromString(title_encrypted, orgKey),
      description: decryptFromString(description_encrypted, orgKey),
      is_overdue:
        new Date(report.response_deadline) < new Date() && report.status !== 'abgeschlossen',
      unread_messages: 0,
      messages: decryptedMessages,
    }

    return NextResponse.json({ success: true, report: decryptedReport })
  } catch {
    return NextResponse.json<ErrorResponse>(
      { success: false, message: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json<ErrorResponse>(
        { success: false, message: 'Nicht authentifiziert' },
        { status: 401 }
      )
    }

    const body: UpdateReportRequest = await req.json()
    const { status, confirmed_at } = body

    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return NextResponse.json<ErrorResponse>(
        { success: false, message: 'Ungültiger Status' },
        { status: 400 }
      )
    }

    const updates: Record<string, string> = {}
    if (status) updates.status = status
    if (confirmed_at) updates.confirmed_at = confirmed_at

    if (Object.keys(updates).length === 0) {
      return NextResponse.json<ErrorResponse>(
        { success: false, message: 'Keine Änderungen angegeben' },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from('reports')
      .update(updates)
      .eq('id', params.id)
      .eq('organization_id', session.user.organizationId)

    if (error) {
      return NextResponse.json<ErrorResponse>(
        { success: false, message: 'Fehler beim Aktualisieren' },
        { status: 500 }
      )
    }

    return NextResponse.json<UpdateReportResponse>({ success: true })
  } catch {
    return NextResponse.json<ErrorResponse>(
      { success: false, message: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
