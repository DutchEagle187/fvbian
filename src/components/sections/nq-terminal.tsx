"use client";

import * as React from "react";
import { motion, useInView } from "motion/react";

import { cn } from "@/lib/utils";

/**
 * A living NQ tape: procedurally simulated E-mini Nasdaq-100 price action
 * rendered as glowing candlesticks on canvas. Pure simulation — no market
 * data leaves or enters; it just *feels* like the open.
 */

interface Candle {
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

const START_PRICE = 24_850;
const TICK = 0.25;
const MAX_CANDLES = 96;

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

class Sim {
  price = START_PRICE;
  momentum = 0;
  vol = 1;
  candles: Candle[] = [];
  rnd = mulberry32(0x9e4f00d);

  constructor() {
    for (let i = 0; i < MAX_CANDLES; i++) this.push();
  }

  private gauss() {
    return (this.rnd() + this.rnd() + this.rnd() + this.rnd() - 2) / 1.2;
  }

  tick() {
    // momentum + volatility clustering → trending, breathing tape
    this.momentum = this.momentum * 0.94 + this.gauss() * 0.9;
    this.vol = Math.max(0.5, Math.min(3.4, this.vol * 0.985 + Math.abs(this.gauss()) * 0.09));
    const dp = (this.momentum * 0.55 + this.gauss() * 1.6) * this.vol;
    this.price = Math.round((this.price + dp * TICK * 4) / TICK) * TICK;
    const cur = this.candles[this.candles.length - 1];
    cur.c = this.price;
    cur.h = Math.max(cur.h, this.price);
    cur.l = Math.min(cur.l, this.price);
    cur.v += 1 + Math.abs(dp) * 0.6;
  }

