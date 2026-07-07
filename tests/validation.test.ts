import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGenerationIdempotencyKey, validateCreateInputForAi } from "@/lib/ai/validation";
import type { CreateFormInput } from "@/types";

function validInput(): CreateFormInput {
  return {
    platform: "Instagram Feed",
    purpose: "Product Promotion",
    style: "친구한테 말하듯",
    productName: "  글로우 립밤  ",
    requiredKeywords: "촉촉함, 데일리",
    bannedKeywords: "1위",
    sponsorDisclosure: "gifted",
    uploadedFileName: "lipbalm.jpg"
  };
}

describe("ai/validation", () => {
  it("유효한 입력을 통과시키고 제품명을 trim한다", () => {
    const result = validateCreateInputForAi(validInput());
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.productName, "글로우 립밤");
    }
  });

  it("제품명이 없으면 INVALID_INPUT으로 거부한다", () => {
    const result = validateCreateInputForAi({ ...validInput(), productName: "   " });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.errorCode, "INVALID_INPUT");
    }
  });

  it("지원하지 않는 플랫폼과 업로드 파일 누락을 거부한다", () => {
    const badPlatform = validateCreateInputForAi({ ...validInput(), platform: "MySpace" });
    assert.equal(badPlatform.ok, false);

    const noFile = validateCreateInputForAi({ ...validInput(), uploadedFileName: undefined });
    assert.equal(noFile.ok, false);
  });

  it("idempotency 키는 같은 입력에 대해 항상 같고 입력이 다르면 달라진다", () => {
    const first = createGenerationIdempotencyKey(validInput());
    const second = createGenerationIdempotencyKey(validInput());
    const different = createGenerationIdempotencyKey({ ...validInput(), productName: "다른 제품" });

    assert.equal(first, second);
    assert.match(first, /^gen-[a-z0-9]+$/);
    assert.notEqual(first, different);
  });
});
