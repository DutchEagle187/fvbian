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
      page.tsx                   # Übersicht
      tools/{notes,converter,bookmarks}/
    api/auth/[...nextauth]/route.ts
    actions/auth.ts              # signOut Server Action
  auth.ts                        # NextAuth-Konfiguration + Allowlist-Callback
  middleware.ts                  # Schützt /dashboard
  lib/{allowlist,tools,utils}.ts
  components/
    ui/                          # shadcn/ui
    magicui/                     # Magic UI
    dashboard/                   # Nav, User-Menü, ...
```
