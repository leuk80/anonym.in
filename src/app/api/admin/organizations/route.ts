import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import {
  generateEncryptionKey,
  hashPassword,
  hashValue,
  wrapOrgKey,
} from '@/lib/crypto'
import type {
  CreateOrganizationRequest,
  CreateOrganizationResponse,
  ErrorResponse,
  SubscriptionPlan,
} from '@/types'

const VALID_PLANS: SubscriptionPlan[] = ['starter', 'professional', 'enterprise']

// Gesichert mit ADMIN_SECRET_KEY (Authorization: Bearer ...)
function checkAdminAuth(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET_KEY
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json<ErrorResponse>(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const body: CreateOrganizationRequest = await req.json()
    const { name, slug, contact_email, subscription_plan, admin_email, admin_password, admin_name } = body

    // Validierung
    if (!name?.trim() || !slug?.trim() || !contact_email?.trim()) {
      return NextResponse.json<ErrorResponse>(
        { success: false, message: 'name, slug und contact_email sind Pflichtfelder' },
        { status: 400 }
      )
    }
    if (!VALID_PLANS.includes(subscription_plan)) {
      return NextResponse.json<ErrorResponse>(
        { success: false, message: `Ungültiger Plan. Erlaubt: ${VALID_PLANS.join(', ')}` },
        { status: 400 }
      )
    }
    if (!admin_email?.trim() || !admin_password || admin_password.length < 12) {
      return NextResponse.json<ErrorResponse>(
        { success: false, message: 'admin_email und admin_password (mind. 12 Zeichen) erforderlich' },
        { status: 400 }
      )
    }

    // Slug-Format prüfen: nur Kleinbuchstaben, Zahlen, Bindestriche
    if (!/^[a-z0-9-]+$/.test(slug.trim())) {
      return NextResponse.json<ErrorResponse>(
        { success: false, message: 'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten' },
        { status: 400 }
      )
    }

    // Slug-Eindeutigkeit prüfen
    const { data: existingOrg } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('slug', slug.trim())
      .single()

    if (existingOrg) {
      return NextResponse.json<ErrorResponse>(
        { success: false, message: `Slug "${slug}" ist bereits vergeben` },
        { status: 409 }
      )
    }

    // E-Mail-Eindeutigkeit prüfen
    const { data: existingUser } = await supabaseAdmin
      .from('compliance_users')
      .select('id')
      .eq('email', admin_email.toLowerCase().trim())
      .single()

    if (existingUser) {
      return NextResponse.json<ErrorResponse>(
        { success: false, message: 'Diese E-Mail-Adresse ist bereits registriert' },
        { status: 409 }
      )
    }

    // 1. Encryption Key generieren und sofort mit Master Key verschlüsseln
    const encryptionKey = generateEncryptionKey()
    const encryptionKeyHash = hashValue(encryptionKey)
    const encryptionKeyEnc = wrapOrgKey(encryptionKey)

    // 2. Organisation anlegen
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: name.trim(),
        slug: slug.trim(),
        contact_email: contact_email.toLowerCase().trim(),
        subscription_status: 'trial',
        subscription_plan,
        encryption_key_hash: encryptionKeyHash,
        encryption_key_enc: encryptionKeyEnc,
      })
      .select('id')
      .single()

    if (orgError || !org) {
      return NextResponse.json<ErrorResponse>(
        { success: false, message: 'Fehler beim Anlegen der Organisation' },
        { status: 500 }
      )
    }

    // 3. Ersten Admin-User anlegen
    const passwordHash = await hashPassword(admin_password)

    const { error: userError } = await supabaseAdmin.from('compliance_users').insert({
      organization_id: org.id,
      email: admin_email.toLowerCase().trim(),
      password_hash: passwordHash,
      role: 'admin',
      name: admin_name?.trim() ?? null,
    })

    if (userError) {
      // Rollback: Organisation wieder löschen
      await supabaseAdmin.from('organizations').delete().eq('id', org.id)
      return NextResponse.json<ErrorResponse>(
        { success: false, message: 'Fehler beim Anlegen des Admin-Users' },
        { status: 500 }
      )
    }

    return NextResponse.json<CreateOrganizationResponse>(
      {
        success: true,
        organization_id: org.id,
        slug: slug.trim(),
      },
      { status: 201 }
    )
  } catch {
    return NextResponse.json<ErrorResponse>(
      { success: false, message: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
