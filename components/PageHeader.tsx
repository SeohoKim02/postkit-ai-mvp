import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-black text-coral">{eyebrow}</p>
        <h1 className="section-title mt-1 break-keep">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl break-keep text-sm leading-6 text-muted sm:text-base">{description}</p> : null}
      </div>
      {action ? (
        <div className="grid w-full min-w-0 grid-cols-1 gap-2 min-[430px]:grid-cols-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end sm:[&>*]:w-auto [&>*]:w-full">
          {action}
        </div>
      ) : null}
    </div>
  );
}
