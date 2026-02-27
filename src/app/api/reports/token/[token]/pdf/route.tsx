import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { decryptFromString, getOrgEncryptionKey } from '@/lib/crypto'
import { REPORT_CATEGORIES, type DecryptedMessage, type ReportStatus } from '@/types'
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const STATUS_LABELS: Record<ReportStatus, string> = {
  neu: 'Eingegangen',
  bestaetigt: 'Eingang bestätigt',
  in_bearbeitung: 'In Bearbeitung',
  abgeschlossen: 'Abgeschlossen',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#111',
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 52,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#111',
  },
  headerSubtitle: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 2,
  },
  tokenBadge: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 4,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metaItem: {
    width: '50%',
    marginBottom: 6,
  },
  metaLabel: {
    fontSize: 8,
    color: '#9ca3af',
    marginBottom: 1,
  },
  metaValue: {
    fontSize: 10,
    color: '#111',
  },
  confirmationOk: {
    fontSize: 9,
    color: '#15803d',
    backgroundColor: '#f0fdf4',
    padding: 8,
    marginBottom: 0,
  },
  confirmationPending: {
    fontSize: 9,
    color: '#92400e',
    backgroundColor: '#fffbeb',
    padding: 8,
    marginBottom: 0,
  },
  bodyText: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.6,
  },
  message: {
    marginBottom: 8,
    padding: 8,
  },
  messageCompliance: {
    backgroundColor: '#1f2937',
  },
  messageMelder: {
    backgroundColor: '#f3f4f6',
  },
  messageMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  messageSenderCompliance: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#d1d5db',
  },
  messageSenderMelder: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
  },
  messageDate: {
    fontSize: 8,
    color: '#9ca3af',
  },
  messageContent: {
    fontSize: 9,
    lineHeight: 1.5,
  },
  messageContentCompliance: {
    color: '#f9fafb',
  },
  messageContentMelder: {
    color: '#374151',
  },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 52,
    right: 52,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: '#e5e7eb',
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: '#9ca3af',
  },
  statusBox: {
    marginBottom: 16,
    padding: 10,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statusBoxLabel: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 4,
  },
  statusBoxUrl: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#111',
  },
  statusBoxHint: {
    fontSize: 8,
    color: '#9ca3af',
    marginTop: 2,
  },
})

interface PdfData {
  orgName: string
  token: string
  statusUrl: string
  report: {
    category: string
    status: ReportStatus
    received_at: string
    confirmed_at: string | null
    title: string
    description: string
  }
  messages: DecryptedMessage[]
  exportedAt: string
}

function MelderReportPdf({ data }: { data: PdfData }) {
  const { orgName, token, statusUrl, report, messages, exportedAt } = data

  return (
    <Document title={`Meine Meldung ${token}`} author="anonym.in">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Meine Meldung</Text>
            <Text style={styles.headerSubtitle}>{orgName} · Compliance-Meldekanal</Text>
          </View>
          <Text style={styles.tokenBadge}>{token}</Text>
        </View>

        {/* Status-Seite */}
        <View style={styles.statusBox}>
          <Text style={styles.statusBoxLabel}>Meldung jederzeit einsehen unter:</Text>
          <Text style={styles.statusBoxUrl}>{statusUrl}</Text>
          <Text style={styles.statusBoxHint}>
            Zugangscode: {token} · Bitte sicher aufbewahren – kann nicht wiederhergestellt werden.
          </Text>
        </View>

        {/* Metadaten */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Status</Text>
              <Text style={styles.metaValue}>{STATUS_LABELS[report.status]}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Kategorie</Text>
              <Text style={styles.metaValue}>
                {REPORT_CATEGORIES[report.category as keyof typeof REPORT_CATEGORIES] ?? report.category}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Eingegangen am</Text>
              <Text style={styles.metaValue}>{formatDate(report.received_at)}</Text>
            </View>
          </View>
          {report.confirmed_at ? (
            <Text style={styles.confirmationOk}>
              ✓ Eingang vom Compliance-Team bestätigt am {formatDate(report.confirmed_at)}
            </Text>
          ) : (
            <Text style={styles.confirmationPending}>
              Eingangsbestätigung ausstehend (gesetzliche Frist: 7 Tage ab Eingang)
            </Text>
          )}
        </View>

        {/* Meldungsinhalt */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meldungsinhalt</Text>
          <Text style={[styles.bodyText, { fontFamily: 'Helvetica-Bold', marginBottom: 6 }]}>
            {report.title}
          </Text>
          <Text style={styles.bodyText}>{report.description}</Text>
        </View>

        {/* Kommunikationsverlauf */}
        {messages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Kommunikation ({messages.length} Nachrichten)
            </Text>
            {messages.map((msg) => (
              <View
                key={msg.id}
                style={[styles.message, msg.sender === 'compliance' ? styles.messageCompliance : styles.messageMelder]}
              >
                <View style={styles.messageMeta}>
                  <Text style={msg.sender === 'compliance' ? styles.messageSenderCompliance : styles.messageSenderMelder}>
                    {msg.sender === 'compliance' ? 'Compliance-Team' : 'Sie (anonym)'}
                  </Text>
                  <Text style={styles.messageDate}>{formatDateTime(msg.created_at)}</Text>
                </View>
                <Text style={[styles.messageContent, msg.sender === 'compliance' ? styles.messageContentCompliance : styles.messageContentMelder]}>
                  {msg.content}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>anonym.in – Ihr anonymer Compliance-Meldekanal</Text>
          <Text style={styles.footerText}>Exportiert: {exportedAt}</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const token = params.token.toUpperCase()

    const { data: report, error } = await supabaseAdmin
      .from('reports')
      .select('*, messages(*)')
      .eq('melder_token', token)
      .single()

    if (error || !report) {
      return NextResponse.json({ success: false, message: 'Meldung nicht gefunden' }, { status: 404 })
    }

    const orgKey = await getOrgEncryptionKey(report.organization_id)

    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('name, slug')
      .eq('id', report.organization_id)
      .single()

    const origin = req.nextUrl.origin
    const statusUrl = `${origin}/melden/${org?.slug ?? ''}/status?token=${token}`

    const { title_encrypted, description_encrypted, messages: rawMessages, ...rest } = report

    const messages: DecryptedMessage[] = (rawMessages ?? [])
      .map((m: { content_encrypted: string; [key: string]: unknown }) => {
        const { content_encrypted, ...msgRest } = m
        return { ...msgRest, content: decryptFromString(content_encrypted, orgKey) }
      })
      .sort((a: DecryptedMessage, b: DecryptedMessage) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )

    const pdfData: PdfData = {
      orgName: org?.name ?? 'Organisation',
      token,
      statusUrl,
      report: {
        ...rest,
        title: decryptFromString(title_encrypted, orgKey),
        description: decryptFromString(description_encrypted, orgKey),
      },
      messages,
      exportedAt: formatDateTime(new Date().toISOString()),
    }

    const buffer = await renderToBuffer(<MelderReportPdf data={pdfData} />)
    const uint8 = new Uint8Array(buffer)
    const filename = `meldung-${token}-${new Date().toISOString().slice(0, 10)}.pdf`

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[Melder PDF Export]', err)
    return NextResponse.json({ success: false, message: 'PDF-Generierung fehlgeschlagen' }, { status: 500 })
  }
}
