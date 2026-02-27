import { NextRequest, NextResponse } from 'next/server'
import { createAdminSessionToken, ADMIN_COOKIE_NAME } from '@/lib/adminAuth'
import type { ErrorResponse } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    const adminEmail = process.env.ADMIN_EMAIL
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminEmail || !adminPassword) {
      return NextResponse.json<ErrorResponse>(
        { success: false, message: 'Admin-Zugang nicht konfiguriert' },
        { status: 500 }
      )
    }

    if (email !== adminEmail || password !== adminPassword) {
      // Künstliche Verzögerung gegen Brute-Force
      await new Promise((r) => setTimeout(r, 500))
      return NextResponse.json<ErrorResponse>(
        { success: false, message: 'Ungültige Anmeldedaten' },
        { status: 401 }
      )
    }

    const token = createAdminSessionToken()
    const response = NextResponse.json({ success: true })

    response.cookies.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60,
      path: '/',
    })

    return response
  } catch {
    return NextResponse.json<ErrorResponse>(
      { success: false, message: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
