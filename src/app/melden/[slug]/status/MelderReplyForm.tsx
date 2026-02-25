'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

interface Props {
  token: string
  disabled?: boolean
}

export default function MelderReplyForm({ token, disabled }: Props) {
  const t = useTranslations('status.messages')
  const router = useRouter()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (disabled) {
    return (
      <p className="text-sm text-gray-400 bg-gray-50 rounded-lg px-4 py-3">
        {t('closed')}
      </p>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setError(null)
    setLoading(true)

    const res = await fetch(`/api/reports/token/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: content.trim() }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.message ?? t('errorSend'))
      return
    }

    setContent('')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={loading}
        rows={4}
        placeholder={t('replyPlaceholder')}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none
                   focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
                   disabled:bg-gray-50 disabled:text-gray-400"
      />
      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading || !content.trim()}
        className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg
                   hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? t('sending') : t('send')}
      </button>
    </form>
  )
}
