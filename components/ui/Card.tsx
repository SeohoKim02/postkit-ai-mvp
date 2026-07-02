import type { ReactNode } from "react";
import { clsx } from "clsx";

export function Card({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={clsx("soft-card min-w-0 p-4 sm:p-5", className)}>{children}</section>;
}
