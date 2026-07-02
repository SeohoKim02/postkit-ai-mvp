import type { LucideIcon } from "lucide-react";

export function StatCard({
  title,
  value,
  helper,
  icon: Icon
}: {
  title: string;
  value: string;
  helper: string;
  icon: LucideIcon;
}) {
  return (
    <div className="soft-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-muted">{title}</p>
          <strong className="mt-2 block text-2xl font-black">{value}</strong>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky/10 text-sky">
          <Icon size={19} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-4 text-sm text-muted">{helper}</p>
    </div>
  );
}
