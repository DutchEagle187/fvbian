"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatEventTime,
  groupByDay,
  useCalendarEvents,
} from "@/lib/use-calendar";

export function AgendaWidget() {
  const { connected, events, loading } = useCalendarEvents(7);
  const grouped = groupByDay(events).slice(0, 3);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base font-medium text-muted-foreground">
          Agenda
          <Link
            href="/dashboard/tools/calendar"
            className="inline-flex items-center gap-1 text-xs transition-colors hover:text-foreground"
          >
            Kalender <ArrowRight className="size-3" />
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Lädt…
          </p>
        ) : !connected ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            <Link
              href="/dashboard/tools/calendar"
              className="underline underline-offset-4"
            >
              iCloud-Kalender verbinden
            </Link>
          </p>
        ) : grouped.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Keine Termine in den nächsten 7 Tagen 🎉
          </p>
        ) : (
          <div className="space-y-3">
            {grouped.map((day) => (
              <div key={day.key}>
                <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <CalendarDays className="size-3" />
                  <span className="capitalize">
                    {day.isToday ? "Heute" : day.label}
                  </span>
                </p>
                <ul className="space-y-1">
                  {day.events.slice(0, 4).map((ev) => (
                    <li key={ev.id} className="flex items-center gap-2 text-sm">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: ev.color ?? "var(--primary)",
                        }}
                      />
                      <span className="w-14 shrink-0 text-xs tabular-nums text-muted-foreground">
                        {formatEventTime(ev)}
                      </span>
                      <span className="min-w-0 truncate">{ev.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
