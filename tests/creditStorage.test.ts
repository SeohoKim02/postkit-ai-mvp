import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { installBrowserStubs } from "./helpers.ts";
import {
  getCreditAccount,
  getCreditLedger,
  refundGenerationCredits,
  refundGenerationCreditsByRequestId,
  spendCreditsForGeneration
} from "@/lib/creditStorage";

describe("creditStorage (무료 베타 크레딧 원장)", () => {
  beforeEach(() => {
    installBrowserStubs();
  });

  it("신규 계정은 Free 베타 플랜과 체험 크레딧 300으로 시작한다", () => {
    const account = getCreditAccount();
    assert.equal(account.currentPlan, "Free");
    assert.equal(account.subscriptionStatus, "free");
    assert.equal(account.totalCreditBalance, 300);
  });

  it("저장된 유료 플랜 계정도 Free 베타 플랜으로 정규화된다", () => {
    const storage = installBrowserStubs();
    storage.setItem(
      "postkit-credit-account",
      JSON.stringify({
        version: 1,
        currentPlan: "Creator Plus",
        subscriptionStatus: "active",
        subscriptionCreditBalance: 450,
        purchasedCreditBalance: 100,
        totalCreditBalance: 550
      })
    );

    const account = getCreditAccount({ applyMonthlyGrant: false });
    assert.equal(account.currentPlan, "Free");
    assert.equal(account.subscriptionStatus, "free");
  });

  it("생성 차감 후 실패 환불이 잔액을 복구한다", () => {
    getCreditAccount();
    const debit = spendCreditsForGeneration(30, "req-refund-1");
    assert.equal(debit.ok, true);
    assert.ok(debit.ledgerEntry);
    assert.equal(debit.account.totalCreditBalance, 270);

    const refund = refundGenerationCredits(debit.ledgerEntry!.id);
    assert.equal(refund.refunded, true);
    assert.equal(refund.account.totalCreditBalance, 300);
  });

  it("같은 차감 건은 두 번 환불되지 않는다", () => {
    getCreditAccount();
    const debit = spendCreditsForGeneration(30, "req-refund-2");
    assert.equal(debit.ok, true);

    const first = refundGenerationCredits(debit.ledgerEntry!.id);
    assert.equal(first.refunded, true);

    const second = refundGenerationCredits(debit.ledgerEntry!.id);
    assert.equal(second.refunded, false);
    assert.equal(second.account.totalCreditBalance, 300);

    const byRequest = refundGenerationCreditsByRequestId("req-refund-2");
    assert.equal(byRequest.refunded, false);
    assert.equal(byRequest.account.totalCreditBalance, 300);
  });

  it("requestId 기반 환불이 미완료 요청 차감분을 복구한다", () => {
    getCreditAccount();
    const debit = spendCreditsForGeneration(30, "req-stale-1");
    assert.equal(debit.ok, true);
    assert.equal(debit.account.totalCreditBalance, 270);

    const refund = refundGenerationCreditsByRequestId("req-stale-1");
    assert.equal(refund.refunded, true);
    assert.equal(refund.account.totalCreditBalance, 300);

    const missing = refundGenerationCreditsByRequestId("req-does-not-exist");
    assert.equal(missing.refunded, false);
  });

  it("잔액보다 큰 차감은 거부되고 원장에 기록되지 않는다", () => {
    getCreditAccount();
    const before = getCreditLedger().length;
    const debit = spendCreditsForGeneration(1000, "req-too-big");
    assert.equal(debit.ok, false);
    assert.equal(getCreditAccount().totalCreditBalance, 300);
    assert.equal(getCreditLedger().length, before);
  });
});
