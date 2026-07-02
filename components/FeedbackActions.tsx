"use client";

import { Edit3, Heart, RotateCcw, Save, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function FeedbackActions({
  onLike,
  onDislike,
  onSaveStyle,
  onEdit,
  onRegenerate
}: {
  onLike: () => void;
  onDislike: () => void;
  onSaveStyle: () => void;
  onEdit?: () => void;
  onRegenerate: () => void;
}) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-2 min-[430px]:grid-cols-2 sm:flex sm:flex-wrap sm:[&>*]:w-auto [&>*]:w-full">
      <Button className="min-h-9 px-3 py-1.5" onClick={onLike} type="button" variant="secondary">
        <Heart size={15} aria-hidden="true" />
        좋아요
      </Button>
      <Button className="min-h-9 px-3 py-1.5" onClick={onDislike} type="button" variant="secondary">
        <ThumbsDown size={15} aria-hidden="true" />
        별로예요
      </Button>
      <Button className="min-h-9 px-3 py-1.5" onClick={onSaveStyle} type="button" variant="soft">
        <Save size={15} aria-hidden="true" />
        내 스타일로 저장
      </Button>
      {onEdit ? (
        <Button className="min-h-9 px-3 py-1.5" onClick={onEdit} type="button" variant="secondary">
          <Edit3 size={15} aria-hidden="true" />
          직접 수정
        </Button>
      ) : null}
      <Button className="min-h-9 px-3 py-1.5" onClick={onRegenerate} type="button" variant="secondary">
        <RotateCcw size={15} aria-hidden="true" />
        다시 생성
      </Button>
    </div>
  );
}
