# anonym.in – Compliance Hotline SaaS
## Initial Prompt für Claude Code
---
## Projektübersicht
Wir bauen **anonym.in** – ein B2B SaaS-Tool für anonyme Compliance-Meldungen (Whistleblowing) gemäß EU-Whistleblower-Richtlinie (2019/1937) und deutschem Hinweisgeberschutzgesetz (HinSchG).
**Zielgruppe:** KMU in der EU (ab 50 Mitarbeiter sind gesetzlich verpflichtet, einen Meldekanal anzubieten)
**Monetarisierung:** Monatliches Abo (49€ / 99€ / 199€ je nach Unternehmensgröße)
**Entwickler:** Einzelperson, pragmatischer MVP-Ansatz
---
## Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Datenbank:** Supabase (PostgreSQL) – EU-Hosting
- **Verschlüsselung:** AES-256-GCM via Node.js built-in `crypto`
- **Auth:** NextAuth.js (für Compliance-User Login)
- **Styling:** Tailwind CSS
- **E-Mail:** Resend
- **Payments:** Stripe (noch nicht implementiert)
- **Hosting:** Hetzner (Deutschland) oder Vercel EU
---
## Was bereits existiert
### Datenbankschema (`supabase/schema.sql`)
Vollständiges PostgreSQL-Schema mit:
- `organizations` – Kundenfirmen mit Slug, Abo-Status, Encryption-Key-Hash
- `reports` – Meldungen, verschlüsselt, mit anonymem Melder-Token
- `messages` – Zwei-Wege-Kommunikation zwischen Melder und Firma
- `compliance_users` – Login-User der Kundenfirmen
- Automatische Fristsetzung via Trigger (7 Tage Eingangsbestätigung, 3 Monate Rückmeldung)
- Automatische Löschung nach 3 Jahren via pg_cron
- Row Level Security aktiviert
### Verschlüsselung & Utilities (`src/lib/crypto.ts`)
- `encrypt(text, keyHex)` / `decrypt(encryptedData, keyHex)` – AES-256-GCM
- `generateEncryptionKey()` – Neuen Key für eine Organisation erstellen
- `generateMelderToken()` – Anonymer Token im Format `WOLF-7342-BLAU`
- `hashPassword()` / `verifyPassword()` – Scrypt-basiertes Passwort-Hashing
- `hashValue()` – SHA-256 Hash
### Supabase Client (`src/lib/supabase.ts`)
- `supabaseAdmin` – Service-Role Client (nur serverseitig)
- `getOrganizationBySlug(slug)` / `getOrganizationById(id)` – Hilfsfunktionen
### TypeScript Typen (`src/types/index.ts`)
Vollständige Typen für alle DB-Entitäten und API-Requests/Responses
### Öffentliches Meldeportal (`src/app/melden/[slug]/page.tsx`)
- Formular mit Kategorie-Auswahl (6 Kategorien), Titel, Beschreibung
- Nach Absenden: Token-Anzeige (`WOLF-7342-BLAU`) mit Copy-Button
- Klarer Hinweis: Token ist der einzige Zugriffsschlüssel
- Datenschutzhinweis
- Responsives Design mit Tailwind
### API: Meldung einreichen (`src/app/api/reports/route.ts`)
- `POST /api/reports?slug={slug}`
- Validierung, Verschlüsselung, Token-Generierung, DB-Insert
- Platzhalter für E-Mail-Benachrichtigung
### API: Token-Zugriff (`src/app/api/reports/token/[token]/route.ts`)
- `GET` – Meldung + Nachrichten per Token abrufen (entschlüsselt)
- `POST` – Neue Nachricht vom Melder senden
### Compliance Dashboard (`src/app/dashboard/page.tsx`)
- Statistik-Karten (Gesamt, Neu, In Bearbeitung, Überfällig)
- Filterfunktion nach Status
- Meldungsliste mit Fristanzeige und Unread-Badge
- Noch kein Login-Schutz implementiert
---
## Encryption Key Management
**Wichtig:** Der Encryption Key einer Organisation wird NICHT in der DB gespeichert.
Er liegt als Umgebungsvariable im Format:
```
ORG_KEY_{UUID ohne Bindestriche} = {64 Hex-Zeichen}
```
Beispiel:
```
ORG_KEY_550e8400e29b41d4a716446655440000=a3f8b2...
```
Beim Anlegen einer neuen Organisation:
1. `generateEncryptionKey()` aufrufen
2. `hashValue(key)` als `encryption_key_hash` in DB speichern
3. Key als Env-Var beim Hosting-Provider setzen
---
## Gesetzliche Anforderungen (HinSchG)
| Anforderung | Detail |
|---|---|
| Eingangsbestätigung | Binnen **7 Tagen** nach Eingang |
| Rückmeldung | Binnen **3 Monaten** nach Eingang |
| Aufbewahrung | Mindestens **3 Jahre**, dann Löschpflicht |
| Anonymität | Technisch sichergestellt – keine IP, keine E-Mail |
| Zwei-Wege-Kommunikation | Token-basierter Rückkanal |
| Vertraulichkeit | Verschlüsselung, kein Klartext in DB |
---
## Was als nächstes gebaut werden muss (Priorität)
### 1. LOGIN-SYSTEM (NextAuth) – Höchste Priorität
Datei: `src/app/(auth)/login/page.tsx` und `src/app/api/auth/[...nextauth]/route.ts`
- Credentials Provider (E-Mail + Passwort)
- Passwort-Verifikation gegen `compliance_users` Tabelle mit `verifyPassword()`
- Session enthält: `userId`, `organizationId`, `role`
- Middleware: alle `/dashboard/*` Routen schützen
- Einfaches Login-Formular, kein Schnickschnack
### 2. DASHBOARD: MELDUNG DETAIL-ANSICHT
Datei: `src/app/dashboard/reports/[id]/page.tsx`
- Vollständige Meldung anzeigen (entschlüsselt)
- Status ändern (neu → in_bearbeitung → abgeschlossen)
- Eingangsbestätigung setzen (Button: "Eingang bestätigen")
- Nachrichten-Verlauf anzeigen
- Antwort-Formular (Text → verschlüsselt → DB)
- Fristanzeige prominent
### 3. DASHBOARD API ROUTE
Datei: `src/app/api/dashboard/reports/route.ts`
- `GET` – Alle Meldungen der eigenen Organisation laden
- Entschlüsseln mit Org-Key
- `is_overdue` berechnen
- `unread_messages` zählen
### 4. MELDER: STATUS-SEITE
Datei: `src/app/melden/[slug]/status/page.tsx`
- Token eingeben
- Meldung + Kommunikationsverlauf anzeigen
- Antwort-Formular
### 5. E-MAIL BENACHRICHTIGUNGEN (Resend)
Datei: `src/lib/email.ts`
Drei E-Mail-Typen:
- Neue Meldung eingegangen (an Compliance-Officer, KEIN Inhalt, nur Hinweis)
- Frist-Erinnerung (automatisch, 3 Tage vor Ablauf)
- Antwort vom Compliance-Team eingegangen (an... niemanden, da anonym – stattdessen: Hinweis im Portal)
### 6. ORGANISATION ANLEGEN (Admin)
Datei: `src/app/api/admin/organizations/route.ts`
- Neue Organisation erstellen
- `generateEncryptionKey()` aufrufen
- Key ausgeben (einmalig!) und als Env-Var speichern
- Ersten Compliance-User anlegen
### 7. PDF-EXPORT
- Meldung + Kommunikationsverlauf als PDF exportieren
- Für Dokumentationspflicht
- Bibliothek: `@react-pdf/renderer` oder `puppeteer`
### 8. STRIPE INTEGRATION
- Abo-Verwaltung
- Webhooks für `customer.subscription.updated`
- `subscription_status` in DB aktualisieren
---
## Wichtige Implementierungshinweise
**Sicherheit:**
- Encryption Keys NIEMALS in Logs oder Responses ausgeben
- IP-Adressen NICHT in Logs für Melder-Requests
- Rate Limiting auf `/api/reports` (max 10 Requests/Minute/IP)
- HTTPS erzwingen
- CORS: Nur eigene Domain erlauben
**DSGVO:**
- Kein Analytics-Script auf dem Meldeportal
- Keine Cookies auf dem Meldeportal (außer notwendige Session-Cookies)
- Cookie-Banner NUR für Dashboard nötig
- Jede Organisation braucht einen AVV mit anonym.in
**Code-Stil:**
- TypeScript strict mode
- Alle Fehler explizit behandeln (kein `as any`)
- API-Routes immer mit try/catch wrappen
- Konsistente Fehler-Responses: `{ success: false, message: '...' }`
---
## Dateistruktur (Zielzustand)
```
anonym-in/
├── supabase/
│   └── schema.sql                          ✅ fertig
├── src/
│   ├── types/
│   │   └── index.ts                        ✅ fertig
│   ├── lib/
│   │   ├── crypto.ts                       ✅ fertig
│   │   ├── supabase.ts                     ✅ fertig
│   │   └── email.ts                        ⬜ TODO
│   ├── middleware.ts                        ⬜ TODO (Route-Schutz)
│   └── app/
│       ├── (auth)/
│       │   └── login/
│       │       └── page.tsx                ⬜ TODO
│       ├── api/
│       │   ├── auth/
│       │   │   └── [...nextauth]/
│       │   │       └── route.ts            ⬜ TODO
│       │   ├── reports/
│       │   │   ├── route.ts                ✅ fertig
│       │   │   └── token/[token]/
│       │   │       └── route.ts            ✅ fertig
│       │   └── dashboard/
│       │       └── reports/
│       │           └── route.ts            ⬜ TODO
│       ├── melden/
│       │   └── [slug]/
│       │       ├── page.tsx                ✅ fertig
│       │       └── status/
│       │           └── page.tsx            ⬜ TODO
│       └── dashboard/
│           ├── page.tsx                    ✅ fertig (kein Login-Schutz)
│           └── reports/
│               └── [id]/
│                   └── page.tsx            ⬜ TODO
├── .env.example                            ✅ fertig
├── package.json                            ✅ fertig
└── README.md                              ✅ fertig
```
---
## Starte hier
Bitte beginne mit **Punkt 1 (Login-System)** da ohne Authentication alles andere unsicher ist.
Dann weiter mit **Punkt 3 (Dashboard API)** und **Punkt 2 (Meldung Detail-Ansicht)** – diese drei zusammen ergeben ein funktionsfähiges MVP das einem ersten Kunden gezeigt werden kann.
