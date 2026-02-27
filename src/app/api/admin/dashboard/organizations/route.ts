import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyAdminSessionToken } from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/supabase'
import { generateEncryptionKey, hashPassword, hashValue, wrapOrgKey } from '@/lib/crypto'
import type {
  CreateOrganizationRequest,
  CreateOrganizationResponse,
  ErrorResponse,
  SubscriptionPlan,
} from '@/types'

const VALID_PLANS: SubscriptionPlan[] = ['starter', 'professional', 'enterprise']

async function checkAuth(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin-session')?.value
  return !!token && verifyAdminSessionToken(token)
}

export async function POST(req: NextRequest) {
  if (!(await checkAuth())) {
    return NextResponse.json<ErrorResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body: CreateOrganizationRequest = await req.json()
    const { name, slug, contact_email, subscription_plan, admin_email, admin_password, admin_name } = body

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
    if (!/^[a-z0-9-]+$/.test(slug.trim())) {
      return NextResponse.json<ErrorResponse>(
        { success: false, message: 'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten' },
        { status: 400 }
      )
    }

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

    const encryptionKey = generateEncryptionKey()
    const encryptionKeyHash = hashValue(encryptionKey)
    const encryptionKeyEnc = wrapOrgKey(encryptionKey)

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

    const passwordHash = await hashPassword(admin_password)
    const { error: userError } = await supabaseAdmin.from('compliance_users').insert({
      organization_id: org.id,
      email: admin_email.toLowerCase().trim(),
      password_hash: passwordHash,
      role: 'admin',
      name: admin_name?.trim() ?? null,
    })

    if (userError) {
      await supabaseAdmin.from('organizations').delete().eq('id', org.id)
      return NextResponse.json<ErrorResponse>(
        { success: false, message: 'Fehler beim Anlegen des Admin-Users' },
        { status: 500 }
      )
    }

    return NextResponse.json<CreateOrganizationResponse>(
      { success: true, organization_id: org.id, slug: slug.trim() },
      { status: 201 }
    )
  } catch {
    return NextResponse.json<ErrorResponse>(
      { success: false, message: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
