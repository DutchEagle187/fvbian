import Link from "next/link";

import { auth } from "@/auth";
import { AuroraText } from "@/components/magicui/aurora-text";
import { BlurFade } from "@/components/magicui/blur-fade";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { cn } from "@/lib/utils";

export default async function Home() {
  const session = await auth();
  const loggedIn = !!session?.user;

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-6">
      <DotPattern
        className={cn(
          "[mask-image:radial-gradient(360px_circle_at_center,white,transparent)]",
          "opacity-40"
        )}
      />

      <main className="relative z-10 flex flex-col items-center text-center">
        <BlurFade inView>
          <h1 className="font-mono text-5xl font-semibold tracking-tight sm:text-7xl">
            <AuroraText>fvbian</AuroraText>
          </h1>
        </BlurFade>

        <BlurFade delay={0.2} inView>
          <Link
            href={loggedIn ? "/dashboard" : "/login"}
            className="mt-10 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            {loggedIn ? "weiter →" : "anmelden →"}
          </Link>
        </BlurFade>
      </main>
    </div>
  );
}
