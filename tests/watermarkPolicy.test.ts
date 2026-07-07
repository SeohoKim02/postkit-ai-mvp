import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { installBrowserStubs } from "./helpers.ts";
import { getPostKitWatermarkStatus, POSTKIT_WATERMARK_TEXT } from "@/lib/watermarkPolicy";

describe("watermarkPolicy (베타 기간 전원 적용)", () => {
  beforeEach(() => {
    installBrowserStubs();
  });

  it("Free 플랜에는 워터마크가 적용된다", () => {
    const status = getPostKitWatermarkStatus({ currentPlan: "Free", subscriptionStatus: "free" });
    assert.equal(status.enabled, true);
    assert.equal(status.text, POSTKIT_WATERMARK_TEXT);
  });

  it("유료 플랜 상태 값이 저장돼 있어도 베타 기간에는 워터마크가 유지된다", () => {
    const status = getPostKitWatermarkStatus({ currentPlan: "Creator Plus", subscriptionStatus: "active" });
    assert.equal(status.enabled, true);
  });

  it("계정 인자 없이 호출해도(신규 계정) 워터마크가 적용된다", () => {
    const status = getPostKitWatermarkStatus();
    assert.equal(status.enabled, true);
    assert.equal(status.text, "Made with PostKit");
  });
});
