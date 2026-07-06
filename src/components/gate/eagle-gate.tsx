"use client";

import * as React from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";

import { EagleEye, type EyeParams } from "./eagle-eye";
import { useImageAvailable } from "@/lib/use-image";

/**
 * The entry gate: a 420vh scroll journey INTO the eagle.
 *
 *   0.00–0.34  the head — hyperreal eagle stares you down
 *   0.34–0.50  dive toward its left eye, crossfade to the giant iris
 *   0.50–0.68  focus — pupil contracts to a pin, iris ignites
 *   0.68–0.95  dilation — camera dives, pupil blows wide open
 *   0.95–1.00  the pupil swallows the viewport → site revealed
 *
 * Without /eagle-head.webp the sequence starts directly at the iris.
 */

/*
 * Pixel-measured geometry of the head image (public/eagle-head.webp):
 *   iris center  (32.1%, 29.7%)  ·  iris diameter 9.0% of image width
 *   pupil/iris ratio ≈ 0.45
 *
 * The canvas iris spans 92% of an 88vmin element → 0.8096·vmin.
 * The photo iris spans headScale·vmin·0.09.
 * Size lock during the handoff window [0.46, 0.54]:
 *   eyeScale(v) = headScale(v) · 0.09 / 0.8096
 * With headScale(0.54) = 9.0 the canvas lands exactly at scale 1.
 * Both tracks are linear over the same window, so the ratio holds on
 * every frame — the two irises stay pixel-locked while crossfading.
 */
// Values calibrated against actual rendered frames (screenshot metrology),
// not just the source image — this accounts for the full transform pipeline.
const EYE_X = 32.9; // % — iris center in the image
const EYE_Y = 29.6; // %
const IRIS_FRAC = 0.0934; // iris diameter / image width
const HANDOFF_START = 0.46;
const HANDOFF_END = 0.54;
const HEAD_SCALE_END = 0.8096 / IRIS_FRAC; // canvas iris == photo iris at end
const EYE_SCALE_AT_START =
  (1.07 + (HEAD_SCALE_END - 1.07) * 0.6) * (IRIS_FRAC / 0.8096); // ≈0.649
const PHOTO_PUPIL = 0.39;
// photo pupil sits slightly off the iris center (in units of iris radius)
const PUPIL_OFF_X = 0.12;
const PUPIL_OFF_Y = -0.1;

