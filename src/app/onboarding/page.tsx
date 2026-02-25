'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

type Plan = 'starter' | 'professional' | 'enterprise'

const PLANS: { key: Plan; name: string; price: string; employees: string; popular: boolean }[] = [
  { key: 'starter', name: 'Starter', price: '49', employees: '50 – 249 Mitarbeiter', popular: false },
  { key: 'professional', name: 'Professional', price: '99', employees: '250 – 999 Mitarbeiter', popular: true },
  { key: 'enterprise', name: 'Enterprise', price: '199', employees: 'ab 1.000 Mitarbeiter', popular: false },
]

interface FormData {
  org_name: string
  slug: string
  contact_email: string
  subscription_plan: Plan
  admin_name: string
  admin_email: string
  admin_password: string
  admin_password_confirm: string
}

interface SuccessData {
  organization_id: string
  slug: string
  encryption_key: string
  env_var_name: string
}

const STEPS = ['Unternehmen', 'Plan wählen', 'Admin-Account']

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[äÄ]/g, 'ae')
    .replace(/[öÖ]/g, 'oe')
    .replace(/[üÜ]/g, 'ue')
    .replace(/[ß]/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function PasswordStrength({ password }: { password: string }) {
  const len = password.length
  const hasUpper = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[^a-zA-Z0-9]/.test(password)
  const score = (len >= 12 ? 1 : 0) + (hasUpper ? 1 : 0) + (hasNumber ? 1 : 0) + (hasSpecial ? 1 : 0)

  if (!password) return null

  const levels = [
    { label: 'Zu schwach', color: 'bg-red-500' },
    { label: 'Schwach', color: 'bg-orange-400' },
    { label: 'Gut', color: 'bg-yellow-400' },
    { label: 'Stark', color: 'bg-green-500' },
    { label: 'Sehr stark', color: 'bg-green-600' },
  ]
  const level = levels[Math.min(score, 4)]

  return (
    <div className="mt-1.5">
      <div className="flex gap-1 mb-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${i < score ? level.color : 'bg-gray-200'}`}
          />
        ))}
      </div>
      <p className="text-xs text-gray-500">{level.label}</p>
    </div>
  )
}

