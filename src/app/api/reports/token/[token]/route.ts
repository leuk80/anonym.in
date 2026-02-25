import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { decryptFromString, encryptToString, getOrgEncryptionKey } from '@/lib/crypto'
import type {
  DecryptedMessage,
  GetReportByTokenResponse,
  SendMelderMessageRequest,
  SendMelderMessageResponse,
  ErrorResponse,
} from '@/types'

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const { data: report, error } = await supabaseAdmin
      .from('reports')
      .select('*, messages(*)')
      .eq('melder_token', params.token.toUpperCase())
      .single()

    if (error || !report) {
      return NextResponse.json<ErrorResponse>(
        { success: false, message: 'Meldung nicht gefunden. Bitte Token prüfen.' },
        { status: 404 }
      )
    }

    const orgKey = getOrgEncryptionKey(report.organization_id)

    // Compliance-Nachrichten als gelesen markieren (Melder hat sie gesehen)
    await supabaseAdmin
      .from('messages')
      .update({ is_read: true })
      .eq('report_id', report.id)
      .eq('sender', 'compliance')
      .eq('is_read', false)

    const { title_encrypted, description_encrypted, messages: rawMessages, ...rest } = report

    const messages: DecryptedMessage[] = (rawMessages ?? [])
      .map((m: { content_encrypted: string; [key: string]: unknown }) => {
        const { content_encrypted, ...msgRest } = m
        return { ...msgRest, content: decryptFromString(content_encrypted, orgKey) }
      })
      .sort(
        (a: DecryptedMessage, b: DecryptedMessage) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )

    const decryptedReport = {
      ...rest,
      title: decryptFromString(title_encrypted, orgKey),
      description: decryptFromString(description_encrypted, orgKey),
      is_overdue:
        new Date(report.response_deadline) < new Date() && report.status !== 'abgeschlossen',
      unread_messages: 0,
      messages,
    }

    return NextResponse.json<GetReportByTokenResponse>({ success: true, report: decryptedReport })
  } catch {
    return NextResponse.json<ErrorResponse>(
      { success: false, message: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const { data: report, error: findError } = await supabaseAdmin
      .from('reports')
      .select('id, organization_id, status')
      .eq('melder_token', params.token.toUpperCase())
      .single()

    if (findError || !report) {
      return NextResponse.json<ErrorResponse>(
        { success: false, message: 'Meldung nicht gefunden' },
        { status: 404 }
      )
    }

    if (report.status === 'abgeschlossen') {
      return NextResponse.json<ErrorResponse>(
        { success: false, message: 'Diese Meldung ist abgeschlossen. Keine weiteren Nachrichten möglich.' },
        { status: 403 }
      )
    }

    const body: SendMelderMessageRequest = await req.json()
    const content = body.content?.trim()

    if (!content || content.length === 0) {
      return NextResponse.json<ErrorResponse>(
        { success: false, message: 'Nachricht darf nicht leer sein' },
        { status: 400 }
      )
    }

    const orgKey = getOrgEncryptionKey(report.organization_id)
    const contentEncrypted = encryptToString(content, orgKey)

    const { data: message, error } = await supabaseAdmin
      .from('messages')
      .insert({
        report_id: report.id,
        sender: 'melder',
        content_encrypted: contentEncrypted,
        is_read: false,
      })
      .select('id')
      .single()

    if (error || !message) {
      return NextResponse.json<ErrorResponse>(
        { success: false, message: 'Fehler beim Senden der Nachricht' },
        { status: 500 }
      )
    }

    // TODO (Punkt 5): Compliance-Officer benachrichtigen

    return NextResponse.json<SendMelderMessageResponse>(
      { success: true, message_id: message.id },
      { status: 201 }
    )
  } catch {
    return NextResponse.json<ErrorResponse>(
      { success: false, message: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
