import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { clsx } from "clsx";
import { CopyButton } from "@/components/CopyButton";

export function ResultSection({
  title,
  description,
  items,
  renderItem,
  selectedIndex,
  onSelect,
  onCopyItem,
  onCopyAll,
  footer
}: {
  title: string;
  description?: string;
  items: string[];
  renderItem?: (item: string, index: number) => ReactNode;
  selectedIndex?: number;
  onSelect?: (index: number) => void;
  onCopyItem?: (item: string, index: number) => void;
  onCopyAll?: () => void;
  footer?: ReactNode;
}) {
  return (
    <section className="soft-card min-w-0 p-4 sm:p-5">
      <div className="mb-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="break-keep text-lg font-black">{title}</h2>
          {description ? <p className="mt-1 break-keep text-sm leading-6 text-muted">{description}</p> : null}
        </div>
        <CopyButton label="전체 복사" onCopied={onCopyAll} value={items.join("\n")} />
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            className={clsx(
              "flex min-w-0 flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-start sm:justify-between",
              selectedIndex === index ? "border-coral bg-blush" : "border-line bg-wash"
            )}
            key={`${title}-${item}-${index}`}
          >
            <div className="min-w-0 flex-1 text-sm leading-6 text-ink [overflow-wrap:anywhere]">
              {onSelect ? (
                <button
                  className="mb-2 inline-flex min-h-8 min-w-0 max-w-full items-center gap-1 rounded-lg bg-white px-2 text-left text-xs font-black leading-snug text-coral"
                  onClick={() => onSelect(index)}
                  type="button"
                >
                  <CheckCircle2 size={14} aria-hidden="true" />
                  {selectedIndex === index ? "선택됨" : "이 캡션 선택"}
                </button>
              ) : null}
              {renderItem ? renderItem(item, index) : item}
            </div>
            <CopyButton onCopied={() => onCopyItem?.(item, index)} value={item} />
          </div>
        ))}
      </div>
      {footer ? <div className="mt-4 border-t border-line pt-4">{footer}</div> : null}
    </section>
  );
}
