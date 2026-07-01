import Link from "next/link";

import { auth } from "@/auth";
import { BlurFade } from "@/components/magicui/blur-fade";
import { ClockWidget } from "@/components/dashboard/widgets/clock-widget";
import { TodosWidget } from "@/components/dashboard/widgets/todos-widget";
import { AgendaWidget } from "@/components/dashboard/widgets/agenda-widget";
import { BookmarksWidget } from "@/components/dashboard/widgets/bookmarks-widget";
import { tools } from "@/lib/tools";

export default async function DashboardPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BlurFade className="lg:col-span-2" inView>
          <ClockWidget name={firstName} />
        </BlurFade>
        <BlurFade delay={0.1} inView>
          <TodosWidget />
        </BlurFade>
        <BlurFade delay={0.2} inView>
          <AgendaWidget />
        </BlurFade>
        <BlurFade className="lg:col-span-2" delay={0.3} inView>
          <BookmarksWidget />
        </BlurFade>
      </div>

      <div>
        <BlurFade delay={0.4} inView>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            Schnellzugriff
          </h2>
        </BlurFade>
        <div className="flex flex-wrap gap-2">
          {tools.map((tool, i) => {
            const Icon = tool.icon;
            return (
              <BlurFade key={tool.href} delay={0.45 + i * 0.05} inView>
                <Link
                  href={tool.href}
                  className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
                >
                  <Icon className="size-4 text-muted-foreground" />
                  {tool.title}
                </Link>
              </BlurFade>
            );
          })}
        </div>
      </div>
    </div>
  );
}
