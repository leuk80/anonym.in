import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { encryptToString, getOrgEncryptionKey } from '@/lib/crypto'
import type {
  SendComplianceMessageRequest,
  SendComplianceMessageResponse,
  ErrorResponse,
} from '@/types'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json<ErrorResponse>(
        { success: false, message: 'Nicht authentifiziert' },
        { status: 401 }
      )
    }

    const body: SendComplianceMessageRequest = await req.json()
    const content = body.content?.trim()

    if (!content || content.length === 0) {
      return NextResponse.json<ErrorResponse>(
        { success: false, message: 'Nachricht darf nicht leer sein' },
        { status: 400 }
      )
    }

    const orgId = session.user.organizationId

    // Sicherstellen, dass die Meldung zur Org gehört
    const { data: report, error: reportError } = await supabaseAdmin
      .from('reports')
      .select('id')
      .eq('id', params.id)
      .eq('organization_id', orgId)
      .single()

    if (reportError || !report) {
      return NextResponse.json<ErrorResponse>(
        { success: false, message: 'Meldung nicht gefunden' },
        { status: 404 }
      )
    }

    const orgKey = getOrgEncryptionKey(orgId)
    const contentEncrypted = encryptToString(content, orgKey)

    const { data: message, error } = await supabaseAdmin
      .from('messages')
      .insert({
        report_id: params.id,
        sender: 'compliance',
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

    return NextResponse.json<SendComplianceMessageResponse>(
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