export function EagleGate() {
  const target = React.useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target,
    offset: ["start start", "end end"],
  });

  const headOk = useImageAvailable("/eagle-head.webp");

  // Eye canvas params (mutated per scroll frame, zero re-renders).
  const eyeParams = React.useRef<EyeParams>({
    pupil: PHOTO_PUPIL,
    rage: 0,
    rotation: 0,
    pupilOffsetX: PUPIL_OFF_X,
    pupilOffsetY: PUPIL_OFF_Y,
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    // pupil offset matches the photo through the handoff, then re-centers
    const settle = 1 - Math.min(1, Math.max(0, (v - HANDOFF_END) / 0.12));
    eyeParams.current = {
      pupil: pupilAt(v),
      rage: Math.min(1, Math.max(0, (v - HANDOFF_END) / 0.32)),
      rotation: Math.max(0, v - HANDOFF_START) * 1.2,
      pupilOffsetX: PUPIL_OFF_X * settle,
      pupilOffsetY: PUPIL_OFF_Y * settle,
    };
  });

  /* ---- head layer: glide onto the eye first, then pure zoom ---- */
  const headScale = useTransform(
    scrollYProgress,
    [0, 0.34, HANDOFF_END],
    [1, 1.07, HEAD_SCALE_END]
  );
  // Translation completes BEFORE the crossfade window; from then on the
  // eye point sits exactly at screen center (transform-origin holds it).
  const headX = useTransform(
    scrollYProgress,
    [0, 0.34, HANDOFF_START],
    ["0%", "0%", `${50 - EYE_X}%`]
  );
  const headY = useTransform(
    scrollYProgress,
    [0, 0.34, HANDOFF_START],
    ["0%", "0%", `${50 - EYE_Y}%`]
  );
  const headOpacity = useTransform(scrollYProgress, [0.505, 0.55], [1, 0]);

  /* ---- procedural eye: size-locked to the photo iris while fading in ---- */
  const eyeOpacity = useTransform(scrollYProgress, [HANDOFF_START, 0.505], [0, 1]);
  const eyeScale = useTransform(
    scrollYProgress,
    [HANDOFF_START, HANDOFF_END, 0.7, 0.95, 1],
    [EYE_SCALE_AT_START, 1, 1.16, 3.4, 9]
  );
  // Without the head image the iris carries the whole gate from scroll 0.
  const eyeSoloOpacity = useTransform(scrollYProgress, [0, 0.08], [0.4, 1]);
  const eyeSoloScale = useTransform(
    scrollYProgress,
    [0, HANDOFF_END, 0.7, 0.95, 1],
    [1, 1.05, 1.16, 3.4, 9]
  );

  const veil = useTransform(scrollYProgress, [0.9, 0.99], [0, 1]);

  /* ---- type layers ---- */
  const titleOpacity = useTransform(scrollYProgress, [0.26, 0.4], [1, 0]);
  const titleTrack = useTransform(scrollYProgress, [0, 0.4], ["0.45em", "0.12em"]);
  const hintOpacity = useTransform(scrollYProgress, [0.5, 0.62], [1, 0]);
  const stageOpacity = useTransform(scrollYProgress, [0.6, 0.7, 0.86, 0.94], [0, 1, 1, 0]);

  // HUD readouts (live numbers, no re-renders)
  const dilation = useTransform(scrollYProgress, (v) =>
    (pupilAt(v) * 100).toFixed(1).padStart(5, "0")
  );
  const focus = useTransform(scrollYProgress, (v) =>
    Math.round(Math.min(1, Math.max(0, (v - HANDOFF_END) / 0.32)) * 100)
      .toString()
      .padStart(3, "0")
  );
  const depth = useTransform(scrollYProgress, (v) => (v * 420).toFixed(0));

  // Micro-blink while the giant iris is on stage.
  const [blinkKey, setBlinkKey] = React.useState(0);
  React.useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => {
      const v = scrollYProgress.get();
      const irisVisible = headOk ? v > 0.56 && v < 0.85 : v < 0.5;
      if (irisVisible) setBlinkKey((k) => k + 1);
    }, 6500);
    return () => clearInterval(id);
  }, [scrollYProgress, reduced, headOk]);

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

        {/* the head (act I) */}
        {headOk && (
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
                opacity: headOpacity,
                transformOrigin: `${EYE_X}% ${EYE_Y}%`,
              }}
              className="size-[100vmin] max-w-none object-cover [mask-image:radial-gradient(72%_72%_at_50%_50%,black_58%,transparent)]"
            />
          </motion.div>
        )}

        {/* the giant iris (act II) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
          className="absolute inset-0"
        >
          <motion.div
            style={
              headOk
                ? { scale: eyeScale, opacity: eyeOpacity }
                : { scale: eyeSoloScale, opacity: eyeSoloOpacity }
            }
            className="absolute left-1/2 top-1/2 aspect-square w-[88vmin] -translate-x-1/2 -translate-y-1/2"
          >
            <EagleEye paramsRef={eyeParams} className="block" />

            {/* lids (micro-blink) */}
            {!reduced && blinkKey > 0 && (
              <React.Fragment key={blinkKey}>
                <motion.div
                  initial={{ y: "-100%" }}
                  animate={{ y: ["-100%", "-12%", "-100%"] }}
                  transition={{ duration: 0.4, times: [0, 0.5, 1], ease: "easeInOut" }}
                  className="absolute inset-x-[-10%] top-[-10%] h-[62%] rounded-[50%] bg-black"
                />
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: ["100%", "12%", "100%"] }}
                  transition={{ duration: 0.4, times: [0, 0.5, 1], ease: "easeInOut" }}
                  className="absolute inset-x-[-10%] bottom-[-10%] h-[62%] rounded-[50%] bg-black"
                />
              </React.Fragment>
            )}
          </motion.div>
        </motion.div>

        {/* darkness rising inside the dilated pupil */}
        <motion.div
          style={{ opacity: veil }}
          className="pointer-events-none absolute inset-0 bg-black"
        />

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
              <div className="text-gold/70">PUPIL</div>
              <div className="text-fg tabular-nums">
                <motion.span>{dilation}</motion.span> %
              </div>
            </div>
            <div>
              <div className="text-gold/70">FOCUS</div>
              <div className="text-fg tabular-nums">
                <motion.span>{focus}</motion.span> / 100
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

/**
 * Pupil radius over scroll. Holds the photo's measured pupil ratio through
 * the entire handoff (so the crossfade is seamless), focuses to a pin only
 * AFTER the takeover, then dilates into the portal.
 */
function pupilAt(v: number): number {
  if (v < HANDOFF_END) return PHOTO_PUPIL;
  if (v < 0.66) {
    const t = (v - HANDOFF_END) / (0.66 - HANDOFF_END);
    return PHOTO_PUPIL - (PHOTO_PUPIL - 0.12) * easeInOut(t);
  }
  if (v < 0.7) return 0.12;
  const t = Math.min(1, (v - 0.7) / 0.25);
  return 0.12 + 0.88 * easeInOut(t);
}
