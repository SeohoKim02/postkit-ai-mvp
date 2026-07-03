import { NextResponse } from "next/server";
import { getAiProvider, getActiveProviderName, getAiProviderRuntimeStatus, listAiProviders } from "@/lib/ai/providerRegistry";

export async function GET() {
  const provider = getAiProvider(getActiveProviderName());
  const runtimeStatus = getAiProviderRuntimeStatus();
  const health = await provider.health().catch(() => ({
    ok: false,
    provider: provider.name,
    mode: provider.name === "openai" ? ("openai" as const) : ("mock" as const),
    selectedProvider: runtimeStatus.selectedProvider,
    openaiConfigured: runtimeStatus.openaiConfigured,
    fallbackAvailable: runtimeStatus.fallbackAvailable,
    supports: [],
    message: "AI 생성 계층 상태를 확인하지 못했어요."
  }));

  return NextResponse.json({
    ...health,
    selectedProvider: runtimeStatus.selectedProvider,
    openaiConfigured: runtimeStatus.openaiConfigured,
    fallbackAvailable: runtimeStatus.fallbackAvailable,
    availableProviders: listAiProviders(),
    externalApiConnected: runtimeStatus.selectedProvider === "openai" && runtimeStatus.openaiConfigured
  });
}
