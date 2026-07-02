import type { ReactNode } from "react";
import { clsx } from "clsx";

type BadgeTone = "coral" | "mint" | "sky" | "neutral" | "lemon";

const toneClass: Record<BadgeTone, string> = {
  coral: "bg-coral/10 text-coral",
  mint: "bg-mint/15 text-emerald-700",
  sky: "bg-sky/10 text-sky",
  neutral: "bg-stone-100 text-muted",
  lemon: "bg-lemon/25 text-ink"
};

export function Badge({
  children,
  className,
  tone = "neutral"
}: {
  children: ReactNode;
  className?: string;
  tone?: BadgeTone;
}) {
  return (
    <span className={clsx("inline-flex min-h-8 min-w-0 max-w-full items-center rounded-lg px-2.5 py-1 text-left text-xs font-black leading-snug whitespace-normal break-keep", toneClass[tone], className)}>
      {children}
    </span>
  );
}
