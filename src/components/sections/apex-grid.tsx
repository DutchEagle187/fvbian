"use client";

import * as React from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useInView,
} from "motion/react";

import { SectionKicker } from "./section-kicker";
import { useImageAvailable } from "@/lib/use-image";

/**
 * The trinity: eagle (vision), cheetah (speed), lemur (instinct).
 * Each card carries its own procedural canvas artwork and an optional
 * photoreal image slot (drop /public/apex/<id>.webp — e.g. from Higgsfield —
 * and it takes over automatically).
 */

type DrawFn = (
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number
) => void;

interface Animal {
  id: "eagle" | "cheetah" | "lemur";
  name: string; // alt text only
  role: string;
  accentVar: string;
  draw: DrawFn;
}

/* ---------------------------- canvas artworks ---------------------------- */

const drawEagle: DrawFn = (ctx, W, H, t) => {
  const cx = W / 2;
  const cy = H / 2;
  const R = Math.min(W, H) * 0.4;
  ctx.strokeStyle = "rgba(232,168,58,0.5)";
  ctx.fillStyle = "rgba(232,168,58,0.5)";
  ctx.lineWidth = 1;
  // rings
  for (let i = 1; i <= 4; i++) {
    ctx.globalAlpha = 0.25 + i * 0.08;
    ctx.beginPath();
    ctx.arc(cx, cy, (R * i) / 4, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.moveTo(cx - R, cy);
  ctx.lineTo(cx + R, cy);
  ctx.moveTo(cx, cy - R);
  ctx.lineTo(cx, cy + R);
  ctx.stroke();
  // sweep
  const a = t * 0.9;
  const grad = ctx.createConicGradient
    ? ctx.createConicGradient(a, cx, cy)
    : null;
  if (grad) {
    grad.addColorStop(0, "rgba(232,168,58,0.4)");
    grad.addColorStop(0.12, "rgba(232,168,58,0)");
    grad.addColorStop(1, "rgba(232,168,58,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();
  }
  // target blip (orbits slowly, pulses when sweep passes)
  const ba = t * 0.23 + 2;
  const bx = cx + Math.cos(ba) * R * 0.62;
  const by = cy + Math.sin(ba) * R * 0.62;
  const diff = Math.abs(((a - ba) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const hot = diff < 0.5 ? 1 - diff / 0.5 : 0;
  ctx.globalAlpha = 0.5 + hot * 0.5;
  ctx.fillStyle = "#e8a83a";
  ctx.shadowColor = "#e8a83a";
  ctx.shadowBlur = 8 + hot * 16;
  ctx.beginPath();
  ctx.arc(bx, by, 3 + hot * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
};

const drawCheetah: DrawFn = (ctx, W, H, t) => {
  // horizontal velocity streaks
  for (let i = 0; i < 26; i++) {
    const yy = (i / 26) * H + Math.sin(i * 13.37) * 6;
    const speed = 120 + ((i * 761) % 240);
    const len = 30 + ((i * 397) % 90);
    const x = W - (((t * speed + i * 173) % (W + len)) - len);
    const g = ctx.createLinearGradient(x - len, 0, x, 0);
    g.addColorStop(0, "rgba(246,146,60,0)");
    g.addColorStop(1, `rgba(246,146,60,${0.12 + (i % 5) * 0.1})`);
    ctx.strokeStyle = g;
    ctx.lineWidth = i % 4 === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x - len, yy);
    ctx.lineTo(x, yy);
    ctx.stroke();
  }
  // speedometer arc
  const cx = W / 2;
  const cy = H * 0.72;
  const R = Math.min(W, H) * 0.32;
  const kmh = 60 + Math.abs(Math.sin(t * 0.5)) * 60.5;
  const frac = kmh / 130;
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, R, Math.PI * 0.85, Math.PI * 2.15);
  ctx.stroke();
  ctx.strokeStyle = "#f6923c";
  ctx.shadowColor = "#f6923c";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(cx, cy, R, Math.PI * 0.85, Math.PI * (0.85 + 1.3 * frac));
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${Math.round(R * 0.42)}px var(--font-geist-mono), monospace`;
  ctx.textAlign = "center";
  ctx.fillText(kmh.toFixed(0), cx, cy + 6);
  ctx.font = "10px var(--font-geist-mono), monospace";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText("KM/H", cx, cy + 22);
  ctx.textAlign = "left";
};

const drawLemur: DrawFn = (ctx, W, H, t) => {
  // bouncing leap arcs with ringed-tail trails
  const hops = 4;
  const hw = W / hops;
  ctx.lineWidth = 2;
  for (let k = 0; k < 3; k++) {
    const phase = (t * 0.55 + k * 0.33) % 1;
    const x = phase * W;
    const hop = Math.floor(x / hw);
    const local = (x - hop * hw) / hw;
    const yy = H * 0.78 - Math.sin(local * Math.PI) * H * (0.42 - k * 0.08);
    // trail
    ctx.strokeStyle = `rgba(196,120,255,${0.35 - k * 0.1})`;
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const tx = Math.max(0, x - i * 7);
      const th = Math.floor(tx / hw);
      const tl = (tx - th * hw) / hw;
      const ty = H * 0.78 - Math.sin(tl * Math.PI) * H * (0.42 - k * 0.08);
      if (i === 0) ctx.moveTo(tx, ty);
      else ctx.lineTo(tx, ty);
    }
    ctx.stroke();
    // body dot with ring segments (ring-tail!)
    for (let r = 0; r < 4; r++) {
      ctx.fillStyle = r % 2 === 0 ? "#c478ff" : "#1b1226";
      ctx.beginPath();
      ctx.arc(x - r * 7, yy + r * 1.5, 4.5 - r * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowColor = "#c478ff";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#e2c4ff";
    ctx.beginPath();
    ctx.arc(x, yy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  // ground
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.setLineDash([2, 6]);
  ctx.beginPath();
  ctx.moveTo(0, H * 0.78 + 8);
  ctx.lineTo(W, H * 0.78 + 8);
  ctx.stroke();
  ctx.setLineDash([]);
};

/* --------------------------------- data ---------------------------------- */

const ANIMALS: Animal[] = [
  {
    id: "eagle",
    name: "Adler",
    role: "VISION",
    accentVar: "var(--gold)",
    draw: drawEagle,
  },
  {
    id: "cheetah",
    name: "Gepard",
    role: "SPEED",
    accentVar: "var(--speed)",
    draw: drawCheetah,
  },
  {
    id: "lemur",
    name: "Lemur",
    role: "INSTINCT",
    accentVar: "var(--lemur)",
    draw: drawLemur,
  },
];

/* --------------------------------- cards --------------------------------- */

function ApexCanvas({ draw }: { draw: DrawFn }) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const inView = useInView(ref, { margin: "100px" });

  React.useEffect(() => {
    if (!inView) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
        canvas.width = W * dpr;
        canvas.height = H * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      draw(ctx, W, H, (now - start) / 1000);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [inView, draw]);

  return <canvas ref={ref} className="size-full" aria-hidden />;
}

function ApexCard({ animal, index }: { animal: Animal; index: number }) {
  const imgOk = useImageAvailable(`/apex/${animal.id}.webp`);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [9, -9]), {
    stiffness: 180,
    damping: 20,
  });
  const ry = useSpring(useTransform(mx, [0, 1], [-11, 11]), {
    stiffness: 180,
    damping: 20,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay: index * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      style={{ perspective: 1200 }}
    >
      <motion.article
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          mx.set((e.clientX - r.left) / r.width);
          my.set((e.clientY - r.top) / r.height);
        }}
        onPointerLeave={() => {
          mx.set(0.5);
          my.set(0.5);
        }}
        className="group relative overflow-hidden rounded-xl border border-line bg-bg/80"
      >
        {/* accent glow following the card color */}
        <div
          className="pointer-events-none absolute inset-0 opacity-30 transition-opacity duration-500 group-hover:opacity-60"
          style={{
            background: `radial-gradient(80% 60% at 50% 0%, color-mix(in oklab, ${animal.accentVar} 25%, transparent), transparent 70%)`,
          }}
        />

        {/* artwork: generated apex portrait (Higgsfield), staring straight
            at the visitor — procedural canvas as fallback if missing */}
        <div className="relative aspect-[3/4] overflow-hidden bg-black/50">
          {imgOk ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/apex/${animal.id}.webp`}
                alt={animal.name}
                className="size-full object-cover transition-all duration-700 ease-out group-hover:scale-[1.06] group-hover:brightness-110"
              />
              {/* embed into the card: soft bottom fade + edge vignette */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 34%), radial-gradient(120% 90% at 50% 40%, transparent 60%, rgba(0,0,0,0.5))",
                }}
              />
            </>
          ) : (
            <ApexCanvas draw={animal.draw} />
          )}

          {/* the single word */}
          <span
            className="absolute inset-x-0 bottom-5 text-center font-display text-3xl font-bold uppercase tracking-[0.3em] sm:bottom-6 sm:text-4xl"
            style={{
              color: animal.accentVar,
              textShadow: `0 0 24px color-mix(in oklab, ${animal.accentVar} 65%, transparent)`,
              transform: "translateZ(35px)",
            }}
          >
            {animal.role}
          </span>
        </div>
      </motion.article>
    </motion.div>
  );
}

export function ApexGrid() {
  return (
    <section id="apex" className="relative px-4 py-24 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionKicker index="02" title="THE TRINITY" accent="text-gold" />
        <h2 className="mt-3 font-display text-4xl font-bold uppercase leading-none sm:text-6xl">
          APEX <span className="text-outline">SPIRITS</span>
        </h2>
        <p className="mt-4 max-w-lg text-sm text-muted">
          Drei Betriebsmodi. Sehen wie ein Adler, ausführen wie ein Gepard,
          durchs Chaos tanzen wie ein Lemur.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {ANIMALS.map((animal, i) => (
            <ApexCard key={animal.id} animal={animal} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
