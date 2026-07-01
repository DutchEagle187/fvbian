"use client";

import * as React from "react";

import { Card, CardContent } from "@/components/ui/card";
import { BorderBeam } from "@/components/magicui/border-beam";

function greeting(hour: number): string {
  if (hour < 5) return "Gute Nacht";
  if (hour < 11) return "Guten Morgen";
  if (hour < 18) return "Guten Tag";
  return "Guten Abend";
}

export function ClockWidget({ name }: { name?: string | null }) {
  const [now, setNow] = React.useState<Date | null>(null);

  React.useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = now
    ? new Intl.DateTimeFormat("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(now)
    : "––:––:––";

  const date = now
    ? new Intl.DateTimeFormat("de-DE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(now)
    : "";

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="flex h-full flex-col justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {now ? greeting(now.getHours()) : "Willkommen"}
          {name ? `, ${name}` : ""} 👋
        </p>
        <div>
          <p className="font-mono text-4xl font-semibold tabular-nums tracking-tight sm:text-5xl">
            {time}
          </p>
          <p className="mt-1 capitalize text-muted-foreground">{date}</p>
        </div>
      </CardContent>
      <BorderBeam duration={10} size={140} colorFrom="#0070F3" colorTo="#38bdf8" />
    </Card>
  );
}
