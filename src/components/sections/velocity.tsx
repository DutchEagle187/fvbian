"use client";

import * as React from "react";
import { animate, motion, useInView, useMotionValue, useTransform } from "motion/react";

import { SectionKicker } from "./section-kicker";

/** Animated apex metrics — numbers that hit like a speedometer. */

interface Metric {
  value: number;
  suffix: string;
  label: string;
  sub: string;
  accent: string;
  decimals?: number;
}

const METRICS: Metric[] = [
  {
    value: 320,
    suffix: "km/h",
    label: "STURZFLUG",
    sub: "Aquila chrysaetos im Dive",
    accent: "var(--gold)",
  },
  {
    value: 120,
    suffix: "km/h",
    label: "SPRINT",
    sub: "Acinonyx jubatus, 0–100 in 3.0s",
    accent: "var(--speed)",
  },
  {
    value: 10,
    suffix: "m",
    label: "SPRUNG",
    sub: "Lemur catta, Baum zu Baum",
    accent: "var(--lemur)",
  },
  {
    value: 8,
    suffix: "×",
    label: "SEHSCHÄRFE",
    sub: "schärfer als das menschliche Auge",
    accent: "var(--ice)",
  },
];

function Ticker({ metric, delay }: { metric: Metric; delay: number }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) =>
    metric.decimals ? v.toFixed(metric.decimals) : Math.round(v).toString()
  );

  React.useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, metric.value, {
      duration: 2,
      delay,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controls.stop();
  }, [inView, metric.value, delay, mv]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="border-t border-line pt-6"
    >
      <div className="flex items-baseline gap-2">
        <motion.span
          className="font-display text-6xl font-bold tabular-nums sm:text-7xl"
          style={{
            color: metric.accent,
            textShadow: `0 0 32px color-mix(in oklab, ${metric.accent} 55%, transparent)`,
          }}
        >
          {text}
        </motion.span>
        <span className="font-mono text-lg text-muted">{metric.suffix}</span>
      </div>
      <div className="mt-3 font-mono text-xs tracking-[0.3em] text-fg">
        {metric.label}
      </div>
      <div className="mt-1 font-mono text-[10px] italic tracking-wider text-muted">
        {metric.sub}
      </div>
    </motion.div>
  );
}

export function Velocity() {
  return (
    <section id="velocity" className="bg-grid relative px-4 py-24 [background-size:56px_56px] sm:px-8">
      <div className="absolute inset-0 bg-gradient-to-b from-bg-deep via-transparent to-bg-deep" />
      <div className="relative mx-auto max-w-6xl">
        <SectionKicker index="03" title="APEX METRICS" accent="text-ember" />
        <h2 className="mt-3 font-display text-4xl font-bold uppercase leading-none sm:text-6xl">
          RAW <span className="text-outline">VELOCITY</span>
        </h2>

        <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {METRICS.map((m, i) => (
            <Ticker key={m.label} metric={m} delay={i * 0.12} />
          ))}
        </div>
      </div>
    </section>
  );
}
