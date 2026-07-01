# fvbian

Persönliche Sammlung kleiner Tools, Spielereien und Dashboards.
Öffentlich erreichbar, aber hinter einem Login — Zugang nur für ausgewählte
Google-Accounts (Allowlist).

Gebaut mit:

- [Next.js 15](https://nextjs.org) (App Router) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) (New York)
- [Magic UI](https://magicui.design) Komponenten
- [Motion](https://motion.dev) für Animationen
- [Auth.js / NextAuth v5](https://authjs.dev) mit Google-Provider + E-Mail-Allowlist

## Lokal starten

```bash
npm install
cp .env.example .env.local   # Werte eintragen (siehe unten)
npm run dev
```

Die App läuft dann auf http://localhost:3000.

## Umgebungsvariablen

Alle in `.env.example` dokumentiert. Kurzfassung:

| Variable             | Zweck                                                        |
| -------------------- | ----------------------------------------------------------- |
| `AUTH_SECRET`        | Signiert die Session. `openssl rand -base64 32`             |
| `AUTH_GOOGLE_ID`     | OAuth Client-ID aus der Google Cloud Console                |
| `AUTH_GOOGLE_SECRET` | OAuth Client-Secret                                         |
| `ALLOWED_EMAILS`     | Komma-getrennte Liste der zugelassenen Google-E-Mails       |
| `UPSTASH_REDIS_REST_URL`   | Upstash-Redis REST-URL (für geräteübergreifende Sync) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash-Redis REST-Token                              |

### Google OAuth einrichten

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → **Anmeldedaten erstellen → OAuth-Client-ID → Webanwendung**.
2. Autorisierte Redirect-URIs:
   - `http://localhost:3000/api/auth/callback/google` (lokal)
   - `https://fvbian.com/api/auth/callback/google` (Produktion)
3. Client-ID und -Secret in die Env-Variablen eintragen.

### Zugang verwalten (wer darf rein?)

Trage die erlaubten Google-E-Mail-Adressen in `ALLOWED_EMAILS` ein
(komma-getrennt). Jeder, der nicht auf der Liste steht, wird beim Login
abgewiesen. Kein Code-Deploy nötig — auf Vercel einfach die Environment
Variable ändern und neu deployen.

```env
ALLOWED_EMAILS=fabian.kingfs@gmail.com,freund@example.com
```

### Geräteübergreifende Speicherung (Upstash Redis)

Lesezeichen, Todos und Notizen werden **lokal im Browser** gespeichert und
zusätzlich **über deine Geräte synchronisiert**, sobald ein Redis-Speicher
verbunden ist. Ohne Redis funktioniert alles trotzdem — dann eben nur lokal
pro Browser.

**Einrichten auf Vercel (~2 Min.):**

1. Vercel → dein Projekt → **Storage → Create Database → Redis (Upstash)**.
2. Mit dem Projekt verbinden — Vercel legt `UPSTASH_REDIS_REST_URL` und
   `UPSTASH_REDIS_REST_TOKEN` automatisch als Environment Variables an.
3. Einmal **neu deployen**.

Die klassischen `KV_REST_API_URL` / `KV_REST_API_TOKEN` (Vercel KV) werden
ebenfalls automatisch erkannt.

Die Daten liegen pro Nutzer unter dem Schlüssel `u:<email>:<bookmarks|todos|notes>`.
Sync-Strategie: last-write-wins, zugunsten des gerade aktiven Geräts.

### iCloud-Kalender (CalDAV)

Das Kalender-Tool verbindet sich per **CalDAV** mit iCloud. Jeder Nutzer
hinterlegt seine eigene Apple-ID + ein **app-spezifisches Passwort**
(erstellt unter account.apple.com → Anmeldung & Sicherheit). Die Zugangsdaten
werden **verschlüsselt** (AES-256-GCM) in Redis gespeichert und nur
serverseitig verwendet.

- Verschlüsselungsschlüssel: `CALENDAR_ENCRYPTION_KEY` (optional; fällt sonst
  auf `AUTH_SECRET` zurück).
- Benötigt den Redis-Speicher (siehe oben).
- Termine (inkl. Wiederholungen) werden serverseitig via `tsdav` geladen und
  mit `ical.js` aufgelöst.
- **iCloud-Erinnerungen** (VTODO) laufen über denselben Zugang: lesen und
  abhaken (Erledigt-Status wird nach iCloud zurückgeschrieben).

## Auf Vercel deployen

1. Repo auf [vercel.com](https://vercel.com) importieren (Framework: Next.js — wird automatisch erkannt).
2. Unter **Settings → Environment Variables** die vier Variablen von oben eintragen.
   - Wichtig: `AUTH_SECRET` unbedingt setzen.
   - Für das Google-OAuth Redirect die Produktions-Domain verwenden.
3. Deployen. Danach unter **Settings → Domains** `fvbian.com` hinzufügen und
   die DNS-Einträge laut Vercel-Anleitung bei deinem Domain-Anbieter setzen.

> Hinweis: Auth.js liest `AUTH_SECRET`, `AUTH_GOOGLE_ID` und
> `AUTH_GOOGLE_SECRET` automatisch aus der Umgebung — kein zusätzlicher Code
> nötig.

## Ein neues Tool hinzufügen

1. Eintrag in `src/lib/tools.ts` ergänzen (Titel, Beschreibung, Pfad, Icon).
2. Seite unter `src/app/dashboard/<pfad>/page.tsx` anlegen.

Das Tool erscheint automatisch in der Seitenleiste und auf der
Dashboard-Übersicht.

## Projektstruktur

```
src/
  app/
    page.tsx                     # Öffentliche Landing-Page
    login/page.tsx               # Login (Google)
    dashboard/                   # Geschützt (Middleware)
      layout.tsx                 # Sidebar + Topbar
      page.tsx                   # Widget-Dashboard (Uhr, Todos, Lesezeichen)
      tools/{notes,bookmarks}/
    api/auth/[...nextauth]/route.ts
    api/link-preview/route.ts    # Holt OG-Metadaten für Lesezeichen-Vorschau
    actions/auth.ts              # signOut Server Action
  auth.ts                        # NextAuth-Konfiguration + Allowlist-Callback
  middleware.ts                  # Schützt /dashboard
  lib/{allowlist,tools,utils}.ts
  components/
    ui/                          # shadcn/ui
    magicui/                     # Magic UI
    dashboard/                   # Nav, User-Menü, ...
```
