/**
 * relatedDocs.mjs
 * ---------------
 * AI 채팅이 지금 보고 있는 문서 말고 같은 프로젝트의 다른 문서도 참고할 수 있게,
 * 각 문서를 짧은 글로 요약한다. 문서 전체를 보내면 컨텍스트가 넘치므로 이름·경로·컬럼처럼
 * 서로 맞춰야 하는 식별자 위주로만 남긴다.
 */

const DOC_KEYS = ["prd", "features", "api", "erd"];
const PER_DOC_CHARS = 4000;

const text = (v) => (typeof v === "string" ? v.trim() : "");
const list = (v) => (Array.isArray(v) ? v : []);
const clip = (s, n) => (s.length > n ? `${s.slice(0, n)}…` : s);

function summarizePrd(prd) {
  if (!prd || typeof prd !== "object") return "";
  const lines = [];
  const overview = text(prd.projectOverview?.summary || prd.projectOverview);
  if (overview) lines.push(`개요: ${clip(overview, 300)}`);
  list(prd.coreFeatures).forEach((f) => {
    if (f?.name) lines.push(`- 핵심 기능 ${f.name}${f.priority ? ` (${f.priority})` : ""}: ${clip(text(f.description), 120)}`);
  });
  const mvp = list(prd.mvpScope?.included || prd.mvpScope);
  if (mvp.length) lines.push(`MVP 범위: ${mvp.map((m) => (typeof m === "string" ? m : m?.name)).filter(Boolean).join(", ")}`);
  return lines.join("\n");
}

function summarizeFeatures(features) {
  return list(features).map((f) => {
    if (typeof f === "string") return `- ${f}`;
    if (!f?.name) return "";
    const reqs = list(f.requirements).filter((r) => typeof r === "string" && r.trim()).slice(0, 3)
      .map((r) => clip(r.trim(), 80)).join(" / ");
    return `- ${f.name}${f.priority ? ` (${f.priority})` : ""}${reqs ? `: ${reqs}` : ""}`;
  }).filter(Boolean).join("\n");
}

function endpointsOf(api) {
  if (!api || typeof api !== "object") return [];
  if (Array.isArray(api.endpoints)) return api.endpoints;
  if (Array.isArray(api)) return api;
  return list(api.groups).flatMap((g) => list(g?.endpoints));
}

function summarizeApi(api) {
  return endpointsOf(api).map((e) => {
    if (!e?.path) return "";
    const what = text(e.summary || e.description);
    return `- ${(e.method || "GET").toUpperCase()} ${e.path}${what ? ` — ${clip(what, 60)}` : ""}`;
  }).filter(Boolean).join("\n");
}

function summarizeErd(schema) {
  if (!schema || typeof schema !== "object") return "";
  const tables = list(schema.tables).map((t) => {
    if (!t?.name) return "";
    const cols = list(t.columns).map((c) => {
      const cons = text(c?.constraints).toUpperCase();
      const mark = /PRIMARY/.test(cons) ? " PK" : /FOREIGN|REFERENCES/.test(cons) ? ` FK→${(text(c?.constraints).match(/REFERENCES\s+(?:REFERENCES\s+)?(\w+)/i) || [])[1] || "?"}` : "";
      return `${c?.name}${mark}`;
    }).filter(Boolean).join(", ");
    return `- ${t.name}(${cols})`;
  }).filter(Boolean);
  const rels = list(schema.relationships).filter((r) => typeof r === "string");
  return [...tables, ...(rels.length ? [`관계: ${rels.join("; ")}`] : [])].join("\n");
}

/** 프로젝트의 문서 요약 묶음. current(지금 보는 문서)는 뺀다. */
export function buildRelatedDocs(project, current) {
  if (!project) return {};
  const summaries = {
    prd: summarizePrd(project.prdDocument),
    features: summarizeFeatures(project.featureList),
    api: summarizeApi(project.apiSpec),
    erd: summarizeErd(project.dbSchema),
  };
  const out = {};
  DOC_KEYS.forEach((key) => {
    if (key === current) return;
    const value = summaries[key];
    if (value) out[key] = clip(value, PER_DOC_CHARS);
  });
  return out;
}

const LABELS = { prd: "PRD", features: "기능 명세", api: "API 명세", erd: "ERD" };

/** 상담(읽기 전용) 채팅의 시스템 프롬프트에 붙일 글. */
export function relatedDocsPrompt(related) {
  const parts = Object.entries(related || {}).map(([k, v]) => `[${LABELS[k] || k}]\n${v}`);
  if (!parts.length) return "";
  return `\n\n같은 프로젝트의 다른 문서 요약(참고용):\n---\n${parts.join("\n\n")}\n---\n다른 문서와 관련된 질문이면 이 요약을 근거로, 어느 문서의 내용인지 밝혀 답하세요.`;
}

/** 수정안이 다른 문서에 영향을 줄 만한지: 바뀐 내용에 다른 문서의 식별자가 나오면 그 문서를 고른다. */
export function suggestLinkedDocs(project, current, changedText) {
  const changed = String(changedText || "").toLowerCase();
  if (!changed) return [];
  const picks = [];
  const has = (word) => word && word.length >= 3 && changed.includes(String(word).toLowerCase());
  if (current !== "erd" && list(project?.dbSchema?.tables).some((t) => has(t?.name))) picks.push("erd");
  if (current !== "api" && endpointsOf(project?.apiSpec).some((e) => has(e?.path))) picks.push("api");
  if (current !== "features" && list(project?.featureList).some((f) => has(typeof f === "string" ? f : f?.name))) picks.push("features");
  return picks;
}

/** 두 문서에서 새로 생기거나 바뀐 부분만 글로 모은다(배열은 항목 단위로 비교). */
export function changedText(before, after) {
  const out = [];
  const walk = (b, a) => {
    if (JSON.stringify(b) === JSON.stringify(a)) return;
    if (Array.isArray(a)) {
      const old = new Set((Array.isArray(b) ? b : []).map((x) => JSON.stringify(x)));
      a.forEach((item) => { if (!old.has(JSON.stringify(item))) out.push(JSON.stringify(item)); });
      return;
    }
    if (a && typeof a === "object") {
      Object.keys(a).forEach((k) => walk(b && typeof b === "object" ? b[k] : undefined, a[k]));
      return;
    }
    if (a != null) out.push(String(a));
  };
  walk(before, after);
  return out.join("\n");
}

export const DOC_KEY_BY_TYPE = { PRD: "prd", FEATURE_LIST: "features", API_SPEC: "api", DB_SCHEMA: "erd" };
export const TYPE_BY_DOC_KEY = { prd: "PRD", features: "FEATURE_LIST", api: "API_SPEC", erd: "DB_SCHEMA" };
