import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import type { SubscriptionStatus, SubscriptionPlan } from '@/types'

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  trial: 'Trial',
  active: 'Aktiv',
  inactive: 'Inaktiv',
  cancelled: 'Gekündigt',
}

const STATUS_CLASSES: Record<SubscriptionStatus, string> = {
  trial: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-800',
}

const PLAN_LABELS: Record<NonNullable<SubscriptionPlan>, string> = {
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
}

export default async function AdminDashboardPage() {
  // Organisationen laden
  const { data: orgs } = await supabaseAdmin
    .from('organizations')
    .select('id, name, slug, contact_email, subscription_status, subscription_plan, created_at')
    .order('created_at', { ascending: false })

  // Meldungen pro Organisation zählen
  const { data: reportRows } = await supabaseAdmin
    .from('reports')
    .select('organization_id')

  const reportCountByOrg = (reportRows ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.organization_id] = (acc[r.organization_id] ?? 0) + 1
    return acc
  }, {})

  const organizations = orgs ?? []
  const totalReports = reportRows?.length ?? 0

  const stats = {
    total: organizations.length,
    active: organizations.filter((o) => o.subscription_status === 'active').length,
    trial: organizations.filter((o) => o.subscription_status === 'trial').length,
    inactive: organizations.filter(
      (o) => o.subscription_status === 'inactive' || o.subscription_status === 'cancelled'
    ).length,
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Kunden-Übersicht</h1>
        <Link
          href="/admin/organizations/new"
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg
                     hover:bg-gray-800 transition-colors"
        >
          + Neue Organisation
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Organisationen gesamt" value={stats.total} />
        <StatCard label="Aktive Abos" value={stats.active} color="green" />
        <StatCard label="Im Trial" value={stats.trial} color="blue" />
        <StatCard label="Meldungen gesamt" value={totalReports} color="amber" />
      </div>

      {/* Tabelle */}
      {organizations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          Noch keine Organisationen angelegt.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Organisation
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Plan
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Meldungen
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Angelegt
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Portal
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {organizations.map((org) => (
                <tr key={org.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{org.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{org.contact_email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {org.subscription_plan
                      ? PLAN_LABELS[org.subscription_plan as NonNullable<SubscriptionPlan>]
                      : '–'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium
                        ${STATUS_CLASSES[org.subscription_status as SubscriptionStatus]}`}
                    >
                      {STATUS_LABELS[org.subscription_status as SubscriptionStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {reportCountByOrg[org.id] ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {formatDate(org.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={`/melden/${org.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      /{org.slug} ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
  color?: 'green' | 'blue' | 'amber'
}) {
  const colorMap: Record<string, string> = {
    green: 'text-green-600',
    blue: 'text-blue-600',
    amber: 'text-amber-600',
  }
  const colorClass = color ? colorMap[color] : 'text-gray-900'

  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${colorClass}`}>{value}</p>
    </div>
  )
}
