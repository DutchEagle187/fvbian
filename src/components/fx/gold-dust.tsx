"use client";

import * as React from "react";
import { useInView } from "motion/react";

/** Slow-rising, twinkling gold dust — life after the darkness of the pupil. */
export function GoldDust({ count = 70 }: { count?: number }) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const inView = useInView(ref, { margin: "100px" });

  React.useEffect(() => {
    if (!inView) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = 0;
    let H = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const pts = Array.from({ length: count }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      s: 0.8 + Math.random() * 1.6,
      v: 0.008 + Math.random() * 0.02,
      ph: i * 1.7,
    }));

    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const t = (now - start) * 0.001;
      ctx.clearRect(0, 0, W, H);
      for (const p of pts) {
        const y = reduced ? p.y : (p.y - t * p.v * 0.05) % 1;
        const yy = ((y % 1) + 1) % 1;
        const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.4 + p.ph));
        ctx.fillStyle = `rgba(232,178,70,${0.35 * tw})`;
        ctx.beginPath();
        ctx.arc(p.x * W + Math.sin(t * 0.4 + p.ph) * 12, yy * H, p.s, 0, Math.PI * 2);
        ctx.fill();
      }
      if (reduced) cancelAnimationFrame(raf);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [inView, count]);

  return <canvas ref={ref} className="absolute inset-0 size-full" aria-hidden />;
}
