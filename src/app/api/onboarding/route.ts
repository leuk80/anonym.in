import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import {
  generateEncryptionKey,
  getOrgKeyEnvName,
  hashPassword,
  hashValue,
} from '@/lib/crypto'
import type { SubscriptionPlan } from '@/types'

const VALID_PLANS: SubscriptionPlan[] = ['starter', 'professional', 'enterprise']

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      org_name,
      slug: rawSlug,
      contact_email,
      subscription_plan,
      admin_name,
      admin_email,
      admin_password,
    } = body as {
      org_name: string
      slug: string
      contact_email: string
      subscription_plan: string
      admin_name: string
      admin_email: string
      admin_password: string
    }

    // Pflichtfelder
    if (!org_name?.trim() || !rawSlug?.trim() || !contact_email?.trim()) {
      return NextResponse.json(
        { success: false, message: 'org_name, slug und contact_email sind Pflichtfelder' },
        { status: 400 }
      )
    }

    if (!VALID_PLANS.includes(subscription_plan as SubscriptionPlan)) {
      return NextResponse.json(
        { success: false, message: 'Ungültiger Abo-Plan' },
        { status: 400 }
      )
    }

    if (!admin_email?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Admin-E-Mail ist Pflichtfeld' },
        { status: 400 }
      )
    }

    if (!admin_password || admin_password.length < 12) {
      return NextResponse.json(
        { success: false, message: 'Passwort muss mindestens 12 Zeichen lang sein' },
        { status: 400 }
      )
    }

    const slug = slugify(rawSlug.trim())

    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { success: false, message: 'Ungültiger Slug. Nur Kleinbuchstaben, Zahlen und Bindestriche erlaubt.' },
        { status: 400 }
      )
    }

    // Slug-Eindeutigkeit prüfen
    const { data: existingOrg } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existingOrg) {
      return NextResponse.json(
        { success: false, message: 'slug_taken', field: 'slug' },
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
      return NextResponse.json(
        { success: false, message: 'email_taken', field: 'admin_email' },
        { status: 409 }
      )
    }

    // Encryption Key generieren
    const encryptionKey = generateEncryptionKey()
    const encryptionKeyHash = hashValue(encryptionKey)

    // Organisation anlegen
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: org_name.trim(),
        slug,
        contact_email: contact_email.toLowerCase().trim(),
        subscription_status: 'trial',
        subscription_plan: subscription_plan as SubscriptionPlan,
        encryption_key_hash: encryptionKeyHash,
      })
      .select('id')
      .single()

    if (orgError || !org) {
      return NextResponse.json(
        { success: false, message: 'Fehler beim Anlegen der Organisation' },
        { status: 500 }
      )
    }

    // Admin-User anlegen
    const passwordHash = await hashPassword(admin_password)

    const { error: userError } = await supabaseAdmin.from('compliance_users').insert({
      organization_id: org.id,
      email: admin_email.toLowerCase().trim(),
      password_hash: passwordHash,
      role: 'admin',
      name: admin_name?.trim() || null,
    })

    if (userError) {
      // Rollback
      await supabaseAdmin.from('organizations').delete().eq('id', org.id)
      return NextResponse.json(
        { success: false, message: 'Fehler beim Anlegen des Admin-Users' },
        { status: 500 }
      )
    }

    const envVarName = getOrgKeyEnvName(org.id)

    return NextResponse.json(
      {
        success: true,
        organization_id: org.id,
        slug,
        encryption_key: encryptionKey,
        env_var_name: envVarName,
      },
      { status: 201 }
    )
  } catch {
    return NextResponse.json(
      { success: false, message: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
