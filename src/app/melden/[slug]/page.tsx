import { getOrganizationBySlug } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import ReportForm from './ReportForm'

export default async function MeldenPage({ params }: { params: { slug: string } }) {
  const org = await getOrganizationBySlug(params.slug)
  if (!org) notFound()

  if (org.subscription_status === 'cancelled' || org.subscription_status === 'inactive') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md text-center">
          <p className="text-gray-500">Dieser Meldekanal ist derzeit nicht verfügbar.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-xl font-semibold text-gray-900">{org.name}</h1>
        <p className="mt-1 text-sm text-gray-500">Anonymer Compliance-Meldekanal</p>
      </div>
      <ReportForm slug={params.slug} orgName={org.name} />
      <p className="mt-6 text-center text-xs text-gray-400">
        Meldung bereits eingereicht?{' '}
        <a
          href={`/melden/${params.slug}/status`}
          className="underline underline-offset-2 hover:text-gray-600"
        >
          Status prüfen
        </a>
      </p>
    </div>
  )
}
