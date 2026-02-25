import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { decryptFromString, getOrgEncryptionKey } from '@/lib/crypto'
import { REPORT_CATEGORIES, type DecryptedMessage, type ReportStatus } from '@/types'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ReportActions from './ReportActions'
import ReplyForm from './ReplyForm'

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

function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export default async function ReportDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return null

  const orgId = session.user.organizationId
  const orgKey = getOrgEncryptionKey(orgId)

  const { data: raw, error } = await supabaseAdmin
    .from('reports')
    .select('*, messages(*)')
    .eq('id', params.id)
    .eq('organization_id', orgId)
    .single()

  if (error || !raw) notFound()

  // Melder-Nachrichten als gelesen markieren
  await supabaseAdmin
    .from('messages')
    .update({ is_read: true })
    .eq('report_id', params.id)
    .eq('sender', 'melder')
    .eq('is_read', false)

  const { title_encrypted, description_encrypted, messages: rawMessages, ...rest } = raw

  const messages: DecryptedMessage[] = (rawMessages ?? [])
    .map((m: { content_encrypted: string; created_at: string; [key: string]: unknown }) => {
      const { content_encrypted, ...msgRest } = m
      return { ...msgRest, content: decryptFromString(content_encrypted, orgKey) }
    })
    .sort((a: DecryptedMessage, b: DecryptedMessage) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

  const report = {
    ...rest,
    title: decryptFromString(title_encrypted, orgKey),
    description: decryptFromString(description_encrypted, orgKey),
  }

  const confirmDays = daysUntil(report.confirmation_deadline)
  const responseDays = daysUntil(report.response_deadline)
  const confirmOverdue = !report.confirmed_at && confirmDays < 0
  const responseOverdue = new Date(report.response_deadline) < new Date() && report.status !== 'abgeschlossen'

  return (
    <div className="max-w-3xl">
      {/* Zurück */}
      <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
        ← Zurück zur Übersicht
      </Link>

      {/* Header */}
      <div className="mt-4 mb-6">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-xs font-mono text-gray-400">{report.melder_token}</span>
          <span className="text-xs text-gray-300">·</span>
          <span className="text-xs text-gray-400">
            {REPORT_CATEGORIES[report.category as keyof typeof REPORT_CATEGORIES] ?? report.category}
          </span>
          <span className="text-xs text-gray-300">·</span>
          <span className="text-xs text-gray-400">Eingegangen: {formatDate(report.received_at)}</span>
        </div>
        <h1 className="text-lg font-semibold text-gray-900">{report.title}</h1>
      </div>

      <div className="space-y-5">
        {/* Meldungsinhalt */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Meldungsinhalt</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{report.description}</p>
        </div>

        {/* Fristen */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Gesetzliche Fristen (HinSchG)</h2>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Eingangsbestätigung (7 Tage)</span>
              {report.confirmed_at ? (
                <span className="text-green-700 font-medium">✓ {formatDate(report.confirmed_at)}</span>
              ) : (
                <span className={confirmOverdue ? 'text-red-600 font-medium' : 'text-gray-700'}>
                  {confirmOverdue
                    ? `${Math.abs(confirmDays)}d überfällig`
                    : `noch ${confirmDays}d (bis ${formatDate(report.confirmation_deadline)})`}
                </span>
              )}
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Rückmeldung (3 Monate)</span>
              <span className={responseOverdue ? 'text-red-600 font-medium' : 'text-gray-700'}>
                {responseOverdue
                  ? `${Math.abs(responseDays)}d überfällig`
                  : `noch ${responseDays}d (bis ${formatDate(report.response_deadline)})`}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Status</span>
              <span className="text-gray-700">{STATUS_LABELS[report.status as ReportStatus]}</span>
            </div>
          </div>
        </div>

        {/* Status & Aktionen */}
        <ReportActions
          reportId={report.id}
          currentStatus={report.status as ReportStatus}
          confirmedAt={report.confirmed_at}
        />

        {/* Kommunikationsverlauf */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            Kommunikation
            <span className="ml-2 text-xs font-normal text-gray-400">
              ({messages.length} Nachrichten)
            </span>
          </h2>

          {messages.length === 0 ? (
            <p className="text-sm text-gray-400 mb-4">Noch keine Nachrichten.</p>
          ) : (
            <div className="space-y-3 mb-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-lg px-4 py-3 text-sm ${
                    msg.sender === 'compliance'
                      ? 'bg-gray-900 text-white ml-8'
                      : 'bg-gray-100 text-gray-800 mr-8'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1 gap-4">
                    <span className={`text-xs font-medium ${msg.sender === 'compliance' ? 'text-gray-300' : 'text-gray-500'}`}>
                      {msg.sender === 'compliance' ? 'Compliance' : 'Melder (anonym)'}
                    </span>
                    <span className={`text-xs ${msg.sender === 'compliance' ? 'text-gray-400' : 'text-gray-400'}`}>
                      {formatDateTime(msg.created_at)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Antwort-Formular */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-500 mb-3">
              Antwort an den Melder (vollständig verschlüsselt):
            </p>
            <ReplyForm reportId={report.id} />
          </div>
        </div>
      </div>
    </div>
  )
}
