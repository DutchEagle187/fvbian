import Link from "next/link";

import { auth } from "@/auth";
import { DashboardNav } from "@/components/dashboard/nav";
import { UserMenu } from "@/components/dashboard/user-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="flex min-h-svh flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur sm:px-6">
        <Link
          href="/dashboard"
          className="font-mono text-lg font-semibold tracking-tight"
        >
          fvbian
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <UserMenu
            name={user?.name}
            email={user?.email}
            image={user?.image}
          />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 md:flex-row">
        {/* Sidebar (desktop) */}
        <aside className="hidden w-56 shrink-0 md:block">
          <div className="sticky top-20">
            <DashboardNav />
          </div>
        </aside>

        {/* Mobile nav */}
        <div className="w-full md:hidden">
          <DashboardNav />
          <Separator className="my-4" />
        </div>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
