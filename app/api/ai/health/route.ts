import { NextResponse } from "next/server";
import { getAiProvider, getActiveProviderName, listAiProviders } from "@/lib/ai/providerRegistry";

export async function GET() {
  const provider = getAiProvider(getActiveProviderName());
  const health = await provider.health().catch(() => ({
    ok: false,
    provider: provider.name,
    mode: "mock" as const,
    supports: [],
    message: "AI 공급자 상태를 확인하지 못했어요."
  }));

  return NextResponse.json({
    ...health,
    availableProviders: listAiProviders(),
    externalApiConnected: false
  });
}
