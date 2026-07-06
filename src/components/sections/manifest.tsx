"use client";

import { motion } from "motion/react";

import { AuroraText } from "@/components/magicui/aurora-text";
import { ShaderVeil } from "@/components/fx/shader-veil";

/** First breath after diving through the pupil. */
export function Manifest() {
  return (
    <section className="grain relative flex min-h-[90svh] items-center overflow-hidden px-4 sm:px-8">
      <div className="absolute inset-0 opacity-70">
        <ShaderVeil
          colorA={[0.5, 0.28, 0.04]}
          colorB={[0.05, 0.3, 0.32]}
          amplitude={0.9}
        />
      </div>
      <div className="bg-grid absolute inset-0 opacity-40 [mask-image:radial-gradient(70%_60%_at_50%_50%,black,transparent)]" />

      <div className="relative mx-auto max-w-6xl py-32">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="font-mono text-xs tracking-[0.45em] text-gold"
        >
          YOU ARE INSIDE THE EYE NOW
        </motion.p>

        <h2 className="mt-6 font-display text-[clamp(2.4rem,7.5vw,6.5rem)] font-bold uppercase leading-[0.95]">
          <Line delay={0}>See</Line>{" "}
          <Line delay={0.1}>
            <AuroraText colors={["#e8a83a", "#f6c95c", "#f6923c", "#b8791a"]}>
              first.
            </AuroraText>
          </Line>
          <br />
          <Line delay={0.2}>Strike</Line>{" "}
          <Line delay={0.3}>
            <span className="text-outline">once.</span>
          </Line>
        </h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mt-8 max-w-xl text-base leading-relaxed text-muted"
        >
          fvbian.com ist eine Spielwiese für modernes Web — Shader, Canvas,
          Scroll-Choreografie und 3D. Gebaut um drei Geister: den Adler, den
          Gepard, den Lemur.
        </motion.p>
      </div>
    </section>
  );
}

function Line({
  children,
  delay,
}: {
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delay, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      className="inline-block"
    >
      {children}
    </motion.span>
  );
}
