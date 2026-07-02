import { mockProvider } from "@/lib/ai/mockProvider";
import type { AiProvider, AiProviderName } from "@/lib/ai/types";

const providers: Partial<Record<AiProviderName, AiProvider>> = {
  mock: mockProvider
};

export function getActiveProviderName(): AiProviderName {
  // Server-only future hook. Do not expose API keys or provider secrets to client bundles.
  const configured = typeof process !== "undefined" ? process.env.AI_PROVIDER : undefined;
  return configured && Object.prototype.hasOwnProperty.call(providers, configured) ? (configured as AiProviderName) : "mock";
}

export function getAiProvider(name: AiProviderName = getActiveProviderName()) {
  return providers[name] ?? mockProvider;
}

export function listAiProviders() {
  return Object.values(providers)
    .filter((provider): provider is AiProvider => Boolean(provider))
    .map((provider) => ({
      name: provider.name,
      displayName: provider.displayName
    }));
}
