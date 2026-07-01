import Link from "next/link";
import { ArrowRight, Github, Lock, Sparkles } from "lucide-react";

import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AuroraText } from "@/components/magicui/aurora-text";
import { BlurFade } from "@/components/magicui/blur-fade";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

export default async function Home() {
  const session = await auth();

  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden">
      <DotPattern
        className={cn(
          "[mask-image:radial-gradient(500px_circle_at_center,white,transparent)]",
          "opacity-60"
        )}
      />

      {/* Header */}
      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <span className="font-mono text-lg font-semibold tracking-tight">
          fvbian
        </span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {session?.user ? (
            <Button asChild size="sm">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline">
              <Link href="/login">Anmelden</Link>
            </Button>
          )}
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <BlurFade delay={0.05} inView>
          <Badge variant="secondary" className="mb-6 gap-1.5">
            <Sparkles className="size-3" />
            Persönliche Spielwiese
          </Badge>
        </BlurFade>

        <BlurFade delay={0.15} inView>
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-6xl">
            Tools, Spielereien & <AuroraText>Dashboards</AuroraText>
          </h1>
        </BlurFade>

        <BlurFade delay={0.25} inView>
          <p className="mt-6 max-w-xl text-balance text-lg text-muted-foreground">
            Eine kleine private Sammlung von Werkzeugen und persönlichen
            Dashboards. Öffentlich erreichbar, aber nur für ausgewählte Personen
            zugänglich.
          </p>
        </BlurFade>

        <BlurFade delay={0.35} inView>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {session?.user ? (
              <Button asChild size="lg">
                <Link href="/dashboard">
                  Zum Dashboard <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg">
                <Link href="/login">
                  <Lock className="size-4" /> Anmelden
                </Link>
              </Button>
            )}
            <Button asChild size="lg" variant="ghost">
              <a
                href="https://github.com/dutcheagle187/fvbian"
                target="_blank"
                rel="noreferrer"
              >
                <Github className="size-4" /> Quellcode
              </a>
            </Button>
          </div>
        </BlurFade>
      </main>

      <footer className="relative z-10 mx-auto w-full max-w-5xl px-6 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} fvbian · gebaut mit Next.js, shadcn/ui,
        Magic UI & Motion
      </footer>
    </div>
  );
}
