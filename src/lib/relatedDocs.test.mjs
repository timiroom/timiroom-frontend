import test from "node:test";
import assert from "node:assert/strict";
import { buildRelatedDocs, changedText, relatedDocsPrompt, suggestLinkedDocs } from "./relatedDocs.mjs";

const project = {
  prdDocument: { projectOverview: "포스터 일정 앱", coreFeatures: [{ name: "포스터 일정 추출", priority: "P0", description: "사진을 올리면 일정을 뽑는다" }] },
  featureList: [{ name: "포스터 일정 추출", requirements: ["사진을 올리면 OCR로 읽는다"] }],
  apiSpec: { endpoints: [{ method: "post", path: "/api/v1/posters", summary: "포스터 등록" }] },
  dbSchema: {
    tables: [{ name: "posters", columns: [{ name: "id", constraints: "PRIMARY_KEY" }, { name: "user_id", constraints: "FOREIGN_KEY REFERENCES users(id)" }] }],
    relationships: ["users (1:N) posters"],
  },
};

test("지금 보는 문서는 빼고 나머지 문서를 요약한다", () => {
  const related = buildRelatedDocs(project, "api");
  assert.deepEqual(Object.keys(related).sort(), ["erd", "features", "prd"]);
  assert.match(related.erd, /posters\(id PK, user_id FK→users\)/);
  assert.match(related.prd, /포스터 일정 추출 \(P0\)/);
});

test("상담 프롬프트에 문서 이름을 붙인다", () => {
  assert.match(relatedDocsPrompt({ erd: "- posters" }), /\[ERD\]/);
  assert.equal(relatedDocsPrompt({}), "");
});

test("바뀐 부분만 모은다", () => {
  const before = { endpoints: [{ path: "/a" }, { path: "/b" }] };
  const after = { endpoints: [{ path: "/a" }, { path: "/posters/{id}" }] };
  assert.equal(changedText(before, after), JSON.stringify({ path: "/posters/{id}" }));
});

test("바뀐 내용에 다른 문서의 이름이 나오면 그 문서를 함께 고칠 후보로 고른다", () => {
  assert.deepEqual(suggestLinkedDocs(project, "api", "posters 테이블에 status 추가"), ["erd"]);
  assert.deepEqual(suggestLinkedDocs(project, "erd", "POST /api/v1/posters 응답"), ["api"]);
  assert.deepEqual(suggestLinkedDocs(project, "api", "설명 문구만 수정"), []);
});
