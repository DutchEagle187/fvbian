"use client";

import * as React from "react";

/**
 * Procedurally painted raptor eye.
 *
 * The iris is built from ~600 individually jittered radial fibers in layered
 * passes (base disc → dark limbal ring → fiber coat → collarette → pupil →
 * specular highlights), driven by a seeded PRNG so every visitor sees the
 * same eye. `pupil` (0..1) dilates the pupil, `rage` (0..1) shifts the
 * palette from calm gold to burning ember while scrolling.
 */

export interface EyeParams {
  /** 0..1 — relative pupil radius (0 = pin, 1 = fully dilated portal) */
  pupil: number;
  /** 0..1 — palette shift gold → ember */
  rage: number;
  /** radians — slow fiber rotation bound to scroll */
  rotation: number;
}

interface EagleEyeProps {
  /** Mutable params, read every animation frame — no React re-renders. */
  paramsRef: React.RefObject<EyeParams>;
  className?: string;
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

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Palette stops as [h, s%, l%] — calm gold vs. burning ember. */
const CALM: [number, number, number][] = [
  [36, 30, 14], // outer dark brown
  [38, 62, 32], // umber
  [41, 78, 46], // amber
  [44, 88, 58], // gold
  [48, 95, 68], // bright gold
];
const EMBER: [number, number, number][] = [
  [18, 45, 12],
  [22, 75, 30],
  [28, 92, 46],
  [33, 98, 56],
  [40, 100, 66],
];

function stop(i: number, rage: number): string {
  const c = CALM[i];
  const e = EMBER[i];
  const h = lerp(c[0], e[0], rage);
  const s = lerp(c[1], e[1], rage);
  const l = lerp(c[2], e[2], rage);
  return `hsl(${h} ${s}% ${l}%)`;
}

// Pre-generated fiber params (seeded, module-level so they never re-roll).
interface Fiber {
  angle: number;
  len: number; // 0..1 of iris band
  width: number;
  tone: number; // 0..1 position in palette
  alpha: number;
  bend: number;
  inset: number; // where the fiber starts inside the band
}

function buildFibers(count: number, seed: number): Fiber[] {
  const rnd = mulberry32(seed);
  const fibers: Fiber[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (rnd() - 0.5) * 0.035;
    fibers.push({
      angle,
      len: 0.55 + rnd() * 0.45,
      width: 0.8 + rnd() * 2.0,
      tone: Math.pow(rnd(), 0.8),
      alpha: 0.25 + rnd() * 0.55,
      bend: (rnd() - 0.5) * 0.22,
      inset: rnd() * 0.25,
    });
  }
  return fibers;
}

const FIBERS = buildFibers(620, 0xfab1a2);
const SPARKS = buildFibers(140, 0x00e51e);

export function EagleEye({ paramsRef, className }: EagleEyeProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const raf = React.useRef<number>(0);
  const last = React.useRef({ pupil: -1, rage: -1, rotation: -1 });

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const SIZE = 1100;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;

    const draw = () => {
      const { pupil: p, rage: rg, rotation: rot } = paramsRef.current;
      const l = last.current;
      // Skip redraws when nothing moved (idle frames are free).
      if (
        Math.abs(l.pupil - p) < 0.0015 &&
        Math.abs(l.rage - rg) < 0.004 &&
        Math.abs(l.rotation - rot) < 0.0015
      ) {
        raf.current = requestAnimationFrame(draw);
        return;
      }
      last.current = { pupil: p, rage: rg, rotation: rot };

      const c = SIZE / 2;
      const irisR = SIZE * 0.46;
      const pupilR = irisR * lerp(0.2, 0.98, p);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, SIZE, SIZE);

      // ---- iris base disc
      const base = ctx.createRadialGradient(c, c, pupilR * 0.4, c, c, irisR);
      base.addColorStop(0, stop(1, rg));
      base.addColorStop(0.45, stop(2, rg));
      base.addColorStop(0.78, stop(3, rg));
      base.addColorStop(1, stop(0, rg));
      ctx.fillStyle = base;
      ctx.beginPath();
      ctx.arc(c, c, irisR, 0, Math.PI * 2);
      ctx.fill();

      // ---- fiber coat
      ctx.save();
      ctx.translate(c, c);
      ctx.rotate(rot);
      ctx.lineCap = "round";
      const band = irisR - pupilR;
      for (const f of FIBERS) {
        const r0 = pupilR + band * f.inset * 0.3 + 1;
        const r1 = pupilR + band * f.len;
        const a0 = f.angle;
        const a1 = f.angle + f.bend * (band / irisR);
        const x0 = Math.cos(a0) * r0;
        const y0 = Math.sin(a0) * r0;
        const x1 = Math.cos(a1) * r1;
        const y1 = Math.sin(a1) * r1;
        const mx = Math.cos((a0 + a1) / 2 + f.bend * 0.35) * ((r0 + r1) / 2);
        const my = Math.sin((a0 + a1) / 2 + f.bend * 0.35) * ((r0 + r1) / 2);
        const tone = Math.min(4, Math.max(1, Math.round(1 + f.tone * 3)));
        ctx.strokeStyle = stop(tone, rg);
        ctx.globalAlpha = f.alpha;
        ctx.lineWidth = f.width;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(mx, my, x1, y1);
        ctx.stroke();
      }
      // bright spark fibers (screen-ish)
      ctx.globalCompositeOperation = "lighter";
      for (const f of SPARKS) {
        const r0 = pupilR + band * (0.05 + f.inset * 0.4);
        const r1 = pupilR + band * (0.35 + f.len * 0.5);
        ctx.strokeStyle = stop(4, rg);
        ctx.globalAlpha = f.alpha * 0.35;
        ctx.lineWidth = f.width * 0.7;
        ctx.beginPath();
        ctx.moveTo(Math.cos(f.angle) * r0, Math.sin(f.angle) * r0);
        ctx.lineTo(Math.cos(f.angle + f.bend * 0.4) * r1, Math.sin(f.angle + f.bend * 0.4) * r1);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.restore();

      // ---- collarette (dark lace ring hugging the pupil)
      const colR = pupilR + band * 0.14;
      const col = ctx.createRadialGradient(c, c, pupilR, c, c, colR + band * 0.1);
      col.addColorStop(0, "rgba(20,10,2,0.55)");
      col.addColorStop(0.6, "rgba(30,14,3,0.25)");
      col.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(c, c, colR + band * 0.12, 0, Math.PI * 2);
      ctx.fill();

      // ---- limbal ring (dark outer edge)
      const limb = ctx.createRadialGradient(c, c, irisR * 0.8, c, c, irisR);
      limb.addColorStop(0, "rgba(0,0,0,0)");
      limb.addColorStop(0.75, "rgba(15,7,1,0.35)");
      limb.addColorStop(1, "rgba(5,2,0,0.95)");
      ctx.fillStyle = limb;
      ctx.beginPath();
      ctx.arc(c, c, irisR, 0, Math.PI * 2);
      ctx.fill();

      // ---- pupil
      const pup = ctx.createRadialGradient(c, c, pupilR * 0.75, c, c, pupilR * 1.06);
      pup.addColorStop(0, "rgb(2,1,0)");
      pup.addColorStop(0.92, "rgb(4,2,1)");
      pup.addColorStop(1, "rgba(10,4,0,0)");
      ctx.fillStyle = pup;
      ctx.beginPath();
      ctx.arc(c, c, pupilR * 1.06, 0, Math.PI * 2);
      ctx.fill();

      // ---- specular highlights
      const hlA = ctx.createRadialGradient(
        c - irisR * 0.34,
        c - irisR * 0.42,
        0,
        c - irisR * 0.34,
        c - irisR * 0.42,
        irisR * 0.3
      );
      hlA.addColorStop(0, "rgba(255,252,245,0.85)");
      hlA.addColorStop(0.25, "rgba(255,250,240,0.28)");
      hlA.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = hlA;
      ctx.beginPath();
      ctx.ellipse(
        c - irisR * 0.34,
        c - irisR * 0.42,
        irisR * 0.22,
        irisR * 0.13,
        -0.6,
        0,
        Math.PI * 2
      );
      ctx.fill();

      const hlB = ctx.createRadialGradient(
        c + irisR * 0.3,
        c + irisR * 0.38,
        0,
        c + irisR * 0.3,
        c + irisR * 0.38,
        irisR * 0.12
      );
      hlB.addColorStop(0, "rgba(255,240,210,0.35)");
      hlB.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = hlB;
      ctx.beginPath();
      ctx.arc(c + irisR * 0.3, c + irisR * 0.38, irisR * 0.12, 0, Math.PI * 2);
      ctx.fill();

      raf.current = requestAnimationFrame(draw);
    };

    raf.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%" }}
      aria-hidden
    />
  );
}
