import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldAlert } from "lucide-react";

import { auth, signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BorderBeam } from "@/components/magicui/border-beam";
import { BlurFade } from "@/components/magicui/blur-fade";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { cn } from "@/lib/utils";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const { error } = await searchParams;
  const accessDenied = error === "AccessDenied";

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden px-6">
      <DotPattern
        className={cn(
          "[mask-image:radial-gradient(400px_circle_at_center,white,transparent)]",
          "opacity-50"
        )}
      />

      <BlurFade className="relative z-10 w-full max-w-sm" inView>
        <Card className="relative overflow-hidden">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Willkommen zurück</CardTitle>
            <CardDescription>
              Melde dich an, um auf deine Tools und Dashboards zuzugreifen.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {accessDenied && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                <span>
                  Dieser Account ist nicht freigeschaltet. Wende dich an Fabian,
                  um Zugang zu erhalten.
                </span>
              </div>
            )}

            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/dashboard" });
              }}
            >
              <Button type="submit" className="w-full" size="lg">
                <GoogleIcon className="size-4" />
                Mit Google anmelden
              </Button>
            </form>

            <Button asChild variant="ghost" size="sm" className="w-full">
              <Link href="/">
                <ArrowLeft className="size-4" /> Zurück zur Startseite
              </Link>
            </Button>
          </CardContent>
          <BorderBeam
            duration={8}
            size={120}
            colorFrom="#7928CA"
            colorTo="#0070F3"
          />
        </Card>
      </BlurFade>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
      />
    </svg>
  );
}
