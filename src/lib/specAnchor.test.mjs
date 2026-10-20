import assert from "node:assert/strict";
import test from "node:test";

import { anchorBadge, explorerUrl, isAnchorSettled, shortHex, verificationRows } from "./specAnchor.mjs";

test("badge follows anchor state when the chain is enabled", () => {
  const badge = (state) => anchorBadge({ state, chainEnabled: true });
  assert.deepEqual(badge("CONFIRMED"), { tone: "success", label: "블록체인 기록됨" });
  for (const state of ["PENDING", "SENDING", "SUBMITTED"]) assert.deepEqual(badge(state), { tone: "info", label: "기록 대기 중" });
  assert.deepEqual(badge("UNKNOWN"), { tone: "warning", label: "기록 확인 중" });
  assert.deepEqual(badge("FAILED"), { tone: "danger", label: "기록 실패" });
  assert.equal(badge("NONE"), null);
});

test("badge is hidden when the chain is disabled or the anchor is missing", () => {
  assert.equal(anchorBadge({ state: "PENDING", chainEnabled: false }), null);
  assert.equal(anchorBadge({ state: "CONFIRMED", chainEnabled: false }), null);
  assert.equal(anchorBadge(null), null);
  assert.equal(anchorBadge(undefined), null);
});

test("only confirmed, failed and none states stop polling", () => {
  for (const state of ["CONFIRMED", "FAILED", "NONE"]) assert.equal(isAnchorSettled(state), true);
  for (const state of ["PENDING", "SENDING", "SUBMITTED", "UNKNOWN", undefined]) assert.equal(isAnchorSettled(state), false);
});

test("explorer links exist only for Sepolia", () => {
  assert.equal(explorerUrl(11155111, "tx", "0xabc"), "https://sepolia.etherscan.io/tx/0xabc");
  assert.equal(explorerUrl(11155111, "address", "0xdef"), "https://sepolia.etherscan.io/address/0xdef");
  assert.equal(explorerUrl(1, "tx", "0xabc"), null);
  assert.equal(explorerUrl(null, "tx", "0xabc"), null);
  assert.equal(explorerUrl(11155111, "tx", null), null);
  assert.equal(explorerUrl(11155111, "block", "1"), null);
});

test("verification rows keep step order and map each status", () => {
  const rows = verificationRows({
    verified: false,
    checks: [
      { step: "CHAIN", status: "SKIPPED" },
      { step: "DOCUMENTS", status: "PASS" },
      { step: "MANIFEST", status: "FAIL" },
    ],
  });
  assert.deepEqual(rows, [
    { step: "DOCUMENTS", label: "문서 본문이 발행 때와 같음", status: "일치", tone: "success" },
    { step: "MANIFEST", label: "지문과 revision 사슬이 이어짐", status: "불일치", tone: "danger" },
    { step: "CHAIN", label: "블록체인 기록과 같음", status: "체인 기록 전", tone: "neutral" },
  ]);
  assert.equal(verificationRows({ checks: [{ step: "CHAIN", status: "ERROR" }] })[2].tone, "warning");
});

test("missing or unknown checks are shown as errors, not passes", () => {
  for (const row of verificationRows(null)) assert.equal(row.tone, "warning");
  assert.equal(verificationRows({ checks: [{ step: "DOCUMENTS", status: "WEIRD" }] })[0].tone, "warning");
});

test("short hex keeps six leading and four trailing characters", () => {
  assert.equal(shortHex("0x1234567890abcdef"), "0x1234…cdef");
  assert.equal(shortHex("0x1234"), "0x1234");
  assert.equal(shortHex(null), "");
});
