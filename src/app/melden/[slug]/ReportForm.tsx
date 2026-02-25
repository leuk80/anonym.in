'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { type ReportCategory } from '@/types'
import MelderPdfDownloadButton from './MelderPdfDownloadButton'

interface Props {
  slug: string
  orgName: string
}

type FormState = 'form' | 'success'

const CATEGORY_KEYS = ['korruption', 'betrug', 'datenschutz', 'diskriminierung', 'sicherheit', 'sonstiges'] as const

export default function ReportForm({ slug, orgName }: Props) {
  const t = useTranslations('portal')
  const [state, setState] = useState<FormState>('form')
  const [category, setCategory] = useState<ReportCategory | ''>('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [token, setToken] = useState('')
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch(`/api/reports?slug=${slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, title, description }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.message ?? t('form.error'))
      return
    }

    setToken(data.melder_token)
    setState('success')
  }

  async function copyToken() {
    await navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (state === 'success') {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('success.heading')}</h2>
          <p className="text-sm text-gray-500 mb-6">{t('success.subtext')}</p>

          {/* Token */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 mb-6">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              {t('success.tokenLabel')}
            </p>
            <p className="text-2xl font-mono font-bold text-gray-900 tracking-widest mb-3">{token}</p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <button
                onClick={copyToken}
                className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg
                           hover:bg-gray-100 transition-colors"
              >
                {copied ? t('success.copied') : t('success.copy')}
              </button>
              <MelderPdfDownloadButton token={token} />
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left text-sm text-amber-800">
            <p className="font-semibold mb-1">{t('success.warningTitle')}</p>
            <ul className="space-y-1 list-disc list-inside text-xs">
              <li>{t('success.warning1')}</li>
              <li>{t('success.warning2')}</li>
              <li>{t('success.warning3')}</li>
            </ul>
          </div>

          <p className="mt-5 text-sm text-gray-500">
            <a
              href={`/melden/${slug}/status?token=${token}`}
              className="text-gray-900 underline underline-offset-2"
            >
              {t('success.trackLink')}
            </a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <h2 className="text-base font-semibold text-gray-900 mb-1">{t('form.heading')}</h2>
        <p className="text-sm text-gray-500 mb-6">
          {t('form.intro', { orgName })}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Kategorie */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              {t('form.category')} <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value as ReportCategory)}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
                         disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">{t('form.categoryPlaceholder')}</option>
              {CATEGORY_KEYS.map((key) => (
                <option key={key} value={key}>{t(`categories.${key}`)}</option>
              ))}
            </select>
          </div>

          {/* Titel */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              {t('form.title')} <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              required
              minLength={5}
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              placeholder={t('form.titlePlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
                         disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          {/* Beschreibung */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              {t('form.description')} <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              required
              minLength={20}
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              placeholder={t('form.descriptionPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none
                         focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
                         disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-gray-900 text-white text-sm font-medium rounded-lg
                       hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? t('form.submitting') : t('form.submit')}
          </button>
        </form>

        {/* Datenschutzhinweis */}
        <div className="mt-5 pt-5 border-t border-gray-100">
          <p className="text-xs text-gray-400 leading-relaxed">{t('form.privacy')}</p>
        </div>
      </div>
    </div>
  )
}
