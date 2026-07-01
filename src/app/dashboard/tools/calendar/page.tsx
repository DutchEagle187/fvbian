"use client";

import * as React from "react";
import {
  CalendarDays,
  ExternalLink,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Repeat,
  ShieldCheck,
} from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { EventDialog } from "@/components/dashboard/event-dialog";
import { DayView } from "@/components/dashboard/day-view";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatEventTime,
  groupByDay,
  useCalendarEvents,
  type CalEvent,
} from "@/lib/use-calendar";
import { useCollections } from "@/lib/use-collections";
import { cn } from "@/lib/utils";

type Status =
  | { state: "loading" }
  | { state: "unconfigured" }
  | { state: "disconnected" }
  | { state: "connected" };

const DAY_OPTIONS = [7, 14, 30];

export default function CalendarPage() {
  const [status, setStatus] = React.useState<Status>({ state: "loading" });

  const refreshStatus = React.useCallback(() => {
    fetch("/api/calendar")
      .then((r) => r.json())
      .then((res: { configured: boolean; connected: boolean }) => {
        if (!res.configured) return setStatus({ state: "unconfigured" });
        setStatus({ state: res.connected ? "connected" : "disconnected" });
      })
      .catch(() => setStatus({ state: "disconnected" }));
  }, []);

  React.useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  return (
    <div>
      <PageHeader
        title="Kalender"
        description="Deine iCloud-Kalender per CalDAV — Termine der nächsten Tage."
      />

      {status.state === "loading" && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Lädt…
        </div>
      )}

      {status.state === "unconfigured" && (
        <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
          Für den Kalender wird der Cloud-Speicher (Upstash Redis) benötigt, um
          deine Zugangsdaten verschlüsselt zu hinterlegen. Bitte verbinde ihn in
          Vercel und deploye neu.
        </p>
      )}

      {status.state === "disconnected" && (
        <ConnectForm onConnected={() => setStatus({ state: "connected" })} />
      )}

      {status.state === "connected" && (
        <Agenda onDisconnected={() => setStatus({ state: "disconnected" })} />
      )}
    </div>
  );
}

