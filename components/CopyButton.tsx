"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function CopyButton({ value, label = "복사", onCopied }: { value: string; label?: string; onCopied?: () => void }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      onCopied?.();
      setFailed(false);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
      setFailed(true);
      window.setTimeout(() => setFailed(false), 1600);
    }
  }

  return (
    <Button aria-label={label} className="min-h-9 min-w-0 px-3 py-1.5" onClick={handleCopy} type="button" variant="secondary">
      {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
      <span className="min-w-0 break-keep">{copied ? "복사됨" : failed ? "복사 실패" : label}</span>
    </Button>
  );
}
