"use client";

import * as React from "react";
import { useInView } from "motion/react";

/**
 * The NQ tape, reduced to a design element: a slim strip of glowing
 * candlesticks drifting leftward like a heartbeat line between sections.
 * Pure simulation, pauses offscreen, respects reduced motion.
 */

interface Candle {
  o: number;
  h: number;
  l: number;
  c: number;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BULL = "#34d97b";
const BEAR = "#f4564a";

export function TapeStrip() {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const inView = useInView(wrapRef, { margin: "150px" });
  const [price, setPrice] = React.useState(24_850);

  React.useEffect(() => {
    if (!inView) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const rnd = mulberry32(0x7ade);
    const gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) / 1.2;

    let p = 24_850;
    let momentum = 0;
    const candles: Candle[] = [];
    const newCandle = () => {
      const cur: Candle = { o: p, h: p, l: p, c: p };
      for (let i = 0; i < 5; i++) {
        momentum = momentum * 0.93 + gauss();
        p = Math.round((p + (momentum * 0.5 + gauss() * 1.4)) * 4) / 4;
        cur.c = p;
        cur.h = Math.max(cur.h, p);
        cur.l = Math.min(cur.l, p);
      }
      return cur;
    };
    for (let i = 0; i < 260; i++) candles.push(newCandle());

    const CW = 9; // candle slot width in px
    let offset = 0;
    let raf = 0;
    let last = performance.now();
    let lastPrice = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(64, now - last);
      last = now;
      if (!reduced) offset += dt * 0.012; // drift speed
      while (offset >= CW) {
        offset -= CW;
        candles.shift();
        candles.push(newCandle());
      }
      if (now - lastPrice > 400) {
        setPrice(candles[candles.length - 1].c);
        lastPrice = now;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
        canvas.width = W * dpr;
        canvas.height = H * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const count = Math.ceil(W / CW) + 2;
      const visible = candles.slice(-count);
      let hi = -Infinity;
      let lo = Infinity;
      for (const c of visible) {
        hi = Math.max(hi, c.h);
        lo = Math.min(lo, c.l);
      }
      const pad = (hi - lo) * 0.25 + 0.5;
      const y = (v: number) => ((hi + pad - v) / (hi - lo + pad * 2)) * H;

      for (let i = 0; i < visible.length; i++) {
        const c = visible[i];
        const x = W - (visible.length - i) * CW - offset + CW / 2;
        const up = c.c >= c.o;
        const col = up ? BULL : BEAR;
        ctx.strokeStyle = col;
        ctx.fillStyle = col;
        ctx.globalAlpha = 0.75;
        ctx.shadowColor = col;
        ctx.shadowBlur = 6;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y(c.h));
        ctx.lineTo(x, y(c.l));
        ctx.stroke();
        const by = y(Math.max(c.o, c.c));
        const bh = Math.max(1.2, Math.abs(y(c.o) - y(c.c)));
        ctx.fillRect(x - 2.6, by, 5.2, bh);
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [inView]);

  return (
    <div
      ref={wrapRef}
      className="relative flex items-center overflow-hidden border-y border-line bg-black/40"
      aria-hidden
    >
      {/* left label */}
      <div className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 sm:left-8">
        <div className="font-mono text-[9px] tracking-[0.4em] text-muted">
          NQ · GLOBEX
        </div>
        <div className="font-mono text-sm font-bold tabular-nums text-bull">
          {price.toFixed(2)}
        </div>
      </div>
      {/* fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-[5] w-44 bg-gradient-to-r from-bg-deep to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-[5] w-24 bg-gradient-to-l from-bg-deep to-transparent" />

      <canvas ref={canvasRef} className="h-[110px] w-full" />
    </div>
  );
}
