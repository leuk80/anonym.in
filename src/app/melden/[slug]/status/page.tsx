import { getOrganizationBySlug } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase'
import { decryptFromString, getOrgEncryptionKey } from '@/lib/crypto'
import { REPORT_CATEGORIES, type DecryptedMessage, type ReportStatus } from '@/types'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import TokenForm from './TokenForm'
import MelderReplyForm from './MelderReplyForm'

const STATUS_LABELS: Record<ReportStatus, string> = {
  neu: 'Eingegangen',
  in_bearbeitung: 'In Bearbeitung',
  abgeschlossen: 'Abgeschlossen',
}

const STATUS_CLASSES: Record<ReportStatus, string> = {
  neu: 'bg-blue-100 text-blue-800',
  in_bearbeitung: 'bg-amber-100 text-amber-800',
  abgeschlossen: 'bg-green-100 text-green-800',
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

export default async function MelderStatusPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { token?: string }
}) {
  const org = await getOrganizationBySlug(params.slug)
  if (!org) notFound()

  const token = searchParams.token?.toUpperCase()

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-xl font-semibold text-gray-900">{org.name}</h1>
        <p className="mt-1 text-sm text-gray-500">Compliance-Meldekanal – Meldungsstatus</p>
      </div>

      {!token ? (
        // Kein Token → Eingabeformular zeigen
        <TokenForm slug={params.slug} />
      ) : (
        // Token vorhanden → Meldung laden und anzeigen
        <StatusView token={token} slug={params.slug} orgId={org.id} />
      )}

      <p className="mt-6 text-center text-xs text-gray-400">
        <Link href={`/melden/${params.slug}`} className="underline underline-offset-2 hover:text-gray-600">
          Neue Meldung einreichen
        </Link>
      </p>
    </div>
  )
}

async function StatusView({ token, slug, orgId }: { token: string; slug: string; orgId: string }) {
  const { data: report, error } = await supabaseAdmin
    .from('reports')
    .select('*, messages(*)')
    .eq('melder_token', token)
    .eq('organization_id', orgId) // Sicherstellen, dass Token zur Org gehört
    .single()

  if (error || !report) {
    return (
      <div className="max-w-md mx-auto text-center">
        <div className="bg-white rounded-xl border border-red-200 p-8">
          <p className="text-sm text-red-600 font-medium mb-2">Meldung nicht gefunden</p>
          <p className="text-sm text-gray-500 mb-4">
            Bitte prüfen Sie Ihren Zugangscode. Groß-/Kleinschreibung wird ignoriert.
          </p>
          <Link
            href={`/melden/${slug}/status`}
            className="text-sm underline underline-offset-2 text-gray-600 hover:text-gray-900"
          >
            Erneut versuchen
          </Link>
        </div>
      </div>
    )
  }

  // Compliance-Nachrichten als gelesen markieren
  await supabaseAdmin
    .from('messages')
    .update({ is_read: true })
    .eq('report_id', report.id)
    .eq('sender', 'compliance')
    .eq('is_read', false)

  const orgKey = getOrgEncryptionKey(orgId)
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

  const title = decryptFromString(title_encrypted, orgKey)
  const description = decryptFromString(description_encrypted, orgKey)
  const status = rest.status as ReportStatus
  const isAbgeschlossen = status === 'abgeschlossen'

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Meldungsübersicht */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-xs text-gray-400 font-mono mb-1">{token}</p>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {REPORT_CATEGORIES[report.category as keyof typeof REPORT_CATEGORIES]} ·{' '}
              Eingegangen: {formatDate(rest.received_at)}
            </p>
          </div>
          <span className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium ${STATUS_CLASSES[status]}`}>
            {STATUS_LABELS[status]}
          </span>
        </div>

        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed border-t border-gray-100 pt-3">
          {description}
        </p>

        {/* Eingangsbestätigung */}
        {rest.confirmed_at ? (
          <p className="mt-3 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
            Eingang bestätigt am {formatDate(rest.confirmed_at)} (gesetzliche 7-Tage-Frist eingehalten)
          </p>
        ) : (
          <p className="mt-3 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
            Eingangsbestätigung ausstehend (gesetzliche Frist: 7 Tage ab Eingang)
          </p>
        )}
      </div>

      {/* Kommunikationsverlauf */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Kommunikation mit dem Compliance-Team
        </h3>

        {messages.length === 0 ? (
          <p className="text-sm text-gray-400 mb-4">
            Noch keine Nachrichten. Das Compliance-Team wird sich bei Bedarf melden.
          </p>
        ) : (
          <div className="space-y-3 mb-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-lg px-4 py-3 text-sm ${
                  msg.sender === 'compliance'
                    ? 'bg-gray-900 text-white ml-6'
                    : 'bg-gray-100 text-gray-800 mr-6'
                }`}
              >
                <div className="flex justify-between items-center gap-4 mb-1">
                  <span className={`text-xs font-medium ${msg.sender === 'compliance' ? 'text-gray-300' : 'text-gray-500'}`}>
                    {msg.sender === 'compliance' ? 'Compliance-Team' : 'Sie (anonym)'}
                  </span>
                  <span className="text-xs opacity-60">{formatDateTime(msg.created_at)}</span>
                </div>
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            ))}
          </div>
        )}

        <div className={messages.length > 0 ? 'border-t border-gray-100 pt-4' : ''}>
          {!isAbgeschlossen && (
            <p className="text-xs text-gray-500 mb-3">Nachricht an das Compliance-Team senden:</p>
          )}
          <MelderReplyForm token={token} disabled={isAbgeschlossen} />
        </div>
      </div>

      {/* Datenschutzhinweis */}
      <p className="text-xs text-gray-400 text-center">
        Alle Nachrichten sind Ende-zu-Ende-verschlüsselt. Kein Tracking, keine Cookies.
      </p>
    </div>
  )
}
