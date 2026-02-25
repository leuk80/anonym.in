import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendDeadlineReminder } from '@/lib/email'

// Dieser Endpoint wird täglich um 07:00 UTC aufgerufen (vercel.json).
// Er prüft alle offenen Meldungen und sendet Erinnerungen an die
// jeweiligen Compliance-Officer ihrer Organisation.
//
// Gesichert mit CRON_SECRET (Authorization: Bearer ...)

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

    // Alle offenen Meldungen mit ihren Organisationen laden
    const { data: reports, error } = await supabaseAdmin
      .from('reports')
      .select('id, organization_id, response_deadline, status')
      .neq('status', 'abgeschlossen')

    if (error) {
      return NextResponse.json({ success: false, message: 'DB-Fehler' }, { status: 500 })
    }

    // Gruppieren nach Organisation
    const orgMap = new Map<
      string,
      { overdue: number; upcoming: number }
    >()

    for (const report of reports ?? []) {
      const deadline = new Date(report.response_deadline)
      const isOverdue = deadline < now
      const isUpcoming = !isOverdue && deadline <= in3Days

      if (!isOverdue && !isUpcoming) continue

      const current = orgMap.get(report.organization_id) ?? { overdue: 0, upcoming: 0 }
      if (isOverdue) current.overdue++
      if (isUpcoming) current.upcoming++
      orgMap.set(report.organization_id, current)
    }

    if (orgMap.size === 0) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    // Für jede betroffene Organisation: Kontakt-E-Mail laden und Reminder senden
    let sent = 0
    for (const [orgId, counts] of Array.from(orgMap.entries())) {
      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('name, contact_email')
        .eq('id', orgId)
        .single()

      if (!org) continue

      await sendDeadlineReminder(
        org.contact_email,
        org.name,
        3,
        counts.overdue,
        counts.upcoming
      ).catch(() => {})

      sent++
    }

    return NextResponse.json({ success: true, sent })
  } catch {
    return NextResponse.json({ success: false, message: 'Interner Serverfehler' }, { status: 500 })
  }
}
