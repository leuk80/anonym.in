import Link from 'next/link'

const FEATURES = [
  {
    icon: '🔒',
    title: '100 % Anonym',
    text: 'Keine IP-Adressen, keine Cookies, keine E-Mails. AES-256-GCM-Verschlüsselung. Anonymität technisch sichergestellt – nicht nur versprochen.',
  },
  {
    icon: '⚖️',
    title: 'EU-konform & HinSchG',
    text: 'Alle gesetzlichen Fristen automatisch überwacht: 7-Tage-Eingangsbestätigung, 3-Monate-Rückmeldung. Berichte exportierbar für Prüfungen.',
  },
  {
    icon: '💬',
    title: 'Zwei-Wege-Kommunikation',
    text: 'Melder können anonym antworten – über einen einzigartigen Token-Rückkanal. Vollständig verschlüsselt, ohne Identitätspreisgabe.',
  },
  {
    icon: '🇩🇪',
    title: 'EU-Hosting (Deutschland)',
    text: 'Server ausschließlich in Deutschland. DSGVO-konform, kein Drittland-Transfer, kein US-Cloud-Anbieter.',
  },
]

const PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    price: '49',
    employees: '50 – 249 Mitarbeiter',
    popular: false,
    features: [
      'Eigener Meldekanal (anonym.in/melden/ihr-slug)',
      'Unbegrenzte Meldungen',
      'Fristenüberwachung (HinSchG)',
      'PDF-Export zur Dokumentation',
      'Zwei-Wege-Kommunikation',
      'DSGVO-Datenspeicherung (3 Jahre)',
      '1 Compliance-User',
    ],
  },
  {
    key: 'professional',
    name: 'Professional',
    price: '99',
    employees: '250 – 999 Mitarbeiter',
    popular: true,
    features: [
      'Alles aus Starter',
      'Bis zu 5 Compliance-User',
      'Prioritäts-Support',
      'Eigene E-Mail-Benachrichtigungen',
      'Erweiterte Statistiken',
    ],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: '199',
    employees: 'ab 1.000 Mitarbeiter',
    popular: false,
    features: [
      'Alles aus Professional',
      'Unbegrenzte Compliance-User',
      'Dedizierter Support',
      'SLA-Garantie',
      'API-Zugang',
      'Individuelle Anpassungen',
    ],
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <span className="font-semibold text-gray-900 text-lg">anonym.in</span>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Anmelden
            </Link>
            <Link
              href="/onboarding"
              className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Kostenlos testen
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-20 pb-16 text-center">
        <span className="inline-block text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-full px-3 py-1 mb-6">
          EU-Whistleblower-Richtlinie 2019/1937 · HinSchG konform
        </span>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-5">
          Anonyme Compliance-Meldungen
          <br />
          <span className="text-gray-400">einfach, sicher, gesetzeskonform.</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-8">
          anonym.in bietet KMU ab 50 Mitarbeitern eine schlüsselfertige Whistleblowing-Lösung.
          In 5 Minuten eingerichtet. Server in Deutschland.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/onboarding"
            className="bg-gray-900 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            14 Tage kostenlos testen →
          </Link>
          <Link
            href="/login"
            className="border border-gray-200 text-gray-700 px-6 py-3 rounded-lg text-sm font-medium hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Zum Dashboard
          </Link>
        </div>
        <p className="mt-4 text-xs text-gray-400">Keine Kreditkarte erforderlich · Kündigung jederzeit</p>
      </section>

      {/* Legal callout */}
      <section className="bg-amber-50 border-y border-amber-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-sm font-medium text-amber-900">
              Unternehmen ab 50 Mitarbeitern sind gesetzlich verpflichtet
            </p>
            <p className="text-sm text-amber-700 mt-0.5">
              Seit dem 17. Dezember 2023 schreibt das Hinweisgeberschutzgesetz (HinSchG §12) die Einrichtung
              eines internen Meldekanals vor. Bußgelder bis zu{' '}
              <strong>50.000 €</strong> drohen bei Verstoß.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">
          Alles was Sie brauchen
        </h2>
        <p className="text-gray-500 text-center mb-12 text-sm">
          Technisch durchdacht, rechtlich abgesichert, operativ einfach.
        </p>
        <div className="grid sm:grid-cols-2 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-gray-50 rounded-xl p-6 border border-gray-100">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">So funktioniert es</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Kanal einrichten',
                text: 'Registrieren Sie sich und erhalten Sie sofort Ihren eigenen Meldekanal unter anonym.in/melden/ihr-unternehmen.',
              },
              {
                step: '02',
                title: 'Melder erstatten Hinweise',
                text: 'Mitarbeiter rufen den Link auf, schildern den Sachverhalt – vollständig anonym, kein Account nötig.',
              },
              {
                step: '03',
                title: 'Sie bearbeiten im Dashboard',
                text: 'Empfangen, beantworten und dokumentieren Sie Meldungen. Fristen werden automatisch überwacht.',
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <span className="inline-block text-3xl font-bold text-gray-200 mb-3">{item.step}</span>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-20" id="preise">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">Transparente Preise</h2>
        <p className="text-gray-500 text-center mb-12 text-sm">
          14 Tage kostenlos testen. Keine Einrichtungsgebühr. Kündigung jederzeit.
        </p>
        <div className="grid sm:grid-cols-3 gap-5">
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              className={`rounded-xl border p-6 flex flex-col relative ${
                plan.popular
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-700 text-white text-xs font-medium px-3 py-1 rounded-full">
                  Beliebt
                </span>
              )}
              <div className="mb-5">
                <h3 className={`font-semibold text-lg mb-0.5 ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                  {plan.name}
                </h3>
                <p className={`text-xs mb-4 ${plan.popular ? 'text-gray-400' : 'text-gray-500'}`}>
                  {plan.employees}
                </p>
                <div className="flex items-end gap-1">
                  <span className={`text-4xl font-bold ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                    {plan.price} €
                  </span>
                  <span className={`text-sm mb-1 ${plan.popular ? 'text-gray-400' : 'text-gray-500'}`}>
                    / Monat
                  </span>
                </div>
              </div>
              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className={`text-sm flex items-start gap-2 ${plan.popular ? 'text-gray-300' : 'text-gray-600'}`}>
                    <span className={`mt-0.5 text-xs ${plan.popular ? 'text-gray-400' : 'text-gray-400'}`}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={`/onboarding?plan=${plan.key}`}
                className={`block text-center text-sm font-medium py-2.5 rounded-lg transition-colors ${
                  plan.popular
                    ? 'bg-white text-gray-900 hover:bg-gray-100'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {plan.name} wählen
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Trust badges */}
      <section className="border-t border-gray-100 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {[
              { label: 'Server-Standort', value: 'Deutschland' },
              { label: 'Verschlüsselung', value: 'AES-256-GCM' },
              { label: 'Datenspeicherung', value: 'DSGVO-konform' },
              { label: 'Gesetzliche Basis', value: 'HinSchG & EU 2019/1937' },
            ].map((item) => (
              <div key={item.label} className="py-3">
                <div className="text-sm font-semibold text-gray-900">{item.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-semibold text-gray-900">anonym.in</span>
          <div className="flex items-center gap-5 text-xs text-gray-400">
            <span>© {new Date().getFullYear()} anonym.in</span>
            <a href="#" className="hover:text-gray-600">Impressum</a>
            <a href="#" className="hover:text-gray-600">Datenschutz</a>
            <a href="#" className="hover:text-gray-600">AGB</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
