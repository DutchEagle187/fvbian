"use client";

import * as React from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";

import { EagleEye, type EyeParams } from "./eagle-eye";
import { PupilBurst } from "./pupil-burst";
import { useImageAvailable } from "@/lib/use-image";

/**
 * The entry gate: one single, continuous camera dive into the eagle's
 * actual pupil. Nothing in the photo moves, nothing is overlaid — the
 * scroll drives a pure zoom (with a slow drift that centers the pupil),
 * until the black of the pupil swallows the viewport and the site opens.
 *
 * Pixel-measured geometry of public/eagle-head.webp:
 *   pupil center (33.5%, 29.1%) · pupil diameter 3.62% of image width
 */
const PUP_X = 33.5; // %
const PUP_Y = 29.1; // %
const PUPIL_FRAC = 0.0362;

export function EagleGate() {
  const target = React.useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target,
    offset: ["start start", "end end"],
  });

  const headOk = useImageAvailable("/eagle-head.webp");

  // Zoom needed until the pupil covers the whole viewport (diagonal), with
  // some margin. Depends on the viewport, so computed client-side.
  const [endScale, setEndScale] = React.useState(60);
  React.useEffect(() => {
    const compute = () => {
      const vmin = Math.min(window.innerWidth, window.innerHeight);
      const diag = Math.hypot(window.innerWidth, window.innerHeight);
      const needed = (diag / (PUPIL_FRAC * vmin)) * 1.2;
      setEndScale(Math.min(110, Math.max(45, needed)));
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  /* ---------- the one continuous dive (photo path) ---------- */
  // Zoom accelerates like a camera dolly — dense keyframes, no stages.
  const headScale = useTransform(
    scrollYProgress,
    [0, 0.12, 0.35, 0.55, 0.75, 0.92, 1],
    [1, 1.05, 2.2, 5, 13, endScale, endScale * 1.18]
  );
  // Gentle drift that brings the pupil to screen center WHILE zooming —
  // one camera move, not a pan-then-zoom.
  const headX = useTransform(
    scrollYProgress,
    [0.12, 0.3, 0.5, 0.68],
    ["0%", `${(50 - PUP_X) * 0.35}%`, `${(50 - PUP_X) * 0.8}%`, `${50 - PUP_X}%`]
  );
  const headY = useTransform(
    scrollYProgress,
    [0.12, 0.3, 0.5, 0.68],
    ["0%", `${(50 - PUP_Y) * 0.35}%`, `${(50 - PUP_Y) * 0.8}%`, `${50 - PUP_Y}%`]
  );
  // Depth-of-field as we plunge into the dark
  const headBlur = useTransform(scrollYProgress, [0.78, 0.95], [0, 12]);
  const headFilter = useMotionTemplate`blur(${headBlur}px)`;

  // Soft blackness growing out of the pupil's center (hides the photo's
  // inner-pupil reflections and the deep-zoom pixelation).
  const veilR = useTransform(scrollYProgress, [0.74, 0.95], [0, 130]);
  const veilBg = useMotionTemplate`radial-gradient(circle at 50% 50%, rgb(0 0 0) ${veilR}%, rgb(0 0 0 / 0) calc(${veilR}% + 28%))`;

  /* ---------- type & HUD ---------- */
  const titleOpacity = useTransform(scrollYProgress, [0.24, 0.38], [1, 0]);
  const titleTrack = useTransform(scrollYProgress, [0, 0.38], ["0.45em", "0.12em"]);
  const hintOpacity = useTransform(scrollYProgress, [0.45, 0.58], [1, 0]);
  const stageOpacity = useTransform(scrollYProgress, [0.58, 0.68, 0.86, 0.94], [0, 1, 1, 0]);

  const zoomReadout = useTransform(headScale, (s) => `${s.toFixed(1)}×`);
  const fillReadout = useTransform(headScale, (s) => {
    if (typeof window === "undefined") return "000";
    const vmin = Math.min(window.innerWidth, window.innerHeight);
    const diag = Math.hypot(window.innerWidth, window.innerHeight);
    const frac = (PUPIL_FRAC * vmin * s) / diag;
    return Math.min(100, Math.round(frac * 100)).toString().padStart(3, "0");
  });
  const depth = useTransform(scrollYProgress, (v) => (v * 420).toFixed(0));

  /* ---------- procedural fallback (no photo available) ---------- */
  const eyeParams = React.useRef<EyeParams>({ pupil: 0.28, rage: 0, rotation: 0 });
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (headOk) return;
    eyeParams.current = {
      pupil: fallbackPupilAt(v),
      rage: Math.min(1, Math.max(0, (v - 0.3) / 0.4)),
      rotation: v * 0.9,
    };
  });
  const eyeSoloOpacity = useTransform(scrollYProgress, [0, 0.08], [0.4, 1]);
  const eyeSoloScale = useTransform(
    scrollYProgress,
    [0, 0.55, 0.7, 0.95, 1],
    [1, 1.08, 1.2, 3.6, 9]
  );
  const soloVeil = useTransform(scrollYProgress, [0.88, 0.99], [0, 1]);

  return (
    <div ref={target} className="relative h-[420vh]" id="gate">
      <div className="sticky top-0 h-svh overflow-hidden bg-black">
        {/* ambient glow */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 50%, rgba(120,70,10,0.26), rgba(0,0,0,0) 70%)",
          }}
        />

        {headOk ? (
          <>
            {/* THE dive — a single transformed photo, nothing else */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.6, ease: "easeOut" }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <motion.img
                src="/eagle-head.webp"
                alt=""
                style={{
                  scale: headScale,
                  x: headX,
                  y: headY,
                  filter: headFilter,
                  transformOrigin: `${PUP_X}% ${PUP_Y}%`,
                }}
                className="size-[100vmin] max-w-none object-cover [mask-image:radial-gradient(72%_72%_at_50%_50%,black_58%,transparent)]"
              />
            </motion.div>

            {/* blackness rising from inside the pupil */}
            <motion.div
              style={{ background: veilBg }}
              className="pointer-events-none absolute inset-0"
            />

            {/* gold-dust breakthrough at 80–100% zoom */}
            <PupilBurst progress={scrollYProgress} />
          </>
        ) : (
          <>
            {/* fallback: procedural iris carries the gate */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.4, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <motion.div
                style={{ scale: eyeSoloScale, opacity: eyeSoloOpacity }}
                className="absolute left-1/2 top-1/2 aspect-square w-[88vmin] -translate-x-1/2 -translate-y-1/2"
              >
                <EagleEye paramsRef={eyeParams} className="block" />
              </motion.div>
            </motion.div>
            <motion.div
              style={{ opacity: soloVeil }}
              className="pointer-events-none absolute inset-0 bg-black"
            />
          </>
        )}

        {/* ---- type & HUD ---- */}
        <MountFade delay={0.5} className="absolute inset-x-0 top-[10%]">
          <motion.h1
            style={{ opacity: titleOpacity, letterSpacing: titleTrack }}
            className="text-center font-display text-[clamp(2.6rem,9vw,7rem)] font-bold uppercase text-fg"
          >
            fvbian
          </motion.h1>
        </MountFade>

        <MountFade delay={1.4} className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <motion.div
            style={{ opacity: hintOpacity }}
            className="flex flex-col items-center gap-2 font-mono text-xs tracking-[0.35em] text-muted"
          >
            <span>SCROLL TO ENTER</span>
            <motion.span
              animate={reduced ? undefined : { y: [0, 8, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              className="text-gold"
            >
              ▼
            </motion.span>
          </motion.div>
        </MountFade>

        <motion.p
          style={{ opacity: stageOpacity }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 font-mono text-xs tracking-[0.4em] text-gold"
        >
          ENTERING THE APEX
        </motion.p>

        {/* left HUD */}
        <MountFade delay={1.1} className="absolute left-5 top-1/2 hidden -translate-y-1/2 sm:block">
          <motion.div
            style={{ opacity: hintOpacity }}
            className="flex flex-col gap-5 font-mono text-[10px] tracking-widest text-muted"
          >
            <div>
              <div className="text-gold/70">ZOOM</div>
              <div className="text-fg tabular-nums">
                <motion.span>{zoomReadout}</motion.span>
              </div>
            </div>
            <div>
              <div className="text-gold/70">PUPIL FILL</div>
              <div className="text-fg tabular-nums">
                <motion.span>{fillReadout}</motion.span> %
              </div>
            </div>
            <div>
              <div className="text-gold/70">DEPTH</div>
              <div className="text-fg tabular-nums">
                <motion.span>{depth}</motion.span> vh
              </div>
            </div>
          </motion.div>
        </MountFade>

        {/* right HUD */}
        <MountFade delay={1.1} className="absolute right-5 top-1/2 hidden -translate-y-1/2 sm:block">
          <motion.div
            style={{ opacity: hintOpacity }}
            className="rotate-180 font-mono text-[10px] tracking-[0.5em] text-muted [writing-mode:vertical-rl]"
          >
            AQUILA CHRYSAETOS · VISUAL ACUITY 8× HUMAN
          </motion.div>
        </MountFade>
      </div>
    </div>
  );
}

function MountFade({
  delay,
  className,
  children,
}: {
  delay: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 1.1, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/** Fallback pupil curve (procedural iris only): rest → pin → dilation. */
function fallbackPupilAt(v: number): number {
  if (v < 0.3) return 0.28;
  if (v < 0.55) {
    const t = (v - 0.3) / 0.25;
    return 0.28 - 0.16 * easeInOut(t);
  }
  if (v < 0.62) return 0.12;
  const t = Math.min(1, (v - 0.62) / 0.3);
  return 0.12 + 0.88 * easeInOut(t);
}
