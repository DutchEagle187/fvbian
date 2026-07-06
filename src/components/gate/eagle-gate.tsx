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
 * The entry gate: a 420vh scroll journey through a raptor's eye.
 *
 *   0.00–0.15  eye wakes out of black, blinks
 *   0.15–0.55  focus — iris ignites, pupil contracts to a pin
 *   0.55–0.85  dilation — camera dives, pupil blows wide open
 *   0.85–1.00  the pupil swallows the viewport → site revealed
 */
export function EagleGate() {
  const target = React.useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target,
    offset: ["start start", "end end"],
  });

  // Eye canvas params (mutated per scroll frame, zero re-renders).
  const eyeParams = React.useRef<EyeParams>({
    pupil: 0.28,
    rage: 0,
    rotation: 0,
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    eyeParams.current = {
      pupil: pupilAt(v),
      rage: Math.min(1, Math.max(0, (v - 0.15) / 0.5)),
      rotation: v * 0.9,
    };
  });

  // Camera: gentle drift, then dive through the pupil.
  const eyeScale = useTransform(
    scrollYProgress,
    [0, 0.15, 0.55, 0.85, 1],
    [1.06, 1, 1.18, 3.2, 9]
  );
  const veil = useTransform(scrollYProgress, [0.82, 0.97], [0, 1]); // darkness inside the pupil

  // Type layers (mount-fade handled by <MountFade>, scroll only fades out)
  const titleOpacity = useTransform(scrollYProgress, [0.3, 0.42], [1, 0]);
  const titleTrack = useTransform(scrollYProgress, [0, 0.42], ["0.45em", "0.12em"]);
  const hintOpacity = useTransform(scrollYProgress, [0.5, 0.62], [1, 0]);
  const stageOpacity = useTransform(scrollYProgress, [0.5, 0.6, 0.78, 0.86], [0, 1, 1, 0]);

  // HUD readouts (live numbers, rendered as motion values — no re-renders)
  const dilation = useTransform(scrollYProgress, (v) =>
    (pupilAt(v) * 100).toFixed(1).padStart(5, "0")
  );
  const focus = useTransform(scrollYProgress, (v) =>
    Math.round(Math.min(1, Math.max(0, (v - 0.15) / 0.5)) * 100)
      .toString()
      .padStart(3, "0")
  );
  const depth = useTransform(scrollYProgress, (v) => (v * 420).toFixed(0));

  // Blink: lids close/open once on mount, then micro-blink every ~7s early on.
  const [blinkKey, setBlinkKey] = React.useState(0);
  React.useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => {
      if (scrollYProgress.get() < 0.35) setBlinkKey((k) => k + 1);
    }, 7000);
    return () => clearInterval(id);
  }, [scrollYProgress, reduced]);

  // Optional photoreal eagle head (drop /eagle-head.webp into public/).
  const headOk = useImageAvailable("/eagle-head.webp");
  const headOpacity = useTransform(scrollYProgress, [0, 0.12, 0.4, 0.6], [0.7, 0.85, 0.6, 0]);
  const headScale = useTransform(scrollYProgress, [0, 0.6], [1.05, 1.35]);

  return (
    <div ref={target} className="relative h-[420vh]" id="gate">
      <div className="sticky top-0 h-svh overflow-hidden bg-black">
        {/* ambient glow behind everything */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 50%, rgba(120,70,10,0.28), rgba(0,0,0,0) 70%)",
          }}
        />

        {/* optional Higgsfield eagle head layer */}
        {headOk && (
          <motion.img
            src="/eagle-head.webp"
            alt=""
            style={{ opacity: headOpacity, scale: headScale }}
            className="pointer-events-none absolute inset-0 size-full object-cover [mask-image:radial-gradient(70%_70%_at_50%_45%,black,transparent)]"
          />
        )}

        {/* the eye */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.8, ease: "easeOut" }}
          style={{ scale: eyeScale }}
          className="absolute left-1/2 top-1/2 aspect-square w-[min(88vmin,720px)] -translate-x-1/2 -translate-y-1/2"
        >
          <EagleEye paramsRef={eyeParams} className="block" />

          {/* lids (blink) */}
          {!reduced && (
            <React.Fragment key={blinkKey}>
              <motion.div
                initial={{ y: "-100%" }}
                animate={{ y: ["-100%", "-12%", "-100%"] }}
                transition={{ duration: 0.42, times: [0, 0.5, 1], ease: "easeInOut" }}
                className="absolute inset-x-[-10%] top-[-10%] h-[62%] rounded-[50%] bg-black"
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: ["100%", "12%", "100%"] }}
                transition={{ duration: 0.42, times: [0, 0.5, 1], ease: "easeInOut" }}
                className="absolute inset-x-[-10%] bottom-[-10%] h-[62%] rounded-[50%] bg-black"
              />
            </React.Fragment>
          )}
        </motion.div>

        {/* darkness rising inside the dilated pupil */}
        <motion.div
          style={{ opacity: veil }}
          className="pointer-events-none absolute inset-0 bg-black"
        />

        {/* ---- type & HUD ---- */}
        <MountFade delay={0.5} className="absolute inset-x-0 top-[12%]">
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
            HALIAEETUS · VISUAL ACUITY 8× HUMAN
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

/** Pupil radius over scroll: rest 0.28 → focus pin 0.12 → full dilation 1. */
function pupilAt(v: number): number {
  if (v < 0.45) {
    const t = Math.min(1, Math.max(0, (v - 0.12) / 0.33));
    return 0.28 - 0.16 * easeInOut(t);
  }
  const t = Math.min(1, (v - 0.45) / 0.45);
  return 0.12 + 0.88 * easeInOut(t);
}
