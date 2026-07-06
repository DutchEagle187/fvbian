"use client";

import * as React from "react";
import { motion, useInView } from "motion/react";

import { SectionKicker } from "./section-kicker";

/**
 * THE HUNT — an interactive murmuration. ~2200 particles drift through a
 * flowing field like a starling swarm; your cursor is the raptor, and the
 * swarm scatters around it with motion trails. Pointer-less devices get a
 * phantom predator roaming on a Lissajous path. Pure canvas, zero deps.
 */

const COUNT = 2200;
const FLEE_R = 150;

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tone: number; // 0..1 → color pick
}

export function HuntSwarm() {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const inView = useInView(wrapRef, { margin: "150px" });
  const pointer = React.useRef({ x: -9999, y: -9999, seen: false });

  React.useEffect(() => {
    if (!inView) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = 0;
    let H = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const resize = () => {
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "rgb(8,8,12)";
      ctx.fillRect(0, 0, W, H);
    };
    resize();
    window.addEventListener("resize", resize);

    const parts: P[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * (W || 800),
      y: Math.random() * (H || 600),
      vx: (Math.random() - 0.5) * 1.2,
      vy: (Math.random() - 0.5) * 1.2,
      tone: Math.random(),
    }));

    const colors = [
      "rgba(232,168,58,", // gold
      "rgba(246,201,92,", // bright gold
      "rgba(246,146,60,", // ember
      "rgba(214,214,222,", // silver (few)
    ];
    const pickColor = (tone: number) =>
      tone > 0.93 ? colors[3] : tone > 0.6 ? colors[2] : tone > 0.3 ? colors[1] : colors[0];

    let raf = 0;
    const start = performance.now();

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const t = (now - start) * 0.001;

      // motion trails
      ctx.fillStyle = "rgba(8,8,12,0.18)";
      ctx.fillRect(0, 0, W, H);

      // predator position: real pointer, or phantom on a lissajous path
      let px = pointer.current.x;
      let py = pointer.current.y;
      if (!pointer.current.seen) {
        px = W / 2 + Math.sin(t * 0.5) * W * 0.32;
        py = H / 2 + Math.sin(t * 0.83 + 1.2) * H * 0.3;
      }

      const fleeR2 = FLEE_R * FLEE_R;

      for (const p of parts) {
        if (!reduced) {
          // flowing field (cheap pseudo-noise)
          const a =
            Math.sin(p.x * 0.0021 + t * 0.35) * 1.7 +
            Math.cos(p.y * 0.0024 - t * 0.27) * 1.7;
          p.vx += Math.cos(a) * 0.035;
          p.vy += Math.sin(a) * 0.035;

          // soft pull toward the center band so the swarm stays on stage
          p.vx += (W * 0.5 - p.x) * 0.000012;
          p.vy += (H * 0.5 - p.y) * 0.000018;

          // flee the raptor
          const dx = p.x - px;
          const dy = p.y - py;
          const d2 = dx * dx + dy * dy;
          if (d2 < fleeR2 && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const f = ((FLEE_R - d) / FLEE_R) ** 2 * 2.6;
            p.vx += (dx / d) * f;
            p.vy += (dy / d) * f;
          }

          // speed limits (panicked birds fly faster)
          const sp = Math.hypot(p.vx, p.vy);
          const maxSp = d2 < fleeR2 * 2.2 ? 5.2 : 2.1;
          if (sp > maxSp) {
            p.vx = (p.vx / sp) * maxSp;
            p.vy = (p.vy / sp) * maxSp;
          } else if (sp < 0.35) {
            p.vx += (Math.random() - 0.5) * 0.2;
            p.vy += (Math.random() - 0.5) * 0.2;
          }

          p.x += p.vx;
          p.y += p.vy;

          // wrap softly
          if (p.x < -12) p.x = W + 10;
          if (p.x > W + 12) p.x = -10;
          if (p.y < -12) p.y = H + 10;
          if (p.y > H + 12) p.y = -10;
        }

        const sp = Math.hypot(p.vx, p.vy);
        const alpha = Math.min(0.85, 0.28 + sp * 0.16);
        ctx.fillStyle = pickColor(p.tone) + alpha + ")";
        const s = p.tone > 0.85 ? 2.2 : 1.5;
        ctx.fillRect(p.x, p.y, s, s);
      }

      // the raptor reticle
      ctx.strokeStyle = "rgba(232,168,58,0.9)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(px, py, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(232,168,58,1)";
      ctx.fill();
      ctx.strokeStyle = "rgba(232,168,58,0.5)";
      for (const [ox, oy] of [
        [22, 0],
        [-22, 0],
        [0, 22],
        [0, -22],
      ] as const) {
        ctx.beginPath();
        ctx.moveTo(px + ox * 0.55, py + oy * 0.55);
        ctx.lineTo(px + ox, py + oy);
        ctx.stroke();
      }

      if (reduced) cancelAnimationFrame(raf);
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [inView]);

  return (
    <section id="hunt" className="relative">
      <div
        ref={wrapRef}
        className="relative h-svh overflow-hidden"
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          pointer.current = {
            x: e.clientX - r.left,
            y: e.clientY - r.top,
            seen: true,
          };
        }}
        onPointerLeave={() => {
          pointer.current = { ...pointer.current, x: -9999, y: -9999 };
        }}
      >
        <canvas ref={canvasRef} className="absolute inset-0 size-full" />

        {/* copy overlay */}
        <div className="pointer-events-none absolute inset-x-0 top-0 px-4 pt-20 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <SectionKicker index="01" title="THE HUNT" accent="text-gold" />
            <h2 className="mt-3 font-display text-4xl font-bold uppercase leading-none sm:text-6xl">
              DER <span className="text-outline">SCHWARM</span>
            </h2>
            <p className="mt-4 max-w-md text-sm text-muted">
              2’200 Vögel. Ein Raubtier. Beweg den Cursor — der Schwarm liest
              deine Flugbahn und bricht auseinander.
            </p>
          </div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 1, duration: 1 }}
          className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-[10px] tracking-[0.4em] text-muted"
        >
          DU BIST DER ADLER
        </motion.p>
      </div>
    </section>
  );
}
