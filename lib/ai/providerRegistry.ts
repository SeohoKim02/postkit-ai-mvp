import { mockProvider } from "@/lib/ai/mockProvider";
import { isOpenAiConfigured, openAiProvider } from "@/lib/ai/openaiProvider";
import type { AiProvider, AiProviderName } from "@/lib/ai/types";

const providers: Partial<Record<AiProviderName, AiProvider>> = {
  mock: mockProvider,
  openai: openAiProvider
};

function configuredProviderName() {
  return typeof process !== "undefined" ? process.env.AI_PROVIDER?.trim().toLowerCase() : undefined;
}

export function getActiveProviderName(): AiProviderName {
  const configured = configuredProviderName();

  if (configured === "openai" && isOpenAiConfigured()) {
    return "openai";
  }

  return "mock";
}

export function getAiProvider(name: AiProviderName = getActiveProviderName()) {
  return providers[name] ?? mockProvider;
}

export function getAiProviderRuntimeStatus() {
  const requested = configuredProviderName();
  const selectedProvider = getActiveProviderName();

  return {
    requestedProvider: requested === "openai" || requested === "mock" ? requested : "mock",
    selectedProvider,
    openaiConfigured: isOpenAiConfigured(),
    fallbackAvailable: true
  };
}

export function listAiProviders() {
  return Object.values(providers)
    .filter((provider): provider is AiProvider => Boolean(provider))
    .map((provider) => ({
      name: provider.name,
      displayName: provider.displayName
    }));
}
