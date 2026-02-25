import { NextRequest, NextResponse } from 'next/server'
import { getOrganizationBySlug } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase'
import { encryptToString, generateMelderToken, getOrgEncryptionKey } from '@/lib/crypto'
import { checkRateLimit } from '@/lib/rateLimit'
import { sendNewReportNotification } from '@/lib/email'
import type { CreateReportRequest, CreateReportResponse, ErrorResponse, ReportCategory } from '@/types'

const VALID_CATEGORIES: ReportCategory[] = [
  'korruption', 'betrug', 'datenschutz', 'diskriminierung', 'sicherheit', 'sonstiges',
]

export async function POST(req: NextRequest) {
  // Rate Limiting: max 10 Meldungen pro Minute pro IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!checkRateLimit(ip, 10, 60_000)) {
    return NextResponse.json<ErrorResponse>(
      { success: false, message: 'Zu viele Anfragen. Bitte warten Sie einen Moment.' },
      { status: 429 }
    )
  }

  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  if (!slug) {
    return NextResponse.json<ErrorResponse>(
      { success: false, message: 'Organisation nicht angegeben' },
      { status: 400 }
    )
  }

  try {
    const org = await getOrganizationBySlug(slug)
    if (!org) {
      return NextResponse.json<ErrorResponse>(
        { success: false, message: 'Meldekanal nicht gefunden' },
        { status: 404 }
      )
    }

    if (org.subscription_status === 'cancelled' || org.subscription_status === 'inactive') {
      return NextResponse.json<ErrorResponse>(
        { success: false, message: 'Dieser Meldekanal ist derzeit nicht verfügbar' },
        { status: 403 }
      )
    }

    const body: CreateReportRequest = await req.json()
    const { category, title, description } = body

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json<ErrorResponse>(
        { success: false, message: 'Ungültige Kategorie' },
        { status: 400 }
      )
    }
    if (!title?.trim() || title.trim().length < 5) {
      return NextResponse.json<ErrorResponse>(
        { success: false, message: 'Titel zu kurz (mind. 5 Zeichen)' },
        { status: 400 }
      )
    }
    if (!description?.trim() || description.trim().length < 20) {
      return NextResponse.json<ErrorResponse>(
        { success: false, message: 'Beschreibung zu kurz (mind. 20 Zeichen)' },
        { status: 400 }
      )
    }

    const orgKey = getOrgEncryptionKey(org.id)
    const melderToken = generateMelderToken()

    const { error } = await supabaseAdmin.from('reports').insert({
      organization_id: org.id,
      melder_token: melderToken,
      category,
      title_encrypted: encryptToString(title.trim(), orgKey),
      description_encrypted: encryptToString(description.trim(), orgKey),
    })

    if (error) {
      return NextResponse.json<ErrorResponse>(
        { success: false, message: 'Fehler beim Einreichen der Meldung' },
        { status: 500 }
      )
    }

    // E-Mail-Benachrichtigung – Fehler soll den Melder nicht blockieren
    sendNewReportNotification(org.contact_email, org.name).catch(() => {})

    return NextResponse.json<CreateReportResponse>(
      { success: true, melder_token: melderToken },
      { status: 201 }
    )
  } catch {
    return NextResponse.json<ErrorResponse>(
      { success: false, message: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