function OnboardingForm() {
  const searchParams = useSearchParams()
  const initialPlan = (searchParams.get('plan') as Plan | null) ?? 'professional'

  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [success, setSuccess] = useState<SuccessData | null>(null)
  const [slugEdited, setSlugEdited] = useState(false)
  const [copied, setCopied] = useState(false)

  const [form, setForm] = useState<FormData>({
    org_name: '',
    slug: '',
    contact_email: '',
    subscription_plan: initialPlan,
    admin_name: '',
    admin_email: '',
    admin_password: '',
    admin_password_confirm: '',
  })

  // Auto-generate slug from org name
  useEffect(() => {
    if (!slugEdited && form.org_name) {
      setForm((f) => ({ ...f, slug: slugify(form.org_name) }))
    }
  }, [form.org_name, slugEdited])

  function set(field: keyof FormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    setError(null)
    setFieldError(null)
  }

  function validateStep(): string | null {
    if (step === 0) {
      if (!form.org_name.trim()) return 'Bitte geben Sie den Unternehmensnamen ein.'
      if (!form.slug.trim() || !/^[a-z0-9-]+$/.test(form.slug))
        return 'URL darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.'
      if (!form.contact_email.trim() || !form.contact_email.includes('@'))
        return 'Bitte geben Sie eine gültige E-Mail-Adresse ein.'
    }
    if (step === 2) {
      if (!form.admin_email.trim() || !form.admin_email.includes('@'))
        return 'Bitte geben Sie eine gültige Admin-E-Mail ein.'
      if (form.admin_password.length < 12)
        return 'Das Passwort muss mindestens 12 Zeichen lang sein.'
      if (form.admin_password !== form.admin_password_confirm)
        return 'Die Passwörter stimmen nicht überein.'
    }
    return null
  }

  function next() {
    const err = validateStep()
    if (err) { setError(err); return }
    setStep((s) => s + 1)
    setError(null)
  }

  async function submit() {
    const err = validateStep()
    if (err) { setError(err); return }

    setLoading(true)
    setError(null)
    setFieldError(null)

    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_name: form.org_name,
          slug: form.slug,
          contact_email: form.contact_email,
          subscription_plan: form.subscription_plan,
          admin_name: form.admin_name,
          admin_email: form.admin_email,
          admin_password: form.admin_password,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        if (data.message === 'slug_taken') {
          setStep(0)
          setFieldError('Diese URL ist bereits vergeben. Bitte wählen Sie eine andere.')
        } else if (data.message === 'email_taken') {
          setFieldError('Diese E-Mail-Adresse ist bereits registriert.')
        } else {
          setError(data.message ?? 'Unbekannter Fehler')
        }
        return
      }

      setSuccess({
        organization_id: data.organization_id,
        slug: data.slug,
        encryption_key: data.encryption_key,
        env_var_name: data.env_var_name,
      })
    } catch {
      setError('Netzwerkfehler. Bitte versuchen Sie es erneut.')
    } finally {
      setLoading(false)
    }
  }

  async function copyKey() {
    await navigator.clipboard.writeText(success!.encryption_key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Success screen
  if (success) {
    const portalUrl = `/melden/${success.slug}`
    return (
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-full mb-4">
            <span className="text-2xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Ihr Account ist bereit!</h1>
          <p className="mt-2 text-sm text-gray-500">
            Ihr Meldekanal ist eingerichtet und empfangsbereit.
          </p>
        </div>

        <div className="space-y-4">
          {/* Portal URL */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 mb-2">Ihr Meldekanal</p>
            <div className="flex items-center justify-between gap-3">
              <code className="text-sm text-gray-900 font-mono break-all">
                anonym.in{portalUrl}
              </code>
              <Link
                href={portalUrl}
                target="_blank"
                className="shrink-0 text-xs border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
              >
                Öffnen →
              </Link>
            </div>
          </div>

          {/* Encryption Key Warning */}
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-xl mt-0.5">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-amber-900">Wichtig: Encryption Key</p>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  Ihr Verschlüsselungs-Key muss einmalig als Umgebungsvariable auf dem Server eingetragen
                  werden, bevor Meldungen verschlüsselt werden können. Notieren Sie den Key jetzt – er
                  wird nur einmalig angezeigt und kann <strong>nicht wiederhergestellt</strong> werden.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-amber-700 mb-1">Env-Var Name:</p>
                <code className="block text-xs bg-amber-100 rounded px-2 py-1 font-mono break-all text-amber-900">
                  {success.env_var_name}
                </code>
              </div>
              <div>
                <p className="text-xs text-amber-700 mb-1">Encryption Key (einmalig angezeigt):</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-amber-100 rounded px-2 py-1 font-mono break-all text-amber-900">
                    {success.encryption_key}
                  </code>
                  <button
                    onClick={copyKey}
                    className="shrink-0 text-xs bg-amber-200 hover:bg-amber-300 text-amber-900 rounded px-2 py-1 transition-colors"
                  >
                    {copied ? '✓' : 'Kopieren'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Setup instructions */}
          <div className="bg-gray-50 rounded-xl border border-gray-100 p-5">
            <p className="text-xs font-medium text-gray-700 mb-2">Nächste Schritte</p>
            <ol className="space-y-1.5 text-xs text-gray-600 list-decimal list-inside">
              <li>Notieren Sie den Encryption Key und den Env-Var Namen sicher (z.B. Passwortmanager).</li>
              <li>Senden Sie den Key an Ihren Server-Administrator oder tragen Sie ihn selbst als Env-Var ein.</li>
              <li>Sobald der Key gesetzt ist, können Sie sich einloggen und Meldungen empfangen.</li>
              <li>Verteilen Sie den Meldekanal-Link an Ihre Mitarbeiter.</li>
            </ol>
          </div>

          <Link
            href="/login"
            className="block text-center bg-gray-900 text-white text-sm font-medium py-3 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Zum Login →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      {/* Step indicator */}
      <div className="flex items-center mb-8 gap-0">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  i < step
                    ? 'bg-gray-900 text-white'
                    : i === step
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs mt-1 whitespace-nowrap ${i === step ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-2 mb-4 ${i < step ? 'bg-gray-900' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-7">
        {/* Step 0: Unternehmen */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-900 mb-5">Ihr Unternehmen</h2>

            <Field label="Unternehmensname *" htmlFor="org_name">
              <input
                id="org_name"
                type="text"
                value={form.org_name}
                onChange={(e) => set('org_name', e.target.value)}
                placeholder="Mustermann GmbH"
                className={INPUT_CLASS}
              />
            </Field>

            <Field
              label="URL Ihres Meldekanals *"
              htmlFor="slug"
              hint={`anonym.in/melden/${form.slug || 'ihr-unternehmen'}`}
              error={fieldError && fieldError.includes('URL') ? fieldError : undefined}
            >
              <input
                id="slug"
                type="text"
                value={form.slug}
                onChange={(e) => {
                  setSlugEdited(true)
                  set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                }}
                placeholder="mustermann-gmbh"
                className={INPUT_CLASS}
              />
            </Field>

            <Field label="Kontakt-E-Mail (intern) *" htmlFor="contact_email">
              <input
                id="contact_email"
                type="email"
                value={form.contact_email}
                onChange={(e) => set('contact_email', e.target.value)}
                placeholder="compliance@mustermann.de"
                className={INPUT_CLASS}
              />
            </Field>
          </div>
        )}

        {/* Step 1: Plan */}
        {step === 1 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 mb-5">Abo-Plan wählen</h2>
            {PLANS.map((plan) => (
              <label
                key={plan.key}
                className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
                  form.subscription_plan === plan.key
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="plan"
                    value={plan.key}
                    checked={form.subscription_plan === plan.key}
                    onChange={() => set('subscription_plan', plan.key)}
                    className="accent-gray-900"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{plan.name}</span>
                      {plan.popular && (
                        <span className="text-xs bg-gray-900 text-white rounded-full px-2 py-0.5">Beliebt</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">{plan.employees}</span>
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-900">{plan.price} € / Mo.</span>
              </label>
            ))}
            <p className="text-xs text-gray-400 pt-1">
              14 Tage kostenlos testen · Keine Kreditkarte erforderlich
            </p>
          </div>
        )}

        {/* Step 2: Admin-Account */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-900 mb-5">Ihr Admin-Account</h2>

            <Field label="Ihr Name" htmlFor="admin_name">
              <input
                id="admin_name"
                type="text"
                value={form.admin_name}
                onChange={(e) => set('admin_name', e.target.value)}
                placeholder="Max Mustermann"
                className={INPUT_CLASS}
              />
            </Field>

            <Field
              label="Login E-Mail *"
              htmlFor="admin_email"
              error={fieldError && fieldError.includes('E-Mail') ? fieldError : undefined}
            >
              <input
                id="admin_email"
                type="email"
                value={form.admin_email}
                onChange={(e) => set('admin_email', e.target.value)}
                placeholder="max@mustermann.de"
                className={INPUT_CLASS}
                autoComplete="email"
              />
            </Field>

            <Field label="Passwort * (mind. 12 Zeichen)" htmlFor="admin_password">
              <input
                id="admin_password"
                type="password"
                value={form.admin_password}
                onChange={(e) => set('admin_password', e.target.value)}
                className={INPUT_CLASS}
                autoComplete="new-password"
              />
              <PasswordStrength password={form.admin_password} />
            </Field>

            <Field label="Passwort wiederholen *" htmlFor="admin_password_confirm">
              <input
                id="admin_password_confirm"
                type="password"
                value={form.admin_password_confirm}
                onChange={(e) => set('admin_password_confirm', e.target.value)}
                className={INPUT_CLASS}
                autoComplete="new-password"
              />
              {form.admin_password_confirm && form.admin_password !== form.admin_password_confirm && (
                <p className="text-xs text-red-600 mt-1">Passwörter stimmen nicht überein.</p>
              )}
            </Field>
          </div>
        )}

        {/* Error */}
        {(error || (fieldError && step !== 0)) && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error ?? fieldError}
          </p>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          {step > 0 && (
            <button
              type="button"
              onClick={() => { setStep((s) => s - 1); setError(null) }}
              disabled={loading}
              className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              ← Zurück
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={next}
              className="flex-1 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              Weiter →
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={loading}
              className="flex-1 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Wird erstellt …' : 'Account erstellen'}
            </button>
          )}
        </div>
      </div>

      <p className="mt-5 text-center text-xs text-gray-400">
        Bereits registriert?{' '}
        <Link href="/login" className="underline hover:text-gray-600">
          Anmelden
        </Link>
      </p>
    </div>
  )
}

// Helper components
const INPUT_CLASS =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent'

function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string
  htmlFor: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start py-12 px-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <Link href="/" className="text-xl font-bold text-gray-900">
          anonym.in
        </Link>
        <p className="text-sm text-gray-500 mt-1">Compliance Hotline – Einrichtung</p>
      </div>

      <Suspense fallback={<div className="w-full max-w-md h-96 bg-white rounded-xl border border-gray-200 animate-pulse" />}>
        <OnboardingForm />
      </Suspense>
    </div>
  )
}
