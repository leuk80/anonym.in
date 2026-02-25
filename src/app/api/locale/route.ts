import { NextRequest, NextResponse } from 'next/server'
import { locales, type Locale } from '@/i18n/locales'

export async function POST(req: NextRequest) {
  try {
    const { locale } = await req.json()
    if (!locale || !locales.includes(locale as Locale)) {
      return NextResponse.json({ success: false, message: 'Invalid locale' }, { status: 400 })
    }
    const res = NextResponse.json({ success: true })
    res.cookies.set('NEXT_LOCALE', locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
      httpOnly: false, // needs to be readable client-side for initial detection
    })
    return res
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid request' }, { status: 400 })
  }
}
