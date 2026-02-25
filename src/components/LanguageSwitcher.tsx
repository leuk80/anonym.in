'use client'

import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { locales, localeNames, type Locale } from '@/i18n/locales'

export default function LanguageSwitcher() {
  const router = useRouter()
  const currentLocale = useLocale()

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const locale = e.target.value as Locale
    await fetch('/api/locale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale }),
    })
    router.refresh()
  }

  return (
    <select
      value={currentLocale}
      onChange={handleChange}
      aria-label="Language / Sprache"
      className="text-xs text-gray-500 bg-transparent border border-gray-200 rounded-md px-2 py-1
                 hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400
                 cursor-pointer"
    >
      {locales.map((loc) => (
        <option key={loc} value={loc}>
          {localeNames[loc]}
        </option>
      ))}
    </select>
  )
}
