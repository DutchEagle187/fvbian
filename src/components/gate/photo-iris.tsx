"use client";

import * as React from "react";

import type { EyeParams } from "./eagle-eye";

/**
 * The REAL eagle iris as a living eye: renders /iris-macro.webp (extracted
 * from the head photo, so color & pattern are pixel-identical) and paints the
 * dynamic parts on top — pupil (dilation), ember glow (rage) and the specular
 * highlight matching the photo. Texture is normalized so its iris radius is
 * exactly 0.46 × size, identical to the procedural eye's geometry.
 */

interface PhotoIrisProps {
  paramsRef: React.RefObject<EyeParams>;
  className?: string;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function PhotoIris({ paramsRef, className }: PhotoIrisProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const raf = React.useRef<number>(0);
  const last = React.useRef({ pupil: -1, rage: -1, rotation: -1, ready: false });

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const SIZE = 1100;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;

    const tex = new Image();
    let texReady = false;
    tex.onload = () => {
      texReady = true;
      last.current.pupil = -1; // force redraw
    };
    tex.src = "/iris-macro.webp";

    const draw = () => {
      raf.current = requestAnimationFrame(draw);
      if (!texReady) return;
      const {
        pupil: p,
        rage: rg,
        rotation: rot,
        pupilOffsetX = 0,
        pupilOffsetY = 0,
      } = paramsRef.current;
      const l = last.current;
      if (
        l.ready &&
        Math.abs(l.pupil - p) < 0.0015 &&
        Math.abs(l.rage - rg) < 0.004 &&
        Math.abs(l.rotation - rot) < 0.0015
      ) {
        return;
      }
      last.current = { pupil: p, rage: rg, rotation: rot, ready: true };

      const c = SIZE / 2;
      const irisR = SIZE * 0.46;
      const pupilR = irisR * lerp(0.2, 0.98, p);
      const pcx = c + pupilOffsetX * irisR;
      const pcy = c + pupilOffsetY * irisR;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, SIZE, SIZE);

      // ---- the real iris texture, clipped to the iris disc so the head
      // photo behind stays visible around it (no dark square)
      ctx.save();
      ctx.beginPath();
      ctx.arc(c, c, irisR * 1.02, 0, Math.PI * 2);
      ctx.clip();
      ctx.translate(c, c);
      ctx.rotate(rot);
      ctx.drawImage(tex, -c, -c, SIZE, SIZE);
      ctx.restore();

      // ---- ember ignition (rage): warm overlay + outer glow
      if (rg > 0.01) {
        ctx.save();
        ctx.globalCompositeOperation = "overlay";
        ctx.globalAlpha = rg * 0.75;
        const ember = ctx.createRadialGradient(c, c, pupilR, c, c, irisR);
        ember.addColorStop(0, "rgb(255,140,30)");
        ember.addColorStop(0.7, "rgb(255,90,10)");
        ember.addColorStop(1, "rgb(120,30,0)");
        ctx.fillStyle = ember;
        ctx.beginPath();
        ctx.arc(c, c, irisR * 1.01, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // ---- dynamic pupil (covers the baked-in one, then dilates)
      const pup = ctx.createRadialGradient(
        pcx,
        pcy,
        pupilR * 0.75,
        pcx,
        pcy,
        pupilR * 1.06
      );
      pup.addColorStop(0, "rgb(2,1,0)");
      pup.addColorStop(0.92, "rgb(4,2,1)");
      pup.addColorStop(1, "rgba(10,4,0,0)");
      ctx.fillStyle = pup;
      ctx.beginPath();
      ctx.arc(pcx, pcy, pupilR * 1.06, 0, Math.PI * 2);
      ctx.fill();

      // ---- limbal edge
      const limb = ctx.createRadialGradient(c, c, irisR * 0.82, c, c, irisR * 1.02);
      limb.addColorStop(0, "rgba(0,0,0,0)");
      limb.addColorStop(0.8, "rgba(15,7,1,0.28)");
      limb.addColorStop(1, "rgba(5,2,0,0.9)");
      ctx.fillStyle = limb;
      ctx.beginPath();
      ctx.arc(c, c, irisR * 1.02, 0, Math.PI * 2);
      ctx.fill();

      // ---- specular highlight (position matched to the photo)
      const hx = c - irisR * 0.52;
      const hy = c - irisR * 0.5;
      const hl = ctx.createRadialGradient(hx, hy, 0, hx, hy, irisR * 0.3);
      hl.addColorStop(0, "rgba(255,252,245,0.8)");
      hl.addColorStop(0.3, "rgba(255,250,240,0.25)");
      hl.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = hl;
      ctx.beginPath();
      ctx.ellipse(hx, hy, irisR * 0.26, irisR * 0.16, -0.5, 0, Math.PI * 2);
      ctx.fill();

      const hb = ctx.createRadialGradient(
        c + irisR * 0.32,
        c + irisR * 0.4,
        0,
        c + irisR * 0.32,
        c + irisR * 0.4,
        irisR * 0.11
      );
      hb.addColorStop(0, "rgba(255,240,210,0.3)");
      hb.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = hb;
      ctx.beginPath();
      ctx.arc(c + irisR * 0.32, c + irisR * 0.4, irisR * 0.11, 0, Math.PI * 2);
      ctx.fill();
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
