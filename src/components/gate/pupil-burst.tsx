"use client";

import * as React from "react";
import { useMotionValueEvent, type MotionValue } from "motion/react";

/**
 * Gold-dust breakthrough: as the camera plunges the last stretch into the
 * pupil (gate progress ~0.78 → 1), a burst of golden sparks erupts radially
 * from the center — scroll-driven (scrubs forward AND backward), with a
 * time-based twinkle on top. Drawn additively above the black veil.
 */

const COUNT = 420;
const START = 0.78; // gate progress where the burst begins
const SPAN = 0.22;

interface Spark {
  angle: number;
  r0: number; // start radius (fraction of maxDim)
  reach: number; // how far it flies
  size: number;
  tone: number;
  jitter: number;
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

const rnd = mulberry32(0xa01d);
const SPARKS: Spark[] = Array.from({ length: COUNT }, () => ({
  angle: rnd() * Math.PI * 2,
  r0: 0.01 + rnd() * 0.05,
  reach: 0.25 + Math.pow(rnd(), 0.7) * 0.65,
  size: 0.6 + rnd() * 1.8,
  tone: rnd(),
  jitter: rnd() * Math.PI * 2,
}));

function color(tone: number, alpha: number): string {
  if (tone > 0.95) return `rgba(255,246,230,${alpha})`;
  if (tone > 0.85) return `rgba(246,120,44,${alpha})`;
  if (tone > 0.5) return `rgba(246,201,92,${alpha})`;
  return `rgba(232,168,58,${alpha})`;
}

export function PupilBurst({ progress }: { progress: MotionValue<number> }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const burst = React.useRef(0);

  useMotionValueEvent(progress, "change", (v) => {
    burst.current = Math.min(1, Math.max(0, (v - START) / SPAN));
  });

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

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

    let raf = 0;
    let wasIdle = false;
    const start = performance.now();

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const b = burst.current;
      if (b <= 0.001) {
        if (!wasIdle) {
          ctx.clearRect(0, 0, W, H);
          wasIdle = true;
        }
        return;
      }
      wasIdle = false;

      const t = (now - start) * 0.001;
      const cx = W / 2;
      const cy = H / 2;
      const maxDim = Math.max(W, H);

      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";

      // breakthrough shockwave ring
      const ringR = (0.06 + b * 0.75) * maxDim;
      const ringA = 0.5 * (1 - b) * Math.min(1, b * 6);
      if (ringA > 0.01) {
        ctx.strokeStyle = `rgba(246,201,92,${ringA})`;
        ctx.lineWidth = 1.5 + (1 - b) * 2;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.stroke();
      }

      // core glow
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxDim * 0.16);
      const glowA = 0.5 * Math.min(1, b * 4) * (1 - b * 0.75);
      glow.addColorStop(0, `rgba(255,220,140,${glowA})`);
      glow.addColorStop(1, "rgba(255,220,140,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(cx - maxDim * 0.16, cy - maxDim * 0.16, maxDim * 0.32, maxDim * 0.32);

      // sparks
      const ease = 1 - Math.pow(1 - b, 2.2);
      for (const s of SPARKS) {
        const swirl = Math.sin(t * 0.8 + s.jitter) * 0.05 * (1 - b);
        const a = s.angle + swirl;
        const r = (s.r0 + s.reach * ease) * maxDim;
        const speed = s.reach * (1 - ease) + 0.12; // apparent velocity
        const len = Math.min(0.09 * maxDim, speed * 0.16 * maxDim * (0.25 + b));
        const twinkle = 0.55 + 0.45 * Math.sin(t * 5 + s.jitter * 7);
        const alpha =
          Math.min(1, b * 5) * // ignition
          (1 - Math.max(0, (r / maxDim - 0.62) / 0.3)) * // fade far out
          (0.35 + 0.65 * twinkle);
        if (alpha <= 0.02) continue;

        const x1 = cx + Math.cos(a) * r;
        const y1 = cy + Math.sin(a) * r;
        const x0 = cx + Math.cos(a) * Math.max(0, r - len);
        const y0 = cy + Math.sin(a) * Math.max(0, r - len);

        ctx.strokeStyle = color(s.tone, alpha);
        ctx.lineWidth = s.size * (1 + b * 0.4);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 size-full"
      aria-hidden
    />
  );
}
