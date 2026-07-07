import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { checkAiRateLimit, getRateLimitMessage, resetAiRateLimitBuckets } from "@/lib/server/rateLimit";

function requestFromIp(ip: string) {
  return new Request("http://localhost/api/ai/generate-text", {
    method: "POST",
    headers: { "x-forwarded-for": ip }
  });
}

describe("server/rateLimit", () => {
  beforeEach(() => {
    resetAiRateLimitBuckets();
  });

  afterEach(() => {
    delete process.env.AI_RATE_LIMIT_PER_MINUTE;
    delete process.env.AI_RATE_LIMIT_PER_DAY;
    resetAiRateLimitBuckets();
  });

  it("분당 한도를 넘으면 minute 스코프로 차단한다", () => {
    process.env.AI_RATE_LIMIT_PER_MINUTE = "3";
    process.env.AI_RATE_LIMIT_PER_DAY = "100";

    for (let i = 0; i < 3; i += 1) {
      assert.equal(checkAiRateLimit(requestFromIp("10.0.0.1"), "generate-text").allowed, true);
    }

    const blocked = checkAiRateLimit(requestFromIp("10.0.0.1"), "generate-text");
    assert.equal(blocked.allowed, false);
    if (!blocked.allowed) {
      assert.equal(blocked.scope, "minute");
      assert.ok(blocked.retryAfterSeconds >= 1);
    }
  });

  it("일일 한도를 넘으면 day 스코프로 차단한다", () => {
    process.env.AI_RATE_LIMIT_PER_MINUTE = "100";
    process.env.AI_RATE_LIMIT_PER_DAY = "2";

    assert.equal(checkAiRateLimit(requestFromIp("10.0.0.2"), "generate-text").allowed, true);
    assert.equal(checkAiRateLimit(requestFromIp("10.0.0.2"), "generate-text").allowed, true);

    const blocked = checkAiRateLimit(requestFromIp("10.0.0.2"), "generate-text");
    assert.equal(blocked.allowed, false);
    if (!blocked.allowed) {
      assert.equal(blocked.scope, "day");
    }
  });

  it("IP와 라우트가 다르면 한도를 따로 계산한다", () => {
    process.env.AI_RATE_LIMIT_PER_MINUTE = "1";

    assert.equal(checkAiRateLimit(requestFromIp("10.0.0.3"), "generate-text").allowed, true);
    assert.equal(checkAiRateLimit(requestFromIp("10.0.0.3"), "generate-text").allowed, false);
    assert.equal(checkAiRateLimit(requestFromIp("10.0.0.4"), "generate-text").allowed, true);
    assert.equal(checkAiRateLimit(requestFromIp("10.0.0.3"), "recommend-design").allowed, true);
  });

  it("차단 안내 문구는 한국어로 제공된다", () => {
    assert.match(getRateLimitMessage("minute"), /잠시 후 다시 시도/);
    assert.match(getRateLimitMessage("day"), /내일 다시 시도/);
  });
});
