import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { decryptFromString, getOrgEncryptionKey } from '@/lib/crypto'
import { REPORT_CATEGORIES, type DecryptedMessage, type ReportStatus } from '@/types'
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

Font.register({
  family: 'Helvetica',
  fonts: [],
})

const STATUS_LABELS: Record<ReportStatus, string> = {
  neu: 'Neu',
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
  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'column',
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
  confidentialBadge: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#dc2626',
    borderWidth: 1,
    borderColor: '#dc2626',
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginTop: 2,
  },
  // Sections
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
  // Metadata grid
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
  // Deadlines
  deadlineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f3f4f6',
  },
  deadlineLabel: {
    fontSize: 9,
    color: '#6b7280',
  },
  deadlineValue: {
    fontSize: 9,
    color: '#111',
  },
  deadlineOverdue: {
    fontSize: 9,
    color: '#dc2626',
    fontFamily: 'Helvetica-Bold',
  },
  // Report body
  bodyText: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.6,
  },
  // Messages
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
  // Footer
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
})

interface PdfData {
  orgName: string
  report: {
    melder_token: string
    category: string
    status: ReportStatus
    received_at: string
    confirmed_at: string | null
    confirmation_deadline: string
    response_deadline: string
    title: string
    description: string
  }
  messages: DecryptedMessage[]
  exportedAt: string
}

function ReportPdf({ data }: { data: PdfData }) {
  const { orgName, report, messages, exportedAt } = data
  const confirmDays = Math.ceil((new Date(report.confirmation_deadline).getTime() - Date.now()) / 86400000)
  const responseDays = Math.ceil((new Date(report.response_deadline).getTime() - Date.now()) / 86400000)
  const confirmOverdue = !report.confirmed_at && confirmDays < 0
  const responseOverdue = new Date(report.response_deadline) < new Date() && report.status !== 'abgeschlossen'

  return (
    <Document title={`Meldung ${report.melder_token}`} author="anonym.in">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Compliance-Meldung</Text>
            <Text style={styles.headerSubtitle}>{orgName}</Text>
          </View>
          <Text style={styles.confidentialBadge}>VERTRAULICH</Text>
        </View>

        {/* Metadaten */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meldungsdetails</Text>
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Meldungs-Token</Text>
              <Text style={styles.metaValue}>{report.melder_token}</Text>
            </View>
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
        </View>

        {/* Fristen */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gesetzliche Fristen (HinSchG)</Text>
          <View style={styles.deadlineRow}>
            <Text style={styles.deadlineLabel}>Eingangsbestätigung (7 Tage)</Text>
            {report.confirmed_at ? (
              <Text style={styles.deadlineValue}>✓ Bestätigt am {formatDate(report.confirmed_at)}</Text>
            ) : (
              <Text style={confirmOverdue ? styles.deadlineOverdue : styles.deadlineValue}>
                {confirmOverdue
                  ? `${Math.abs(confirmDays)} Tage überfällig (Frist: ${formatDate(report.confirmation_deadline)})`
                  : `Offen – Frist: ${formatDate(report.confirmation_deadline)}`}
              </Text>
            )}
          </View>
          <View style={styles.deadlineRow}>
            <Text style={styles.deadlineLabel}>Rückmeldung (3 Monate)</Text>
            <Text style={responseOverdue ? styles.deadlineOverdue : styles.deadlineValue}>
              {responseOverdue
                ? `${Math.abs(responseDays)} Tage überfällig (Frist: ${formatDate(report.response_deadline)})`
                : `Frist: ${formatDate(report.response_deadline)}`}
            </Text>
          </View>
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
              Kommunikationsverlauf ({messages.length} Nachrichten)
            </Text>
            {messages.map((msg) => (
              <View
                key={msg.id}
                style={[styles.message, msg.sender === 'compliance' ? styles.messageCompliance : styles.messageMelder]}
              >
                <View style={styles.messageMeta}>
                  <Text style={msg.sender === 'compliance' ? styles.messageSenderCompliance : styles.messageSenderMelder}>
                    {msg.sender === 'compliance' ? 'Compliance-Team' : 'Melder (anonym)'}
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
          <Text style={styles.footerText}>
            anonym.in – Compliance-Dokumentation gemäß HinSchG
          </Text>
          <Text style={styles.footerText}>Exportiert: {exportedAt}</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, message: 'Nicht authentifiziert' }, { status: 401 })
    }

    const orgId = session.user.organizationId
    const orgKey = getOrgEncryptionKey(orgId)

    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single()

    const { data: raw, error } = await supabaseAdmin
      .from('reports')
      .select('*, messages(*)')
      .eq('id', params.id)
      .eq('organization_id', orgId)
      .single()

    if (error || !raw) {
      return NextResponse.json({ success: false, message: 'Meldung nicht gefunden' }, { status: 404 })
    }

    const { title_encrypted, description_encrypted, messages: rawMessages, ...rest } = raw

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
      report: {
        ...rest,
        title: decryptFromString(title_encrypted, orgKey),
        description: decryptFromString(description_encrypted, orgKey),
      },
      messages,
      exportedAt: formatDateTime(new Date().toISOString()),
    }

    const buffer = await renderToBuffer(<ReportPdf data={pdfData} />)
    const uint8 = new Uint8Array(buffer)

    const filename = `meldung-${raw.melder_token}-${new Date().toISOString().slice(0, 10)}.pdf`

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[PDF Export]', err)
    return NextResponse.json({ success: false, message: 'PDF-Generierung fehlgeschlagen' }, { status: 500 })
  }
}
