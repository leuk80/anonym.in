import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { decryptFromString, getOrgEncryptionKey } from '@/lib/crypto'
import { REPORT_CATEGORIES, type DecryptedReport, type ReportStatus } from '@/types'
import Link from 'next/link'

const STATUS_LABELS: Record<ReportStatus, string> = {
  neu: 'Neu',
  in_bearbeitung: 'In Bearbeitung',
  abgeschlossen: 'Abgeschlossen',
}

const STATUS_CLASSES: Record<ReportStatus, string> = {
  neu: 'bg-blue-100 text-blue-800',
  in_bearbeitung: 'bg-amber-100 text-amber-800',
  abgeschlossen: 'bg-green-100 text-green-800',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function daysUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) return null

  const orgId = session.user.organizationId
  const orgKey = getOrgEncryptionKey(orgId)
  const now = new Date()

  const { data: rawReports } = await supabaseAdmin
    .from('reports')
    .select('*, messages(id, sender, is_read)')
    .eq('organization_id', orgId)
    .order('received_at', { ascending: false })

  const reports: DecryptedReport[] = (rawReports ?? []).map((r) => {
    const { title_encrypted, description_encrypted, messages, ...rest } = r
    return {
      ...rest,
      title: decryptFromString(title_encrypted, orgKey),
      description: decryptFromString(description_encrypted, orgKey),
      is_overdue: new Date(r.response_deadline) < now && r.status !== 'abgeschlossen',
      unread_messages:
        messages?.filter((m: { sender: string; is_read: boolean }) => m.sender === 'melder' && !m.is_read).length ?? 0,
    }
  })

  // Statistiken
  const stats = {
    total: reports.length,
    neu: reports.filter((r) => r.status === 'neu').length,
    in_bearbeitung: reports.filter((r) => r.status === 'in_bearbeitung').length,
    abgeschlossen: reports.filter((r) => r.status === 'abgeschlossen').length,
    overdue: reports.filter((r) => r.is_overdue).length,
  }

  // Filter
  const activeFilter = searchParams.status ?? 'alle'
  const filtered = reports.filter((r) => {
    if (activeFilter === 'overdue') return r.is_overdue
    if (activeFilter === 'alle') return true
    return r.status === activeFilter
  })

  const filters = [
    { key: 'alle', label: 'Alle', count: stats.total },
    { key: 'neu', label: 'Neu', count: stats.neu },
    { key: 'in_bearbeitung', label: 'In Bearbeitung', count: stats.in_bearbeitung },
    { key: 'abgeschlossen', label: 'Abgeschlossen', count: stats.abgeschlossen },
    { key: 'overdue', label: 'Überfällig', count: stats.overdue },
  ]

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Meldungen</h1>

      {/* Statistik-Karten */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Gesamt" value={stats.total} />
        <StatCard label="Neu" value={stats.neu} color="blue" />
        <StatCard label="In Bearbeitung" value={stats.in_bearbeitung} color="amber" />
        <StatCard label="Überfällig" value={stats.overdue} color="red" />
      </div>

      {/* Filter-Tabs */}
      <div className="flex gap-2 flex-wrap mb-4">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={f.key === 'alle' ? '/dashboard' : `/dashboard?status=${f.key}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${activeFilter === f.key
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
              }`}
          >
            {f.label}
            <span className={`ml-1.5 text-xs ${activeFilter === f.key ? 'text-gray-300' : 'text-gray-400'}`}>
              {f.count}
            </span>
          </Link>
        ))}
      </div>

      {/* Meldungs-Liste */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          Keine Meldungen gefunden.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((report) => {
            const confirmDays = daysUntil(report.confirmation_deadline)
            const responseDays = daysUntil(report.response_deadline)
            const confirmOverdue = !report.confirmed_at && confirmDays < 0
            const responseOverdue = report.is_overdue

            return (
              <Link
                key={report.id}
                href={`/dashboard/reports/${report.id}`}
                className="block bg-white rounded-xl border border-gray-200 px-5 py-4
                           hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${STATUS_CLASSES[report.status]}`}>
                        {STATUS_LABELS[report.status]}
                      </span>
                      <span className="text-xs text-gray-400">
                        {REPORT_CATEGORIES[report.category as keyof typeof REPORT_CATEGORIES] ?? report.category}
                      </span>
                      {report.unread_messages > 0 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {report.unread_messages} neu
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">{report.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Eingegangen: {formatDate(report.received_at)} · Token: {report.melder_token}
                    </p>
                  </div>

                  {/* Fristen */}
                  <div className="text-right text-xs shrink-0">
                    {!report.confirmed_at && (
                      <p className={confirmOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}>
                        Bestätigung: {confirmOverdue ? `${Math.abs(confirmDays)}d überfällig` : `${confirmDays}d`}
                      </p>
                    )}
                    <p className={responseOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}>
                      Rückmeldung: {responseOverdue ? `${Math.abs(responseDays)}d überfällig` : `${responseDays}d`}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color?: 'blue' | 'amber' | 'red'
}) {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
  }
  const colorClass = (color ? colorMap[color] : null) ?? 'text-gray-900'

  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${colorClass}`}>{value}</p>
    </div>
  )
}
