"use client";

import * as React from "react";
import { Check, Cloud, CloudOff, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useSyncedStore } from "@/lib/use-synced-store";

export default function NotesPage() {
  const { state, update, ready, configured } = useSyncedStore<string>({
    apiKey: "notes",
    localKey: "fvbian:notes",
    initial: "",
  });
  const [saved, setSaved] = React.useState(false);
  const savedTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  function onChange(value: string) {
    update(value);
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div>
      <PageHeader
        title="Notizen"
        description={
          configured
            ? "Wird automatisch gespeichert und über deine Geräte synchronisiert."
            : "Wird automatisch lokal in diesem Browser gespeichert."
        }
      />
      <Card>
        <CardContent className="space-y-4">
          <Textarea
            value={state}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Schreib etwas…"
            className="min-h-[50vh] resize-none"
            disabled={!ready}
          />
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              {saved ? (
                <>
                  <Check className="size-4 text-green-500" /> Gespeichert
                </>
              ) : (
                <>
                  {configured ? (
                    <Cloud className="size-4" />
                  ) : (
                    <CloudOff className="size-4" />
                  )}
                  {state.length} Zeichen
                </>
              )}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onChange("")}
              disabled={!state}
            >
              <Trash2 className="size-4" /> Leeren
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
