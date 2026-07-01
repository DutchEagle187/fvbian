import {
  Bookmark,
  LayoutDashboard,
  NotebookPen,
  type LucideIcon,
} from "lucide-react";

export interface Tool {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  /** Shown as a small tag on the dashboard card. */
  tag?: string;
}

/**
 * Central registry of everything in the dashboard.
 *
 * To add a new tool:
 *   1. Add an entry here.
 *   2. Create the page at src/app/dashboard/<path>/page.tsx.
 * It automatically shows up in the sidebar and on the dashboard grid.
 */
export const tools: Tool[] = [
  {
    title: "Notizen",
    description: "Schnelle Notizen, lokal in deinem Browser gespeichert.",
    href: "/dashboard/tools/notes",
    icon: NotebookPen,
    tag: "Tool",
  },
  {
    title: "Lesezeichen",
    description: "Links mit Vorschau sammeln, in Listen organisieren.",
    href: "/dashboard/tools/bookmarks",
    icon: Bookmark,
    tag: "Tool",
  },
];

export const dashboardHome: Tool = {
  title: "Übersicht",
  description: "Startseite deines Dashboards.",
  href: "/dashboard",
  icon: LayoutDashboard,
};