  push() {
    this.candles.push({
      o: this.price,
      h: this.price,
      l: this.price,
      c: this.price,
      v: 1,
    });
    if (this.candles.length > MAX_CANDLES) this.candles.shift();
    // seed some initial movement for fresh candles
    for (let i = 0; i < 6; i++) this.tick();
  }
}

const BULL = "#34d97b";
const BEAR = "#f4564a";

export function NqTerminal() {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const inView = useInView(wrapRef, { margin: "200px" });
  const [readout, setReadout] = React.useState({
    price: START_PRICE,
    change: 0,
    high: START_PRICE,
    low: START_PRICE,
    vol: 0,
  });

  React.useEffect(() => {
    if (!inView) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sim = new Sim();
    const sessionOpen = sim.candles[0].o;
    let raf = 0;
    let lastTick = 0;
    let lastCandle = 0;
    let lastReadout = 0;

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - lastTick > 90) {
        sim.tick();
        lastTick = now;
      }
      if (now - lastCandle > 1100) {
        sim.push();
        lastCandle = now;
      }
      if (now - lastReadout > 250) {
        const hi = Math.max(...sim.candles.map((c) => c.h));
        const lo = Math.min(...sim.candles.map((c) => c.l));
        setReadout({
          price: sim.price,
          change: ((sim.price - sessionOpen) / sessionOpen) * 100,
          high: hi,
          low: lo,
          vol: sim.candles.reduce((s, c) => s + c.v, 0),
        });
        lastReadout = now;
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

      const candles = sim.candles;
      const hi = Math.max(...candles.map((c) => c.h));
      const lo = Math.min(...candles.map((c) => c.l));
      const pad = (hi - lo) * 0.12 + 1;
      const top = hi + pad;
      const bot = lo - pad;
      const y = (p: number) => ((top - p) / (top - bot)) * (H - 28);
      const cw = W / MAX_CANDLES;

      // grid + price labels
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.font = "10px var(--font-geist-mono), monospace";
      ctx.lineWidth = 1;
      const steps = 5;
      for (let i = 0; i <= steps; i++) {
        const p = bot + ((top - bot) * i) / steps;
        const yy = y(p);
        ctx.beginPath();
        ctx.moveTo(0, yy);
        ctx.lineTo(W, yy);
        ctx.stroke();
        ctx.fillText(p.toFixed(0), W - 44, yy - 3);
      }

      // volume
      const maxV = Math.max(...candles.map((c) => c.v));
      for (let i = 0; i < candles.length; i++) {
        const c = candles[i];
        const x = i * cw;
        const vh = (c.v / maxV) * 26;
        ctx.fillStyle =
          c.c >= c.o ? "rgba(52,217,123,0.16)" : "rgba(244,86,74,0.16)";
        ctx.fillRect(x + cw * 0.18, H - vh, cw * 0.64, vh);
      }

      // candles with glow
      for (let i = 0; i < candles.length; i++) {
        const c = candles[i];
        const x = i * cw + cw / 2;
        const up = c.c >= c.o;
        const col = up ? BULL : BEAR;
        ctx.strokeStyle = col;
        ctx.fillStyle = col;
        ctx.shadowColor = col;
        ctx.shadowBlur = i === candles.length - 1 ? 14 : 5;
        ctx.lineWidth = 1;
        // wick
        ctx.beginPath();
        ctx.moveTo(x, y(c.h));
        ctx.lineTo(x, y(c.l));
        ctx.stroke();
        // body
        const by = y(Math.max(c.o, c.c));
        const bh = Math.max(1.5, Math.abs(y(c.o) - y(c.c)));
        ctx.fillRect(x - cw * 0.32, by, cw * 0.64, bh);
      }
      ctx.shadowBlur = 0;

      // last-price line
      const ly = y(sim.price);
      const up = sim.price >= sessionOpen;
      ctx.strokeStyle = up ? BULL : BEAR;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, ly);
      ctx.lineTo(W, ly);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = up ? BULL : BEAR;
      ctx.fillRect(W - 58, ly - 9, 54, 16);
      ctx.fillStyle = "#04140a";
      ctx.font = "bold 10px var(--font-geist-mono), monospace";
      ctx.fillText(sim.price.toFixed(2), W - 55, ly + 3);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [inView]);

  const up = readout.change >= 0;

  return (
    <section id="nq" className="relative px-4 py-24 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionKicker index="01" title="THE TAPE" accent="text-bull" />
        <h2 className="mt-3 font-display text-4xl font-bold uppercase leading-none sm:text-6xl">
          NQ <span className="text-outline">FUTURES</span>
        </h2>
        <p className="mt-4 max-w-lg text-sm text-muted">
          E-mini Nasdaq-100. Der Herzschlag der Session — simuliert, aber mit
          Momentum, Volatilitäts-Clustern und Orderflow-Gefühl.
        </p>

        <div
          ref={wrapRef}
          className="relative mt-10 overflow-hidden rounded-xl border border-line bg-black/60 backdrop-blur"
        >
          {/* header row */}
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-b border-line px-5 py-4 font-mono">
            <span className="text-xs tracking-[0.3em] text-muted">NQ=F</span>
            <span
              className={cn(
                "text-2xl font-bold tabular-nums",
                up ? "text-bull" : "text-bear"
              )}
            >
              {readout.price.toFixed(2)}
            </span>
            <span
              className={cn(
                "text-sm tabular-nums",
                up ? "text-bull" : "text-bear"
              )}
            >
              {up ? "▲" : "▼"} {Math.abs(readout.change).toFixed(2)}%
            </span>
            <span className="ml-auto hidden items-center gap-2 text-[10px] tracking-[0.25em] text-muted sm:flex">
              <span className="inline-block size-1.5 animate-pulse rounded-full bg-bull" />
              SIMULATED FEED · CME GLOBEX VIBES
            </span>
          </div>

          {/* chart */}
          <div className="scanlines relative h-[340px] sm:h-[420px]">
            <canvas ref={canvasRef} className="size-full" />
          </div>

          {/* footer stats */}
          <div className="grid grid-cols-2 gap-px border-t border-line bg-line font-mono text-xs sm:grid-cols-4">
            {[
              ["SESSION HIGH", readout.high.toFixed(2), "text-bull"],
              ["SESSION LOW", readout.low.toFixed(2), "text-bear"],
              ["VOLUME", Math.round(readout.vol).toLocaleString("de-CH"), "text-fg"],
              ["TICK SIZE", "0.25 / $5.00", "text-gold"],
            ].map(([label, value, color]) => (
              <div key={label} className="bg-bg-deep px-5 py-4">
                <div className="text-[10px] tracking-[0.25em] text-muted">
                  {label}
                </div>
                <div className={cn("mt-1 tabular-nums", color)}>{value}</div>
              </div>
            ))}
          </div>

          {/* glowing edge accents */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-bull/70 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
        </div>
      </div>
    </section>
  );
}

export function SectionKicker({
  index,
  title,
  accent,
}: {
  index: string;
  title: string;
  accent?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      className="flex items-center gap-3 font-mono text-xs tracking-[0.4em] text-muted"
    >
      <span className={cn("text-base", accent)}>◤</span>
      <span>{index}</span>
      <span className="h-px w-10 bg-line" />
      <span>{title}</span>
    </motion.div>
  );
}
