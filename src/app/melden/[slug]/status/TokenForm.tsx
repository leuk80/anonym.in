'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  slug: string
}

export default function TokenForm({ slug }: Props) {
  const router = useRouter()
  const [token, setToken] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const clean = token.trim().toUpperCase()
    if (clean) router.push(`/melden/${slug}/status?token=${clean}`)
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Meldung verfolgen</h2>
        <p className="text-sm text-gray-500 mb-6">
          Geben Sie Ihren Zugangscode ein, um den Status Ihrer Meldung zu sehen und Nachrichten zu lesen.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-1">
              Zugangscode
            </label>
            <input
              id="token"
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="z.B. WOLF-7342-BLAU"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono
                         focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
                         uppercase placeholder:normal-case placeholder:font-sans"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg
                       hover:bg-gray-800 transition-colors"
          >
            Status anzeigen
          </button>
        </form>
      </div>
    </div>
  )
}
