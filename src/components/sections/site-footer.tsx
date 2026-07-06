"use client";

import { ArrowUp } from "lucide-react";

import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { DotPattern } from "@/components/magicui/dot-pattern";

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-line px-4 py-20 sm:px-8">
      <DotPattern className="opacity-30 [mask-image:radial-gradient(60%_60%_at_50%_100%,black,transparent)]" />
      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-8 text-center">
        <p className="font-mono text-xs tracking-[0.45em] text-muted">
          FVBIAN · APEX PLAYGROUND
        </p>
        <h2 className="font-display text-[clamp(3rem,12vw,9rem)] font-bold uppercase leading-none text-outline">
          fvbian
        </h2>

        <ShimmerButton
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          background="rgba(12,10,6,1)"
          shimmerColor="#e8a83a"
          className="font-mono text-xs tracking-[0.3em]"
        >
          <ArrowUp className="mr-2 size-4" /> BACK TO THE EYE
        </ShimmerButton>

        <p className="max-w-md font-mono text-[10px] leading-relaxed tracking-wider text-muted">
          NQ-Feed simuliert — keine Finanzdaten, keine Anlageberatung. Gebaut
          mit Next.js, Motion, Canvas & WebGL. © {new Date().getFullYear()}
        </p>

        <p className="max-w-xl font-mono text-[9px] leading-relaxed text-muted/70">
          Wildlife-Fotografie via Wikimedia Commons:{" "}
          <a
            href="https://commons.wikimedia.org/wiki/File:Portrait_of_a_golden_eagle.jpg"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-line underline-offset-2 hover:text-muted"
          >
            Adler — J. Lodos Benavente (CC0)
          </a>{" "}
          ·{" "}
          <a
            href="https://commons.wikimedia.org/wiki/File:Cheetah_portrait_front.jpg"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-line underline-offset-2 hover:text-muted"
          >
            Gepard — Bilby (CC BY 3.0)
          </a>{" "}
          ·{" "}
          <a
            href="https://commons.wikimedia.org/wiki/File:Lemur_closeup.jpg"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-line underline-offset-2 hover:text-muted"
          >
            Lemur — Octagon (CC BY 4.0)
          </a>
        </p>
      </div>
    </footer>
  );
}
