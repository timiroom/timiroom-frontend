import assert from "node:assert/strict";
import test from "node:test";

import {
  humanizeSpecKey,
  isSpecValueChanged,
  normalizeChatText,
  parseStructuredValue,
} from "./specPresentation.mjs";

test("single line wraps are joined while numbered items stay separated", () => {
  const answer = [
    "1. 목표와 KPI가 일치하지 않습니다.",
    "완료율 기준이 서로 다르게 정의되어 있습니",
    "다.",
    "2. MVP 범위를 다시 확인해야 합니다.",
  ].join("\n");

  assert.equal(
    normalizeChatText(answer),
    "1. 목표와 KPI가 일치하지 않습니다. 완료율 기준이 서로 다르게 정의되어 있습니다.\n2. MVP 범위를 다시 확인해야 합니다.",
  );
});

test("paragraph and bullet boundaries are preserved", () => {
  const answer = "검토 결과입니다.\n\n- 첫 번째 수정\n상세 설명\n- 두 번째 수정";
  assert.equal(normalizeChatText(answer), "검토 결과입니다.\n\n- 첫 번째 수정 상세 설명\n- 두 번째 수정");
});

test("structured JSON strings become readable values", () => {
  assert.deepEqual(parseStructuredValue('{"goals":["목표"]}'), { goals: ["목표"] });
  assert.equal(parseStructuredValue("일반 문장"), "일반 문장");
  assert.equal(humanizeSpecKey("coreFeatures"), "핵심 기능");
  assert.equal(humanizeSpecKey("custom_field"), "Custom field");
});

test("changes are detected for every specification shape", () => {
  const cases = [
    [{ goals: ["기존 목표"] }, { goals: ["새 목표"] }],
    [{ features: [{ name: "검색" }] }, { features: [{ name: "통합 검색" }] }],
    [{ endpoints: [{ method: "GET", path: "/items" }] }, { endpoints: [{ method: "POST", path: "/items" }] }],
    [{ tables: [{ name: "users" }] }, { tables: [{ name: "members" }] }],
  ];
  for (const [before, after] of cases) assert.equal(isSpecValueChanged(before, after), true);
  assert.equal(isSpecValueChanged(cases[0][0], cases[0][0]), false);
});
