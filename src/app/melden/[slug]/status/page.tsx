import { getOrganizationBySlug } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase'
import { decryptFromString, getOrgEncryptionKey } from '@/lib/crypto'
import { type DecryptedMessage, type ReportStatus } from '@/types'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import TokenForm from './TokenForm'
import MelderReplyForm from './MelderReplyForm'
import MelderPdfDownloadButton from '../MelderPdfDownloadButton'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export const dynamic = 'force-dynamic'

const STATUS_CLASSES: Record<ReportStatus, string> = {
  neu: 'bg-blue-100 text-blue-800',
  bestaetigt: 'bg-purple-100 text-purple-800',
  in_bearbeitung: 'bg-amber-100 text-amber-800',
  abgeschlossen: 'bg-green-100 text-green-800',
}

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function formatDateTime(iso: string, locale: string) {
  return new Date(iso).toLocaleString(locale, {
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

  const t = await getTranslations('status')
  const token = searchParams.token?.toUpperCase()

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-xl font-semibold text-gray-900">{org.name}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('pageSubtitle')}</p>
        <div className="mt-3 flex justify-center">
          <LanguageSwitcher />
        </div>
      </div>

      {!token ? (
        <TokenForm slug={params.slug} />
      ) : (
        <StatusView token={token} slug={params.slug} orgId={org.id} />
      )}

      <p className="mt-6 text-center text-xs text-gray-400">
        <Link href={`/melden/${params.slug}`} className="underline underline-offset-2 hover:text-gray-600">
          {t('newReport')}
        </Link>
      </p>
    </div>
  )
}

async function StatusView({ token, slug, orgId }: { token: string; slug: string; orgId: string }) {
  const t = await getTranslations('status')
  const tPortal = await getTranslations('portal')
  const { getLocale } = await import('next-intl/server')
  const locale = await getLocale()

  const { data: report, error } = await supabaseAdmin
    .from('reports')
    .select('*, messages(*)')
    .eq('melder_token', token)
    .eq('organization_id', orgId)
    .single()

  if (error || !report) {
    return (
      <div className="max-w-md mx-auto text-center">
        <div className="bg-white rounded-xl border border-red-200 p-8">
          <p className="text-sm text-red-600 font-medium mb-2">{t('notFound')}</p>
          <p className="text-sm text-gray-500 mb-4">{t('notFoundHint')}</p>
          <Link
            href={`/melden/${slug}/status`}
            className="text-sm underline underline-offset-2 text-gray-600 hover:text-gray-900"
          >
            {t('retry')}
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

  const orgKey = await getOrgEncryptionKey(orgId)
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
  const categoryKey = report.category as string

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Meldungsübersicht */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-xs text-gray-400 font-mono mb-1">{token}</p>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {tPortal(`categories.${categoryKey}` as Parameters<typeof tPortal>[0]) || categoryKey} ·{' '}
              {t('report.received')} {formatDate(rest.received_at, locale)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${STATUS_CLASSES[status]}`}>
              {t(`statusLabels.${status}` as Parameters<typeof t>[0])}
            </span>
            <MelderPdfDownloadButton token={token} />
          </div>
        </div>

        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed border-t border-gray-100 pt-3">
          {description}
        </p>

        {/* Eingangsbestätigung */}
        {rest.confirmed_at ? (
          <p className="mt-3 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
            {t('report.confirmed', { date: formatDate(rest.confirmed_at, locale) })}
          </p>
        ) : (
          <p className="mt-3 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
            {t('report.pendingConfirmation')}
          </p>
        )}
      </div>

      {/* Kommunikationsverlauf */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('messages.heading')}
        </h3>

        {messages.length === 0 ? (
          <p className="text-sm text-gray-400 mb-4">{t('messages.empty')}</p>
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
                    {msg.sender === 'compliance' ? t('messages.senderCompliance') : t('messages.senderMelder')}
                  </span>
                  <span className="text-xs opacity-60">{formatDateTime(msg.created_at, locale)}</span>
                </div>
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            ))}
          </div>
        )}

        <div className={messages.length > 0 ? 'border-t border-gray-100 pt-4' : ''}>
          {!isAbgeschlossen && (
            <p className="text-xs text-gray-500 mb-3">{t('messages.replyLabel')}</p>
          )}
          <MelderReplyForm token={token} disabled={isAbgeschlossen} />
        </div>
      </div>

      {/* Datenschutzhinweis */}
      <p className="text-xs text-gray-400 text-center">{t('messages.privacy')}</p>
    </div>
  )
}