function ConnectForm({ onConnected }: { onConnected: () => void }) {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Verbindung fehlgeschlagen.");
        return;
      }
      onConnected();
    } catch {
      setError("Verbindung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>iCloud-Kalender verbinden</CardTitle>
        <CardDescription>
          Nutzt CalDAV mit einem app-spezifischen Passwort. Deine Zugangsdaten
          werden verschlüsselt gespeichert und nur serverseitig verwendet.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="appleid">Apple-ID (E-Mail)</Label>
            <Input
              id="appleid"
              type="email"
              autoComplete="username"
              placeholder="name@icloud.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apppw">App-spezifisches Passwort</Label>
            <Input
              id="apppw"
              type="password"
              autoComplete="off"
              placeholder="xxxx-xxxx-xxxx-xxxx"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Erstellen unter{" "}
              <a
                href="https://account.apple.com/account/manage"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 underline underline-offset-2"
              >
                account.apple.com <ExternalLink className="size-3" />
              </a>{" "}
              → Anmeldung &amp; Sicherheit → App-spezifische Passwörter. Nicht
              dein normales Apple-Passwort.
            </p>
          </div>

          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ShieldCheck className="size-4" />
            )}
            Verbinden
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Agenda({ onDisconnected }: { onDisconnected: () => void }) {
  const [view, setView] = React.useState<"agenda" | "day">("agenda");
  const [days, setDays] = React.useState(14);
  const [day, setDay] = React.useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const dayEnd = React.useMemo(() => {
    const e = new Date(day);
    e.setDate(e.getDate() + 1);
    return e;
  }, [day]);

  const range = view === "day" ? { start: day, end: dayEnd } : days;
  const {
    events,
    loading,
    error,
    reload,
    createEvent,
    updateEvent,
    deleteEvent,
  } = useCalendarEvents(range);
  const { eventCalendars } = useCollections();
  const grouped = groupByDay(events);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CalEvent | undefined>();
  const [defaultStart, setDefaultStart] = React.useState<Date | undefined>();

  async function disconnect() {
    await fetch("/api/calendar", { method: "DELETE" });
    onDisconnected();
  }

  function openCreate(at?: Date) {
    setEditing(undefined);
    setDefaultStart(at);
    setDialogOpen(true);
  }
  function openEdit(ev: CalEvent) {
    setEditing(ev);
    setDefaultStart(undefined);
    setDialogOpen(true);
  }
  function shiftDay(delta: number) {
    setDay((d) => {
      const n = new Date(d);
      n.setDate(n.getDate() + delta);
      return n;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-md border p-0.5">
            <Button
              size="sm"
              variant={view === "day" ? "default" : "ghost"}
              className="h-7"
              onClick={() => setView("day")}
            >
              Tag
            </Button>
            <Button
              size="sm"
              variant={view === "agenda" ? "default" : "ghost"}
              className="h-7"
              onClick={() => setView("agenda")}
            >
              Agenda
            </Button>
          </div>
          {view === "agenda" && (
            <div className="flex gap-1">
              {DAY_OPTIONS.map((d) => (
                <Button
                  key={d}
                  size="sm"
                  variant={days === d ? "secondary" : "ghost"}
                  onClick={() => setDays(d)}
                >
                  {d}T
                </Button>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => openCreate()}
            disabled={!eventCalendars.length}
          >
            <Plus className="size-4" /> Neuer Termin
          </Button>
          <Button size="sm" variant="ghost" onClick={reload} disabled={loading}>
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            <span className="hidden sm:inline">Aktualisieren</span>
          </Button>
          <Button size="sm" variant="ghost" onClick={disconnect}>
            Trennen
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {view === "day" ? (
        <DayView
          date={day}
          events={events}
          onPrev={() => shiftDay(-1)}
          onNext={() => shiftDay(1)}
          onToday={() => {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            setDay(d);
          }}
          onEventClick={openEdit}
          onCreateAt={openCreate}
        />
      ) : loading && events.length === 0 ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Termine werden geladen…
        </div>
      ) : grouped.length === 0 ? (
        <p className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
          Keine Termine in den nächsten {days} Tagen.
        </p>
      ) : (
        <div className="space-y-6">
          {grouped.map((gday) => (
            <div key={gday.key}>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <CalendarDays className="size-4 text-muted-foreground" />
                <span
                  className={cn("capitalize", gday.isToday && "text-primary")}
                >
                  {gday.isToday ? "Heute · " : ""}
                  {gday.label}
                </span>
              </h3>
              <div className="space-y-2">
                {gday.events.map((ev) => (
                  <Card
                    key={ev.id}
                    className="cursor-pointer py-0 transition-shadow hover:shadow-md"
                    onClick={() => openEdit(ev)}
                  >
                    <CardContent className="flex items-start gap-3 py-3">
                      <span
                        className="mt-1 h-10 w-1 shrink-0 rounded-full"
                        style={{ backgroundColor: ev.color ?? "var(--primary)" }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 font-medium leading-snug">
                          {ev.title}
                          {ev.recurring && (
                            <Repeat className="size-3 shrink-0 text-muted-foreground" />
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatEventTime(ev)} · {ev.calendar}
                        </p>
                        {ev.location && (
                          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                            <MapPin className="size-3 shrink-0" /> {ev.location}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <EventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        calendars={eventCalendars}
        initial={editing}
        defaultStart={defaultStart}
        onSubmit={(calendarUrl, event) =>
          editing
            ? updateEvent(
                { url: editing.url, calendarUrl: editing.calendarUrl },
                event
              )
            : createEvent(calendarUrl, event)
        }
        onDelete={
          editing
            ? () =>
                deleteEvent({
                  url: editing.url,
                  calendarUrl: editing.calendarUrl,
                })
            : undefined
        }
      />
    </div>
  );
}
