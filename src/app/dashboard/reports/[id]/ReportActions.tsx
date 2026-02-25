'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ReportStatus } from '@/types'

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

interface Props {
  reportId: string
  currentStatus: ReportStatus
  confirmedAt: string | null
}

export default function ReportActions({ reportId, currentStatus, confirmedAt }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function patch(body: object) {
    setError(null)
    setLoading(true)
    const res = await fetch(`/api/dashboard/reports/${reportId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.message ?? 'Fehler beim Speichern')
      return
    }
    router.refresh()
  }

  const nextStatuses = (['neu', 'in_bearbeitung', 'abgeschlossen'] as ReportStatus[]).filter(
    (s) => s !== currentStatus
  )

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-900">Status & Fristen</h2>

      {/* Aktueller Status */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Aktuell:</span>
        <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${STATUS_CLASSES[currentStatus]}`}>
          {STATUS_LABELS[currentStatus]}
        </span>
      </div>

      {/* Status ändern */}
      <div className="flex flex-wrap gap-2">
        {nextStatuses.map((s) => (
          <button
            key={s}
            disabled={loading}
            onClick={() => patch({ status: s })}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200
                       hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            → {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Eingangsbestätigung */}
      {confirmedAt ? (
        <p className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
          Eingang bestätigt am{' '}
          {new Date(confirmedAt).toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </p>
      ) : (
        <button
          disabled={loading}
          onClick={() => patch({ confirmed_at: new Date().toISOString() })}
          className="w-full py-2 px-3 text-xs font-medium text-white bg-gray-900 rounded-lg
                     hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Eingang bestätigen (HinSchG 7-Tage-Frist)
        </button>
      )}

      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}
    </div>
  )
}
