import { getRequestConfig } from 'next-intl/server'
import { cookies, headers } from 'next/headers'
import { locales, defaultLocale, type Locale } from './locales'

function detectLocale(): Locale {
  const cookieStore = cookies()
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value
  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    return cookieLocale as Locale
  }

  const acceptLang = headers().get('accept-language') ?? ''
  for (const part of acceptLang.split(',')) {
    const tag = part.split(';')[0].trim().toLowerCase()
    // Try exact match (e.g. "de-AT" → "de")
    const lang = tag.slice(0, 2) as Locale
    if (locales.includes(lang)) return lang
  }

  return defaultLocale
}

export default getRequestConfig(async () => {
  const locale = detectLocale()
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
