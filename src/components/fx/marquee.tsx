import { cn } from "@/lib/utils";

/** Infinite text marquee divider (pure CSS keyframes). */
export function Marquee({
  items,
  className,
  duration = "36s",
  separator = "◆",
}: {
  items: string[];
  className?: string;
  duration?: string;
  separator?: string;
}) {
  const row = (ariaHidden: boolean) => (
    <div
      aria-hidden={ariaHidden}
      className="flex shrink-0 animate-marquee items-center gap-[2rem] pr-[2rem] [--gap:2rem]"
      style={{ "--duration": duration } as React.CSSProperties}
    >
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-[2rem] whitespace-nowrap">
          <span>{item}</span>
          <span className="text-gold/60">{separator}</span>
        </span>
      ))}
    </div>
  );

  return (
    <div
      className={cn(
        "flex overflow-hidden border-y border-line py-4 font-mono text-sm uppercase tracking-[0.3em] text-muted",
        className
      )}
    >
      {row(false)}
      {row(true)}
    </div>
  );
}
