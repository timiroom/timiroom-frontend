const FIELD_LABELS = {
  htmlContent: "본문",
  markdown: "마크다운 원문",
  projectOverview: "프로젝트 개요",
  background: "배경 및 문제 정의",
  goals: "목표",
  kpi: "핵심 성과 지표",
  successMetrics: "성공 지표",
  coreFeatures: "핵심 기능",
  features: "기능 목록",
  userPersonas: "사용자 페르소나",
  targetUsers: "대상 사용자",
  mvpScope: "MVP 범위",
  techStack: "기술 스택",
  releaseSchedule: "출시 일정",
  endpoints: "API 엔드포인트",
  tables: "데이터베이스 테이블",
  relationships: "테이블 관계",
  name: "이름",
  description: "설명",
  priority: "우선순위",
  requirements: "요구사항",
  featureId: "기능 ID",
  method: "HTTP 메서드",
  path: "경로",
  authRequired: "인증 필요",
  parameters: "요청 파라미터",
  requestBody: "요청 본문",
  successResponse: "성공 응답",
  errorCodes: "오류 응답",
  columns: "컬럼",
  indexes: "인덱스",
  type: "타입",
  constraints: "제약조건",
  included: "포함 범위",
  excluded: "제외 범위",
  rationale: "선정 근거",
  metric: "측정 지표",
  target: "목표값",
  basis: "산정 근거",
  measurementMethod: "측정 방법",
  frequency: "측정 주기",
  date: "일정",
  milestone: "마일스톤",
  deliverables: "산출물",
};

export function parseStructuredValue(value) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed || !["{", "["].includes(trimmed[0])) return value;
  try { return JSON.parse(trimmed); } catch { return value; }
}

export function humanizeSpecKey(key) {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  return String(key || "")
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (letter) => letter.toUpperCase());
}

export function normalizeChatText(value) {
  const text = String(value || "").replace(/\r\n?/g, "\n").trim();
  if (!text) return "";

  const output = [];
  let current = "";
  let inCodeBlock = false;

  const flush = () => {
    if (current) output.push(current);
    current = "";
  };

  for (const sourceLine of text.split("\n")) {
    const line = sourceLine.trim();
    if (line.startsWith("```")) {
      flush();
      output.push(sourceLine);
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) {
      output.push(sourceLine);
      continue;
    }
    if (!line) {
      flush();
      if (output.at(-1) !== "") output.push("");
      continue;
    }

    const startsBlock = /^(?:#{1,6}\s+|[-*•]\s+|\d+[.)]\s+)/.test(line);
    if (startsBlock) {
      flush();
      current = line;
      continue;
    }
    if (!current) {
      current = line;
      continue;
    }
    const splitKoreanSuffix = /[가-힣]$/.test(current)
      && /^(?:다|니다|습니다|는다|은|는|이|가|을|를|의|에|에서|에게|으로|로|와|과|도|만)(?:[.,!?…]|$)/.test(line);
    current = `${current}${splitKoreanSuffix ? "" : " "}${line}`;
  }
  flush();

  return output.join("\n").replace(/\n{3,}/g, "\n\n");
}

export function isSpecValueChanged(before, after) {
  return JSON.stringify(parseStructuredValue(before)) !== JSON.stringify(parseStructuredValue(after));
}
