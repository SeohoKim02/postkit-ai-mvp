"use client";

import { CheckCircle2, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { ChoiceCard } from "@/components/ChoiceCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  accountTypeOptions,
  contentPreferenceOptions,
  mapContentPreferencesToPurposes,
  onboardingStyleOptions
} from "@/lib/personalization";
import { APP_EVENT_KEYS } from "@/lib/storageKeys";
import {
  getPersonalizationProfile,
  savePersonalizationProfile
} from "@/lib/storage";
import type { AccountType, ContentPreference, PersonalizationProfile, StyleTone } from "@/types";

function toneFromStyle(style: StyleTone) {
  if (style === "고급 브랜드형") return "고급스러움";
  if (style === "전문 리뷰어형") return "전문 리뷰어";
  if (style === "짧고 강한 카피형") return "짧고 강함";
  if (style === "깔끔한 정보형") return "깔끔함";
  return "친근함";
}

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<PersonalizationProfile | null>(null);
  const [step, setStep] = useState(1);
  const [accountType, setAccountType] = useState<AccountType>("개인 계정");
  const [contents, setContents] = useState<ContentPreference[]>(["제품 홍보"]);
  const [style, setStyle] = useState<StyleTone>("친구한테 말하듯");

  useEffect(() => {
    function load(forceOpen = false) {
      const current = getPersonalizationProfile();
      setProfile(current);
      setAccountType(current.accountType);
      setContents([]);
      setStyle(current.preferredStyles[0] ?? "친구한테 말하듯");
      setOpen(forceOpen || !current.onboardingCompleted);
      setStep(1);
    }

    load(false);

    function handleOpen() {
      load(true);
    }

    window.addEventListener(APP_EVENT_KEYS.openOnboarding, handleOpen);
    return () => window.removeEventListener(APP_EVENT_KEYS.openOnboarding, handleOpen);
  }, []);

  if (!open || !profile) {
    return null;
  }

  function toggleContent(content: ContentPreference) {
    setContents((current) =>
      current.includes(content) ? current.filter((item) => item !== content) : [...current, content]
    );
  }

  function finish() {
    if (!profile) {
      return;
    }

    const currentProfile = profile;
    const now = new Date().toISOString();
    const selectedContents: ContentPreference[] = contents.length > 0 ? contents : ["제품 홍보"];
    const preferredPurposes = mapContentPreferencesToPurposes(selectedContents);
    const purposeScores = { ...(currentProfile.scores?.purposes ?? {}) };
    const styleScores = { ...(currentProfile.scores?.styles ?? {}) };
    preferredPurposes.forEach((purpose) => {
      purposeScores[purpose] = Number(purposeScores[purpose] ?? 0) + 2;
    });
    const nextProfile: PersonalizationProfile = {
      ...currentProfile,
      onboardingCompleted: true,
      onboardingCompletedAt: now,
      accountType,
      preferredPurposes,
      preferredStyles: [style, ...(currentProfile.preferredStyles ?? []).filter((item) => item !== style)].slice(0, 4),
      preferredTone: toneFromStyle(style),
      preferredCaptionLength: style === "짧고 강한 카피형" ? "short" : currentProfile.preferredCaptionLength,
      sponsoredDisclosureStyle:
        accountType === "광고/제휴 계정" ? "#광고 또는 #협찬을 첫 문장에 표시" : currentProfile.sponsoredDisclosureStyle,
      scores: {
        ...(currentProfile.scores ?? {}),
        styles: {
          ...styleScores,
          [style]: Number(styleScores[style] ?? 0) + 3
        },
        purposes: purposeScores
      },
      lastUpdatedAt: now
    };

    savePersonalizationProfile(nextProfile);
    setProfile(nextProfile);
    setOpen(false);
    window.dispatchEvent(new Event(APP_EVENT_KEYS.personalizationUpdated));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink/25 p-3 backdrop-blur-sm sm:items-center sm:justify-center">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-lg border border-line bg-white p-4 shadow-soft sm:max-w-3xl sm:p-6">
        <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-coral">
              <Sparkles size={18} aria-hidden="true" />
              <p className="text-sm font-black">초기 온보딩</p>
            </div>
            <h2 className="mt-2 text-2xl font-black">내 스타일 학습을 시작할게요</h2>
            <p className="mt-2 text-sm leading-6 text-muted">3단계만 선택하면 다음 생성부터 문구 톤에 반영됩니다.</p>
          </div>
          <Badge tone="coral">{step}/3</Badge>
        </div>

        {step === 1 ? (
          <div className="mt-5">
            <h3 className="text-lg font-black">계정 목적</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {accountTypeOptions.map((option) => (
                <ChoiceCard
                  key={option}
                  onClick={() => setAccountType(option)}
                  selected={accountType === option}
                  title={option}
                />
              ))}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="mt-5">
            <h3 className="text-lg font-black">선호 콘텐츠</h3>
            <p className="mt-1 text-sm text-muted">여러 개를 선택할 수 있습니다.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {contentPreferenceOptions.map((option) => (
                <ChoiceCard
                  key={option}
                  onClick={() => toggleContent(option)}
                  selected={contents.includes(option)}
                  title={option}
                />
              ))}
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="mt-5">
            <h3 className="text-lg font-black">기본 스타일</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {onboardingStyleOptions.map((option) => (
                <ChoiceCard
                  key={option}
                  onClick={() => setStyle(option)}
                  selected={style === option}
                  title={option}
                />
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button disabled={step === 1} onClick={() => setStep((current) => Math.max(1, current - 1))} type="button" variant="secondary">
            <ChevronLeft size={16} aria-hidden="true" />
            이전
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep((current) => Math.min(3, current + 1))} type="button">
              다음
              <ChevronRight size={16} aria-hidden="true" />
            </Button>
          ) : (
            <Button onClick={finish} type="button">
              <CheckCircle2 size={16} aria-hidden="true" />
              온보딩 완료
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
