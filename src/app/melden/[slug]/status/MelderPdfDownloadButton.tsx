'use client'

import { useState } from 'react'

export default function MelderPdfDownloadButton({ token }: { token: string }) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/token/${encodeURIComponent(token)}/pdf`)
      if (!res.ok) throw new Error('Fehler beim Generieren')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `meldung-${token}.pdf`
      const disposition = res.headers.get('Content-Disposition')
      if (disposition) {
        const match = disposition.match(/filename="([^"]+)"/)
        if (match) a.download = match[1]
      }
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('PDF konnte nicht generiert werden.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 bg-white
                 border border-gray-200 rounded-lg hover:border-gray-300 hover:text-gray-700
                 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <span className="inline-block w-3 h-3 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
          Wird erstellt…
        </>
      ) : (
        <>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          PDF speichern
        </>
      )}
    </button>
  )
}
