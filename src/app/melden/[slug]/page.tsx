import { getOrganizationBySlug } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import ReportForm from './ReportForm'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default async function MeldenPage({ params }: { params: { slug: string } }) {
  const org = await getOrganizationBySlug(params.slug)
  if (!org) notFound()

  const t = await getTranslations('portal')

  if (org.subscription_status === 'cancelled' || org.subscription_status === 'inactive') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md text-center">
          <p className="text-gray-500">{t('unavailable')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-xl font-semibold text-gray-900">{org.name}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('channelSubtitle')}</p>
        <div className="mt-3 flex justify-center">
          <LanguageSwitcher />
        </div>
      </div>
      <ReportForm slug={params.slug} orgName={org.name} />
      <p className="mt-6 text-center text-xs text-gray-400">
        {t('alreadyReported')}{' '}
        <a
          href={`/melden/${params.slug}/status`}
          className="underline underline-offset-2 hover:text-gray-600"
        >
          {t('checkStatus')}
        </a>
      </p>
    </div>
  )
}
