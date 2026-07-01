"use client";

import * as React from "react";
import { Check, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "fvbian:todos";

interface Todo {
  id: string;
  text: string;
  done: boolean;
}

export function TodosWidget() {
  const [todos, setTodos] = React.useState<Todo[]>([]);
  const [ready, setReady] = React.useState(false);
  const [text, setText] = React.useState("");

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setTodos(JSON.parse(raw));
    } catch {
      // ignore malformed storage
    }
    setReady(true);
  }, []);

  React.useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos, ready]);

  function add(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setTodos((prev) => [
      { id: `${Date.now()}`, text: value, done: false },
      ...prev,
    ]);
    setText("");
  }

  function toggle(id: string) {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  }

  function remove(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  const open = todos.filter((t) => !t.done).length;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base font-medium text-muted-foreground">
          Todos
          <span className="text-xs tabular-nums">{open} offen</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={add} className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Neue Aufgabe…"
            className="h-8"
          />
          <Button type="submit" size="icon" className="size-8 shrink-0">
            <Plus className="size-4" />
          </Button>
        </form>

        {todos.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Keine Aufgaben. Genieß den Tag ☕
          </p>
        ) : (
          <ul className="max-h-56 space-y-1 overflow-y-auto">
            {todos.map((t) => (
              <li
                key={t.id}
                className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-accent/50"
              >
                <button
                  type="button"
                  onClick={() => toggle(t.id)}
                  aria-label="Abhaken"
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded border transition-colors",
                    t.done
                      ? "border-green-500 bg-green-500 text-white"
                      : "border-input hover:border-foreground"
                  )}
                >
                  {t.done ? <Check className="size-3.5" /> : null}
                </button>
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-sm",
                    t.done && "text-muted-foreground line-through"
                  )}
                >
                  {t.text}
                </span>
                <button
                  type="button"
                  onClick={() => remove(t.id)}
                  aria-label="Löschen"
                  className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
