import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@anonym.in'

// ============================================================
// 1. Neue Meldung eingegangen (an Compliance-Officer)
//    KEIN Inhalt der Meldung – nur ein Hinweis
// ============================================================
export async function sendNewReportNotification(to: string, orgName: string): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `[anonym.in] Neue Compliance-Meldung eingegangen`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; color: #111;">
        <h2 style="font-size: 18px; margin-bottom: 8px;">Neue Meldung eingegangen</h2>
        <p style="color: #555; margin-bottom: 16px;">
          Für <strong>${escapeHtml(orgName)}</strong> ist eine neue anonyme Compliance-Meldung
          über anonym.in eingegangen.
        </p>
        <p style="color: #555; margin-bottom: 24px;">
          Bitte melden Sie sich im Compliance-Dashboard an, um die Meldung einzusehen
          und die gesetzliche <strong>7-Tage-Frist zur Eingangsbestätigung</strong> einzuhalten.
        </p>
        <a href="${process.env.NEXTAUTH_URL}/dashboard"
           style="display: inline-block; padding: 10px 20px; background: #111; color: #fff;
                  border-radius: 8px; text-decoration: none; font-size: 14px;">
          Zum Dashboard
        </a>
        <hr style="margin: 32px 0; border: none; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #999;">
          Diese E-Mail enthält bewusst keinen Inhalt der Meldung, um die Anonymität
          und Vertraulichkeit des Meldekanals zu wahren (HinSchG §8).
        </p>
      </div>
    `,
  })
}

// ============================================================
// 2. Frist-Erinnerung (automatisch, 3 Tage vor Ablauf)
//    Wird durch Cron-Job ausgelöst
// ============================================================
export async function sendDeadlineReminder(
  to: string,
  orgName: string,
  daysLeft: number,
  overdueCount: number,
  upcomingCount: number
): Promise<void> {
  const subject =
    overdueCount > 0
      ? `[anonym.in] ⚠️ ${overdueCount} Meldung(en) überfällig – Handlung erforderlich`
      : `[anonym.in] Erinnerung: Fristen für ${upcomingCount} Meldung(en) laufen in ${daysLeft} Tagen ab`

  await resend.emails.send({
    from: FROM,
    to,
    subject,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; color: #111;">
        <h2 style="font-size: 18px; margin-bottom: 8px;">Frist-Erinnerung</h2>
        ${
          overdueCount > 0
            ? `<p style="color: #dc2626; margin-bottom: 8px;">
                <strong>${overdueCount} Meldung(en)</strong> für
                <strong>${escapeHtml(orgName)}</strong> haben die gesetzliche
                Rückmelde-Frist überschritten.
               </p>`
            : ''
        }
        ${
          upcomingCount > 0
            ? `<p style="color: #555; margin-bottom: 8px;">
                <strong>${upcomingCount} Meldung(en)</strong> für
                <strong>${escapeHtml(orgName)}</strong> laufen in den nächsten
                3 Tagen ab.
               </p>`
            : ''
        }
        <p style="color: #555; margin-bottom: 24px;">
          Bitte bearbeiten Sie diese Meldungen im Dashboard, um die gesetzlichen
          Fristen gemäß HinSchG einzuhalten.
        </p>
        <a href="${process.env.NEXTAUTH_URL}/dashboard?status=overdue"
           style="display: inline-block; padding: 10px 20px; background: #111; color: #fff;
                  border-radius: 8px; text-decoration: none; font-size: 14px;">
          Überfällige Meldungen anzeigen
        </a>
        <hr style="margin: 32px 0; border: none; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #999;">
          Diese automatische Erinnerung wird täglich von anonym.in versendet,
          solange offene Fristen vorliegen.
        </p>
      </div>
    `,
  })
}

// ============================================================
// Hilfsfunktion: HTML-Escaping gegen XSS in E-Mails
// ============================================================
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
