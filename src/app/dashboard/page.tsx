import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { auth } from "@/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BlurFade } from "@/components/magicui/blur-fade";
import { tools } from "@/lib/tools";

export default async function DashboardPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0];

  return (
    <div className="space-y-8">
      <BlurFade inView>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Hallo{firstName ? `, ${firstName}` : ""} 👋
          </h1>
          <p className="mt-1 text-muted-foreground">
            Willkommen in deiner persönlichen Werkzeugkiste.
          </p>
        </div>
      </BlurFade>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool, i) => {
          const Icon = tool.icon;
          return (
            <BlurFade key={tool.href} delay={0.05 * (i + 1)} inView>
              <Link href={tool.href} className="group block h-full">
                <Card className="h-full transition-all group-hover:border-foreground/20 group-hover:shadow-md">
                  <CardHeader>
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-accent">
                        <Icon className="size-5" />
                      </div>
                      {tool.tag ? (
                        <Badge variant="secondary">{tool.tag}</Badge>
                      ) : null}
                    </div>
                    <CardTitle>{tool.title}</CardTitle>
                    <CardDescription>{tool.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                      Öffnen
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            </BlurFade>
          );
        })}
      </div>
    </div>
  );
}
