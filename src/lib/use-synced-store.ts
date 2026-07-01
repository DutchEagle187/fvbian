"use client";

import * as React from "react";

type Updater<T> = T | ((prev: T) => T);

interface Options<T> {
  /** API key under /api/store/<apiKey> (must be allow-listed server-side). */
  apiKey: string;
  /** localStorage key used as instant cache + offline fallback. */
  localKey: string;
  /** Default value before anything is loaded. */
  initial: T;
  /** Optional one-time migration from an older localStorage layout. */
  migrate?: () => T | null;
}

/**
 * A piece of state that is cached in localStorage (instant, offline) and
 * synced to the server (cross-device) when the database is configured.
 *
 * Strategy: load the local copy immediately, then fetch the server copy and
 * adopt it — unless the user already made a change (last-write-wins, biased to
 * the active device). Writes go to localStorage instantly and to the server
 * debounced.
 */
export function useSyncedStore<T>({
  apiKey,
  localKey,
  initial,
  migrate,
}: Options<T>) {
  const [state, setStateRaw] = React.useState<T>(initial);
  const [ready, setReady] = React.useState(false);
  const [configured, setConfigured] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const touched = React.useRef(false);
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = React.useRef<T>(initial);

  // Initial load: local cache first, then server.
  React.useEffect(() => {
    let cancelled = false;

    try {
      const raw = localStorage.getItem(localKey);
      if (raw) {
        setStateRaw(JSON.parse(raw) as T);
      } else if (migrate) {
        const migrated = migrate();
        if (migrated != null) {
          setStateRaw(migrated);
          localStorage.setItem(localKey, JSON.stringify(migrated));
        }
      }
    } catch {
      // ignore malformed storage
    }

    fetch(`/api/store/${apiKey}`)
      .then((r) => r.json())
      .then((res: { configured?: boolean; data?: T | null }) => {
        if (cancelled) return;
        setConfigured(!!res.configured);
        if (res.configured && res.data != null && !touched.current) {
          setStateRaw(res.data);
          try {
            localStorage.setItem(localKey, JSON.stringify(res.data));
          } catch {
            // ignore
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, localKey]);

  React.useEffect(() => {
    latest.current = state;
  }, [state]);

  const save = React.useCallback(
    async (data: T) => {
      setSaving(true);
      setSaveError(null);
      try {
        const res = await fetch(`/api/store/${apiKey}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ data }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || `Speichern fehlgeschlagen (${res.status})`);
        }
      } catch (e) {
        setSaveError((e as Error).message);
      } finally {
        setSaving(false);
      }
    },
    [apiKey]
  );

  const persist = React.useCallback(
    (data: T) => {
      latest.current = data;
      try {
        localStorage.setItem(localKey, JSON.stringify(data));
      } catch {
        // ignore
      }
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void save(data);
      }, 600);
    },
    [localKey, save]
  );

  const update = React.useCallback(
    (updater: Updater<T>) => {
      touched.current = true;
      setStateRaw((prev) => {
        const next =
          typeof updater === "function"
            ? (updater as (p: T) => T)(prev)
            : updater;
        persist(next);
        return next;
      });
    },
    [persist]
  );

  // Force an immediate save (e.g. from a manual "save" button).
  const flush = React.useCallback(async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await save(latest.current);
  }, [save]);

  return { state, update, ready, configured, saving, saveError, flush };
}
