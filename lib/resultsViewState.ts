import type { GeneratedPackage, HistoryItem } from "@/types";

export type ResultsViewState = {
  result: GeneratedPackage | null;
  isSaved: boolean;
  selectedCaptionIndex: number;
};

export function resolveInitialResultsViewState(
  currentResult: GeneratedPackage | null,
  history: HistoryItem[] = []
): ResultsViewState {
  if (!currentResult) {
    return {
      result: null,
      isSaved: false,
      selectedCaptionIndex: 0
    };
  }

  return {
    result: currentResult,
    isSaved: history.some((item) => item.id === currentResult.id),
    selectedCaptionIndex: currentResult.selectedCaptionIndex ?? 0
  };
}
