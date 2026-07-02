"use client";

import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { clsx } from "clsx";

export function ChoiceCard({
  title,
  description,
  selected,
  onClick,
  icon
}: {
  title: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
  icon?: ReactNode;
}) {
  return (
    <button
      className={clsx(
        "touch-row flex w-full items-start gap-3 border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-coral/20",
        selected ? "border-coral bg-blush shadow-lift" : "border-line bg-white hover:border-coral/45 hover:bg-blush/35"
      )}
      onClick={onClick}
      type="button"
    >
      {icon ? <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-coral">{icon}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-ink">{title}</span>
        {description ? <span className="mt-1 block text-xs leading-5 text-muted">{description}</span> : null}
      </span>
      {selected ? <CheckCircle2 className="shrink-0 text-coral" size={18} aria-hidden="true" /> : null}
    </button>
  );
}
