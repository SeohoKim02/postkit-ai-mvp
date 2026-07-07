"use client";

import { Download, RotateCcw, Save, Settings2, ShieldCheck, Upload, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button, LinkButton } from "@/components/ui/Button";
import { platforms } from "@/lib/constants";
import {
  captionLengthLabel,
  getLearningActionCount,
  getPersonalizationLevel,
  getTopCaptionLength,
  getTopPlatform,
  getTopStyle
} from "@/lib/personalization";
import { addPrivacyAuditEvent } from "@/lib/privacyStorage";
import { APP_EVENT_KEYS } from "@/lib/storageKeys";
import {
  defaultBrandProfile,
  getBrandProfile,
  getPersonalizationProfile,
  importPersonalizationProfile,
  resetPersonalizationProfile,
  saveBrandProfile
} from "@/lib/storage";
import type { BrandProfile, PersonalizationProfile, Platform } from "@/types";

export default function SettingsPage() {
  const [profile, setProfile] = useState<BrandProfile>(defaultBrandProfile);
  const [personalization, setPersonalization] = useState<PersonalizationProfile | null>(null);
  const [saved, setSaved] = useState(false);
  const [pendingReset, setPendingReset] = useState(false);
  const [exportText, setExportText] = useState("");
  const [importText, setImportText] = useState("");
  const [personalizationMessage, setPersonalizationMessage] = useState("");

  useEffect(() => {
    setProfile(getBrandProfile());
    setPersonalization(getPersonalizationProfile());

    function refreshPersonalization() {
      setPersonalization(getPersonalizationProfile());
    }

    window.addEventListener(APP_EVENT_KEYS.personalizationUpdated, refreshPersonalization);
    return () => window.removeEventListener(APP_EVENT_KEYS.personalizationUpdated, refreshPersonalization);
  }, []);

  function updateProfile<K extends keyof BrandProfile>(key: K, value: BrandProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    saveBrandProfile(profile);
    setPersonalization(getPersonalizationProfile());
    setSaved(true);
  }

  function flashPersonalization(message: string) {
    setPersonalizationMessage(message);
    window.setTimeout(() => setPersonalizationMessage(""), 1800);
  }

  function handleExport() {
    const current = getPersonalizationProfile();
    setExportText(JSON.stringify(current, null, 2));
    addPrivacyAuditEvent("data_exported");
    flashPersonalization("개인화 데이터를 내보냈어요.");
  }

  function handleImport() {
    try {
      const nextProfile = importPersonalizationProfile(JSON.parse(importText));
      setPersonalization(nextProfile);
      setImportText("");
      flashPersonalization("개인화 데이터를 다시 불러왔어요.");
    } catch {
      flashPersonalization("JSON 형식을 확인해 주세요.");
    }
  }

  function handleReset() {
    const nextProfile = resetPersonalizationProfile();
    addPrivacyAuditEvent("personalization_deleted");
    setPersonalization(nextProfile);
    setPendingReset(false);
    flashPersonalization("학습 데이터를 초기화했어요.");
  }

  function handleOpenOnboarding() {
    window.dispatchEvent(new Event(APP_EVENT_KEYS.openOnboarding));
  }

  return (
    <AppShell>
      <PageHeader
        action={
          <Button className="w-full sm:w-auto" onClick={handleSave} type="button">
          <Save size={17} aria-hidden="true" />
          {saved ? "저장됨" : "저장"}
        </Button>
        }
        description="이 값은 생성 결과의 말투, 해시태그, 광고 표시 방식에 반영됩니다."
        eyebrow="Brand/Profile"
        title="개인 맞춤형 학습 설정"
      />

      {saved ? (
        <div className="mt-5 rounded-lg border border-mint/30 bg-aqua p-3 text-sm font-bold text-emerald-700">
          설정이 localStorage에 저장됐습니다.
        </div>
      ) : null}

      <Card className="mt-6">
        <div className="flex min-w-0 items-center gap-3 border-b border-line pb-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-mint/15 text-mint">
            <Settings2 size={19} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="break-keep text-lg font-black">생성 결과에 반영될 기본값</h2>
            <p className="mt-1 text-sm text-muted">서버 학습이 아니라 이 브라우저에 저장된 값을 참고해 생성 톤을 조정합니다.</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Badge tone="sky">{profile.preferredPlatform}</Badge>
          <Badge tone="mint">{profile.voice || "말투 미입력"}</Badge>
          <Badge tone="coral">{profile.category || "카테고리 미입력"}</Badge>
        </div>
      </Card>

      <Card className="mt-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky/10 text-sky">
              <ShieldCheck size={19} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="break-keep text-lg font-black">개인정보와 권리 보호</h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                개인 맞춤 학습 허용, 콘텐츠 자동 저장, 데이터 삭제, 권리 침해 신고는 보호센터에서 관리합니다.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <LinkButton className="w-full sm:w-auto" href="/privacy" variant="secondary">
              보호센터 열기
            </LinkButton>
            <LinkButton className="w-full sm:w-auto" href="/privacy-policy" variant="soft">
              처리방침 초안
            </LinkButton>
          </div>
        </div>
      </Card>

      <Card className="mt-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-coral/10 text-coral">
              <UserRound size={19} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="break-keep text-lg font-black">계정과 저장소</h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                게스트 모드, 테스트 계정, 워크스페이스, 데이터 내보내기와 가져오기는 계정 페이지에서 관리합니다.
              </p>
            </div>
          </div>
          <LinkButton className="w-full sm:w-auto" href="/account" variant="secondary">
            계정 관리
          </LinkButton>
        </div>
      </Card>

      <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card>
          <h2 className="text-lg font-black">계정 기본 정보</h2>
          <div className="mt-5 grid gap-4">
          <label>
            <span className="field-label">계정 이름</span>
            <input
              className="field"
              onChange={(event) => updateProfile("accountName", event.target.value)}
              value={profile.accountName}
            />
          </label>

          <label>
            <span className="field-label">업종/카테고리</span>
            <input
              className="field"
              onChange={(event) => updateProfile("category", event.target.value)}
              value={profile.category}
            />
          </label>

          <label>
            <span className="field-label">선호 플랫폼</span>
            <select
              className="field"
              onChange={(event) => updateProfile("preferredPlatform", event.target.value as Platform)}
              value={profile.preferredPlatform}
            >
              {platforms.map((platform) => (
                <option key={platform}>{platform}</option>
              ))}
            </select>
          </label>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-black">문체와 업로드 규칙</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label>
            <span className="field-label">선호 말투</span>
            <input
              className="field"
              onChange={(event) => updateProfile("voice", event.target.value)}
              placeholder="예: 친근함, 전문적, 고급스러움"
              value={profile.voice}
            />
          </label>

          <label>
            <span className="field-label">피드 분위기</span>
            <input
              className="field"
              onChange={(event) => updateProfile("feedMood", event.target.value)}
              placeholder="예: 밝고 정돈된 피드"
              value={profile.feedMood}
            />
          </label>

          <label>
            <span className="field-label">브랜드 대표색</span>
            <input
              className="h-12 w-full rounded-lg border border-line bg-white p-1"
              onChange={(event) => updateProfile("primaryColor", event.target.value)}
              type="color"
              value={profile.primaryColor ?? "#ff6b4a"}
            />
          </label>

          <label>
            <span className="field-label">브랜드 보조색</span>
            <input
              className="h-12 w-full rounded-lg border border-line bg-white p-1"
              onChange={(event) => updateProfile("secondaryColor", event.target.value)}
              type="color"
              value={profile.secondaryColor ?? "#edf9f6"}
            />
          </label>

          <label>
            <span className="field-label">자주 쓰는 해시태그</span>
            <textarea
              className="field min-h-28 resize-none"
              onChange={(event) => updateProfile("favoriteHashtags", event.target.value)}
              value={profile.favoriteHashtags}
            />
          </label>

          <label>
            <span className="field-label">필수 문구</span>
            <textarea
              className="field min-h-28 resize-none"
              onChange={(event) => updateProfile("requiredPhrases", event.target.value)}
              value={profile.requiredPhrases}
            />
          </label>

          <label>
            <span className="field-label">금지 문구</span>
            <textarea
              className="field min-h-28 resize-none"
              onChange={(event) => updateProfile("bannedPhrases", event.target.value)}
              value={profile.bannedPhrases}
            />
          </label>

          <label>
            <span className="field-label">광고 표시 기본 방식</span>
            <textarea
              className="field min-h-28 resize-none"
              onChange={(event) => updateProfile("defaultDisclosure", event.target.value)}
              value={profile.defaultDisclosure}
            />
          </label>
        </div>
        </Card>
      </div>

      {personalization ? (
        <Card className="mt-5">
          <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-black">내 스타일 학습</h2>
              <p className="mt-1 text-sm leading-6 text-muted">선택, 복사, 수정한 기록을 바탕으로 다음 생성 결과를 조정합니다.</p>
            </div>
            <Badge tone="coral">{getPersonalizationLevel(personalization)}</Badge>
          </div>

          {personalizationMessage ? (
            <div className="mt-4 rounded-lg border border-coral/20 bg-blush p-3 text-sm font-bold text-coral">
              {personalizationMessage}
            </div>
          ) : null}

          <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-lg bg-wash p-4">
              <p className="text-sm font-bold text-muted">현재 가장 선호하는 스타일</p>
              <p className="mt-2 text-lg font-black">{getTopStyle(personalization)}</p>
            </div>
            <div className="rounded-lg bg-wash p-4">
              <p className="text-sm font-bold text-muted">가장 많이 선택한 플랫폼</p>
              <p className="mt-2 text-lg font-black">{getTopPlatform(personalization)}</p>
            </div>
            <div className="rounded-lg bg-wash p-4">
              <p className="text-sm font-bold text-muted">선호 문장 길이</p>
              <p className="mt-2 text-lg font-black">{captionLengthLabel(getTopCaptionLength(personalization))}</p>
            </div>
            <div className="rounded-lg bg-wash p-4">
              <p className="text-sm font-bold text-muted">자주 쓰는 해시태그</p>
              <p className="mt-2 text-sm font-bold leading-6">{personalization.frequentlyUsedHashtags.slice(0, 6).join(" ") || "아직 없음"}</p>
            </div>
            <div className="rounded-lg bg-wash p-4">
              <p className="text-sm font-bold text-muted">최근 학습 행동 수</p>
              <p className="mt-2 text-lg font-black">{getLearningActionCount(personalization)}개</p>
            </div>
            <div className="rounded-lg bg-wash p-4">
              <p className="text-sm font-bold text-muted">개인화 수준</p>
              <p className="mt-2 text-lg font-black">{getPersonalizationLevel(personalization)}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={handleExport} type="button" variant="secondary">
              <Download size={16} aria-hidden="true" />
              개인화 데이터 내보내기
            </Button>
            <Button onClick={handleOpenOnboarding} type="button" variant="soft">
              <RotateCcw size={16} aria-hidden="true" />
              온보딩 다시 진행
            </Button>
            <Button onClick={() => setPendingReset(true)} type="button" variant="danger">
              학습 데이터 초기화
            </Button>
          </div>

          {exportText ? (
            <label className="mt-5 block">
              <span className="field-label">내보낸 개인화 데이터</span>
              <textarea className="field min-h-40 resize-none font-mono text-xs" readOnly value={exportText} />
            </label>
          ) : null}

          <div className="mt-5">
            <label>
              <span className="field-label">개인화 데이터 다시 불러오기</span>
              <textarea
                className="field min-h-32 resize-none font-mono text-xs"
                onChange={(event) => setImportText(event.target.value)}
                placeholder="내보낸 JSON을 붙여넣으세요."
                value={importText}
              />
            </label>
            <Button className="mt-3" disabled={!importText.trim()} onClick={handleImport} type="button" variant="secondary">
              <Upload size={16} aria-hidden="true" />
              불러오기
            </Button>
          </div>

          {pendingReset ? (
            <div className="mt-5 rounded-lg border border-red-100 bg-red-50 p-4">
              <p className="text-sm font-bold text-red-700">학습 데이터를 초기화할까요? 브랜드 기본 설정은 유지됩니다.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button onClick={() => setPendingReset(false)} type="button" variant="secondary">
                  취소
                </Button>
                <Button onClick={handleReset} type="button" variant="danger">
                  초기화 확인
                </Button>
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}
    </AppShell>
  );
}
