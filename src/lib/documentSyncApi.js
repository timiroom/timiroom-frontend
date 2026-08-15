import { RAG_PIPELINE_URL } from "@/lib/authConfig";

const DOCUMENT_LABELS = {
  PRD: "PRD",
  FEATURE_LIST: "기능 명세",
  API_SPEC: "API 명세",
  DB_SCHEMA: "ERD",
};

function extractJson(text) {
  const trimmed = String(text || "").trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() || trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(candidate.slice(start, end + 1));
    throw new Error("AI 영향도 분석 결과를 해석하지 못했습니다.");
  }
}

export function documentLabel(type) {
  return DOCUMENT_LABELS[type] || type;
}

export async function analyzeDocumentImpact({ sourceType, before, after, documents, signal }) {
  const targetDocuments = Object.fromEntries(
    Object.entries(documents || {}).filter(([type, document]) => type !== sourceType && document != null)
  );
  if (Object.keys(targetDocuments).length === 0) return { summary: "연결된 문서가 없습니다.", updates: [] };

  const systemPrompt = `당신은 소프트웨어 프로젝트 문서의 정합성을 관리하는 변경 영향도 분석 에이전트입니다.
PRD, 기능 명세, API 명세, ERD 사이의 의미적 연결을 분석합니다.

규칙:
1. 원본 문서의 실제 변경점을 수정 전후 내용으로 비교하세요.
2. 연결 문서마다 변경이 반드시 필요한지 판단하세요.
3. 단순 표현 변경은 다른 문서에 전파하지 마세요.
4. 요구사항, 기능, 엔드포인트, 데이터 구조에 영향을 주는 변경만 전파하세요.
5. 변경이 필요한 문서는 기존 JSON 구조와 기존 값을 최대한 보존한 전체 문서 JSON으로 반환하세요.
6. 관련 없는 항목을 삭제하거나 새로 만들지 마세요.
7. 원본 문서는 updates에 포함하지 마세요.
8. 반드시 설명이나 마크다운 없이 아래 JSON 형식만 반환하세요.

{"summary":"판단 요약","updates":[{"type":"FEATURE_LIST|API_SPEC|DB_SCHEMA|PRD","reason":"수정 이유","document":{}}]}`;

  const payload = {
    source: {
      type: sourceType,
      label: documentLabel(sourceType),
      before: before ?? null,
      after,
    },
    linkedDocuments: targetDocuments,
  };

  const response = await fetch(`${RAG_PIPELINE_URL}/api/agent/chat`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-LLM-Provider": "azure-foundry",
      "X-LLM-Model": process.env.NEXT_PUBLIC_AGENT_MODEL || "gpt-5.4-mini",
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: JSON.stringify(payload) }],
      systemPrompt,
      projectContext: null,
    }),
    signal,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || body.detail || `AI 영향도 분석 실패 (HTTP ${response.status})`);
  }

  const body = await response.json();
  const parsed = extractJson(body?.content);
  const validTypes = new Set(Object.keys(targetDocuments));
  const updates = Array.isArray(parsed?.updates)
    ? parsed.updates.filter(update =>
        validTypes.has(update?.type) && update.document && typeof update.document === "object"
      )
    : [];

  return {
    summary: parsed?.summary || "연결 문서 영향도 분석을 완료했습니다.",
    updates,
  };
}
