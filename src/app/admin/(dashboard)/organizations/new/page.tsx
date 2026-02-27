'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewOrganizationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ slug: string; organization_id: string } | null>(null)

  const [form, setForm] = useState({
    name: '',
    slug: '',
    contact_email: '',
    subscription_plan: 'starter',
    admin_email: '',
    admin_password: '',
    admin_name: '',
  })

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // Slug automatisch aus Name ableiten
  function handleNameChange(value: string) {
    const autoSlug = value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    setForm((prev) => ({ ...prev, name: value, slug: autoSlug }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch('/api/admin/dashboard/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.message ?? 'Fehler beim Anlegen der Organisation')
      return
    }

    setSuccess({ slug: data.slug, organization_id: data.organization_id })
  }

  if (success) {
    return (
      <div className="max-w-xl">
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-green-900 mb-2">Organisation angelegt</h2>
          <p className="text-sm text-green-800 mb-4">
            Die Organisation wurde erfolgreich erstellt. Das Meldeportal ist unter folgendem Link
            erreichbar:
          </p>
          <div className="bg-white border border-green-200 rounded-lg px-4 py-3 font-mono text-sm text-gray-800 mb-4">
            /melden/{success.slug}
          </div>
          <p className="text-xs text-green-700 mb-6">
            ID: <span className="font-mono">{success.organization_id}</span>
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/admin')}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg
                         hover:bg-gray-800 transition-colors"
            >
              Zur Übersicht
            </button>
            <button
              onClick={() => {
                setSuccess(null)
                setForm({
                  name: '',
                  slug: '',
                  contact_email: '',
                  subscription_plan: 'starter',
                  admin_email: '',
                  admin_password: '',
                  admin_name: '',
                })
              }}
              className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg
                         border border-gray-200 hover:border-gray-300 transition-colors"
            >
              Weitere anlegen
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Neue Organisation anlegen</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Organisation */}
        <fieldset>
          <legend className="text-sm font-medium text-gray-700 mb-3">Organisation</legend>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm text-gray-600 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                required
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Musterfirma GmbH"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="slug" className="block text-sm text-gray-600 mb-1">
                Slug (URL) <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center">
                <span className="px-3 py-2 bg-gray-50 border border-r-0 border-gray-300 rounded-l-lg text-sm text-gray-500">
                  /melden/
                </span>
                <input
                  id="slug"
                  type="text"
                  required
                  pattern="[a-z0-9-]+"
                  value={form.slug}
                  onChange={(e) => set('slug', e.target.value)}
                  placeholder="musterfirma-gmbh"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg text-sm
                             focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label htmlFor="contact_email" className="block text-sm text-gray-600 mb-1">
                Kontakt-E-Mail (für Benachrichtigungen) <span className="text-red-500">*</span>
              </label>
              <input
                id="contact_email"
                type="email"
                required
                value={form.contact_email}
                onChange={(e) => set('contact_email', e.target.value)}
                placeholder="compliance@musterfirma.de"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="plan" className="block text-sm text-gray-600 mb-1">
                Abo-Plan <span className="text-red-500">*</span>
              </label>
              <select
                id="plan"
                value={form.subscription_plan}
                onChange={(e) => set('subscription_plan', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
                           bg-white"
              >
                <option value="starter">Starter (49€/Monat – bis 250 MA)</option>
                <option value="professional">Professional (99€/Monat – bis 1.000 MA)</option>
                <option value="enterprise">Enterprise (199€/Monat – unbegrenzt)</option>
              </select>
            </div>
          </div>
        </fieldset>

        <hr className="border-gray-200" />

        {/* Compliance-Admin-User */}
        <fieldset>
          <legend className="text-sm font-medium text-gray-700 mb-3">
            Compliance-Admin-Zugang
          </legend>
          <div className="space-y-4">
            <div>
              <label htmlFor="admin_name" className="block text-sm text-gray-600 mb-1">
                Name (optional)
              </label>
              <input
                id="admin_name"
                type="text"
                value={form.admin_name}
                onChange={(e) => set('admin_name', e.target.value)}
                placeholder="Max Mustermann"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="admin_email" className="block text-sm text-gray-600 mb-1">
                E-Mail <span className="text-red-500">*</span>
              </label>
              <input
                id="admin_email"
                type="email"
                required
                value={form.admin_email}
                onChange={(e) => set('admin_email', e.target.value)}
                placeholder="admin@musterfirma.de"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="admin_password" className="block text-sm text-gray-600 mb-1">
                Passwort (mind. 12 Zeichen) <span className="text-red-500">*</span>
              </label>
              <input
                id="admin_password"
                type="password"
                required
                minLength={12}
                value={form.admin_password}
                onChange={(e) => set('admin_password', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">
                Dieses Passwort erhält der Kunde für den Login unter /login.
              </p>
            </div>
          </div>
        </fieldset>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg
                       hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2
                       focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
          >
            {loading ? 'Anlegen …' : 'Organisation anlegen'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin')}
            className="px-6 py-2.5 bg-white text-gray-700 text-sm font-medium rounded-lg
                       border border-gray-200 hover:border-gray-300 transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  )
}
