"use client";

import * as React from "react";
import { Check, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const STORAGE_KEY = "fvbian:notes";

export default function NotesPage() {
  const [value, setValue] = React.useState("");
  const [saved, setSaved] = React.useState(false);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    setValue(localStorage.getItem(STORAGE_KEY) ?? "");
    setReady(true);
  }, []);

  React.useEffect(() => {
    if (!ready) return;
    const id = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, value);
      setSaved(true);
      const hide = setTimeout(() => setSaved(false), 1500);
      return () => clearTimeout(hide);
    }, 400);
    return () => clearTimeout(id);
  }, [value, ready]);

  return (
    <div>
      <PageHeader
        title="Notizen"
        description="Alles wird automatisch lokal in diesem Browser gespeichert."
      />
      <Card>
        <CardContent className="space-y-4">
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Schreib etwas…"
            className="min-h-[50vh] resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              {saved ? (
                <>
                  <Check className="size-4 text-green-500" /> Gespeichert
                </>
              ) : (
                `${value.length} Zeichen`
              )}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setValue("")}
              disabled={!value}
            >
              <Trash2 className="size-4" /> Leeren
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
