import test from "node:test";
import assert from "node:assert/strict";
import { markdownToPrd, prdToMarkdown } from "./prdMarkdown.mjs";

const sample = {
  projectOverview: "캠퍼스 행사 포스터를 찍으면 일정으로 바꿔 주는 앱입니다.",
  background: "행사 정보가 여러 채널에 흩어져 있습니다.\n직접 옮겨 적는 부담이 큽니다. (출처: 설문)",
  goals: ["포스터 한 장으로 일정 등록", "놓친 행사 줄이기"],
  kpi: [{ metric: "일정 등록 성공률", target: "90% 이상", basis: "베타 테스트", measurementMethod: "등록 로그", frequency: "주간" }],
  coreFeatures: [
    { featureId: "F-001", name: "포스터 인식", description: "사진에서 행사명과 날짜를 뽑습니다.", priority: "P0", actions: ["촬영"], apiContract: { path: "/ocr" }, dbContract: {}, requirements: ["날짜 인식", "장소 인식"] },
    { featureId: "F-002", name: "캘린더 등록", description: "인식 결과를 캘린더에 넣습니다.", priority: "P1", requirements: [] },
  ],
  userPersonas: [{ name: "김대학", age: 22, job: "대학생", techLevel: "중간", goal: "행사를 놓치지 않기", painPoint: "정보가 흩어짐", usagePattern: "주 3회" }],
  mvpScope: { included: ["포스터 인식"], excluded: ["결제"], rationale: "핵심 흐름부터 검증합니다." },
  techStack: { backend: "Spring Boot", frontend: "React Native", search: "OpenSearch" },
  releaseSchedule: [{ date: "2026-11-01", milestone: "베타", description: "학내 배포", deliverables: ["앱 빌드"] }],
};

test("구조화 PRD를 마크다운으로 바꿨다가 되돌리면 같은 문서가 된다", () => {
  const { doc, unknownSections } = markdownToPrd(prdToMarkdown(sample), sample);
  assert.deepEqual(unknownSections, []);
  assert.deepEqual(doc, sample);
});

test("틀에 없는 필드는 이름으로 짝지어 보존하고, 순서를 바꿔도 섞이지 않는다", () => {
  const markdown = prdToMarkdown(sample)
    .replace("### 포스터 인식 `P0`", "### 임시")
    .replace("### 캘린더 등록 `P1`", "### 포스터 인식 `P0`")
    .replace("### 임시", "### 캘린더 등록 `P1`");
  const { doc } = markdownToPrd(markdown, sample);
  assert.equal(doc.coreFeatures[0].name, "캘린더 등록");
  assert.equal(doc.coreFeatures[0].featureId, "F-002");
  assert.equal(doc.coreFeatures[1].featureId, "F-001");
  assert.deepEqual(doc.coreFeatures[1].apiContract, { path: "/ocr" });
});

test("이름만 바꾼 기능은 같은 자리의 원본 필드를 이어 받고, 새로 넣은 기능은 빈 필드로 시작한다", () => {
  const renamed = markdownToPrd(prdToMarkdown(sample).replace("### 포스터 인식", "### 포스터 자동 인식"), sample).doc;
  assert.equal(renamed.coreFeatures[0].featureId, "F-001");

  const added = markdownToPrd(prdToMarkdown(sample).replace("## 사용자 페르소나", "### 알림 `P2`\n\n새 기능\n\n## 사용자 페르소나"), sample).doc;
  assert.equal(added.coreFeatures.length, 3);
  assert.equal(added.coreFeatures[2].name, "알림");
  assert.equal(added.coreFeatures[2].featureId, undefined);
});

test("편집 내용이 구조화 필드에 반영된다", () => {
  const markdown = prdToMarkdown(sample)
    .replace("- 놓친 행사 줄이기", "- 놓친 행사 줄이기\n- 친구와 일정 공유")
    .replace("- **백엔드**: Spring Boot", "- **백엔드**: FastAPI");
  const { doc } = markdownToPrd(markdown, sample);
  assert.deepEqual(doc.goals, ["포스터 한 장으로 일정 등록", "놓친 행사 줄이기", "친구와 일정 공유"]);
  assert.equal(doc.techStack.backend, "FastAPI");
  assert.equal(doc.techStack.search, "OpenSearch");
});

test("틀에 없는 ## 제목은 알려 주고, 지운 섹션은 비운다", () => {
  const markdown = prdToMarkdown(sample).replace(/## KPI[\s\S]*?(?=## 핵심 기능)/, "") + "\n## 회의 메모\n\n다음 주 확정\n";
  const { doc, unknownSections } = markdownToPrd(markdown, sample);
  assert.deepEqual(unknownSections, ["회의 메모"]);
  assert.deepEqual(doc.kpi, []);
});

test("첫 제목 앞의 글은 개요로 읽는다", () => {
  const { doc } = markdownToPrd("간단한 소개 문장\n\n## 목표\n\n- 하나\n", {});
  assert.equal(doc.projectOverview, "간단한 소개 문장");
  assert.deepEqual(doc.goals, ["하나"]);
});

test("틀 밖 섹션은 구조에서 다시 만들어도 뒤에 남는다", async () => {
  const { prdToMarkdownWithExtras, extraSections } = await import("./prdMarkdown.mjs");
  const previous = prdToMarkdown(sample) + "\n## 회의 메모\n\n다음 주 확정\n";
  const next = prdToMarkdownWithExtras({ ...sample, goals: ["바뀐 목표"] }, previous);
  assert.match(next, /- 바뀐 목표/);
  assert.deepEqual(extraSections(next).map((section) => section.title), ["회의 메모"]);
  assert.match(next, /## 회의 메모\n\n다음 주 확정/);
});
