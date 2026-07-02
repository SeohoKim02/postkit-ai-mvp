import { CheckCircle2, Hash, ImagePlus, MessageSquareText, MousePointerClick, Upload } from "lucide-react";

const previewItems = ["캡션 5개", "해시태그 20개", "CTA 5개", "후킹 문구 5개"];
const resultItems = [
  { label: "캡션", value: "오늘 업로드는 촉촉함이 오래 남는 글로우 립밤으로 준비했어요.", icon: MessageSquareText },
  { label: "해시태그", value: "#데일리 #추천템 #선물추천", icon: Hash },
  { label: "CTA", value: "저장해두고 컬러 고를 때 다시 보기", icon: MousePointerClick }
];

export function PackagePreview() {
  return (
    <div className="relative min-w-0 overflow-hidden rounded-lg border border-line bg-white p-4 shadow-soft">
      <div className="aspect-[4/3] rounded-lg bg-[linear-gradient(135deg,#fff5ee,#e8f7f2_45%,#f8f2ff)] p-4">
        <div className="grid h-full min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] gap-3">
          <div className="flex min-w-0 flex-col justify-between rounded-lg bg-white/78 p-3">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-coral text-white">
                <ImagePlus size={18} aria-hidden="true" />
              </span>
              <span className="min-w-0 rounded-lg bg-white px-2 py-1 text-xs font-bold text-muted">1장 업로드</span>
            </div>
            <div>
              <div className="mb-2 h-3 w-20 rounded-lg bg-coral/60" />
              <div className="h-2 w-full rounded-lg bg-stone-300/70" />
              <div className="mt-2 h-2 w-2/3 rounded-lg bg-stone-300/70" />
            </div>
          </div>
          <div className="min-w-0 space-y-2">
            {previewItems.map((item) => (
              <div className="flex min-w-0 items-center gap-2 rounded-lg bg-white/88 px-3 py-2 text-xs font-bold" key={item}>
                <CheckCircle2 className="shrink-0 text-mint" size={15} aria-hidden="true" />
                <span className="min-w-0 break-keep">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-blush p-3 text-coral">
          <MessageSquareText size={18} aria-hidden="true" />
          <p className="mt-3 text-sm font-black">문구 패키지</p>
        </div>
        <div className="rounded-lg bg-aqua p-3 text-emerald-700">
          <Upload size={18} aria-hidden="true" />
          <p className="mt-3 text-sm font-black">공유 준비</p>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {resultItems.map((item) => {
          const Icon = item.icon;

          return (
            <div className="rounded-lg border border-line bg-wash p-3" key={item.label}>
              <div className="mb-1 flex min-w-0 items-center gap-2 text-xs font-black text-coral">
                <Icon size={14} aria-hidden="true" />
                {item.label}
              </div>
              <p className="break-keep text-sm leading-5 text-ink">{item.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
