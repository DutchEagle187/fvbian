"use client";

import * as React from "react";

/**
 * Probes whether an image URL actually loads. Starts `false` so procedural
 * fallbacks render immediately — the photo only takes over once it is
 * confirmed. Hydration-safe (no reliance on <img onError>, which can fire
 * before React attaches handlers).
 */
export function useImageAvailable(src: string): boolean {
  const [ok, setOk] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    const img = new Image();
    img.onload = () => {
      if (alive) setOk(true);
    };
    img.src = src;
    return () => {
      alive = false;
    };
  }, [src]);

  return ok;
}
