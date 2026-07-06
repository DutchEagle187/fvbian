"use client";

import { motion } from "motion/react";

import { cn } from "@/lib/utils";

export function SectionKicker({
  index,
  title,
  accent,
}: {
  index: string;
  title: string;
  accent?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      className="flex items-center gap-3 font-mono text-xs tracking-[0.4em] text-muted"
    >
      <span className={cn("text-base", accent)}>◤</span>
      <span>{index}</span>
      <span className="h-px w-10 bg-line" />
      <span>{title}</span>
    </motion.div>
  );
}
