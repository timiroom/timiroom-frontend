/**
 * agentApi.js
 * -----------
 * 문서 어시스턴트 통신 레이어. 모델은 EXAONE 하나로 고정돼 있습니다.
 *
 * ┌─ 아키텍처 ───────────────────────────────────────────────────────┐
 * │  Browser  →  pipeline_py  →  EXAONE (Friendli.ai)               │
 * │                                                                  │
 * │  API 키는 pipeline_py의 .env에만 있고 브라우저로 나오지 않습니다.│
 * └──────────────────────────────────────────────────────────────────┘
 *
 * 두 가지 경로가 있습니다:
 *   sendMessageStream  자유 대화 (질문·조언). 문서를 바꾸지 않음.
 *   requestDocumentEdit  문서 수정 제안. 제안문 + 섹션별 diff를 받아 사용자 승인 후 적용.
 */

import { RAG_PIPELINE_URL } from "@/lib/authConfig";

/* ── 시스템 프롬프트 생성 ── */
export function buildSystemPrompt(projectContext) {
  const base = `당신은 Align-it 플랫폼의 AI 에이전트입니다.
Align-it은 LLM과 지식 그래프를 활용해 PRD·API 명세·DB 스키마·QA 시나리오의
정합성을 자동으로 검증하는 소프트웨어 개발 지원 플랫폼입니다.

역할:
- 사용자의 PRD 작성, API 설계, DB 스키마 설계를 도움
- 기획과 개발 간 불일치를 발견하고 개선안 제시
- 기술 스택 선택, 아키텍처 결정 조언
- 한국어로 답변 (코드/기술 용어는 영어 유지)`;

  if (!projectContext) return base;

  return `${base}

현재 작업 중인 프로젝트:
- 이름: ${projectContext.name}
- 설명: ${projectContext.description}
- 상태: ${projectContext.status}
- 기술 스택: ${(projectContext.tags || []).join(", ")}
- 정합성 스코어: ${projectContext.score}/100

이 프로젝트의 맥락을 고려하여 구체적이고 실용적인 조언을 제공하세요.`;
}

/* ── 일반 응답 전송 ── */
export async function sendMessage({ messages, projectContext, systemPrompt }) {
  const res = await fetch(`${RAG_PIPELINE_URL}/api/agent/chat`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      system_prompt: systemPrompt || buildSystemPrompt(projectContext),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.message || `HTTP ${res.status}`);
  }

  return res.json(); // { content: string, metadata: {...} }
}

/* ── 스트리밍 응답 전송 (SSE) ── */
/**
 * @param {object}      opts
 * @param {object[]}    opts.messages       - 대화 히스토리
 * @param {object}      [opts.projectContext] - 프로젝트 컨텍스트
 * @param {string}      [opts.systemPrompt] - 컨텍스트별 시스템 프롬프트
 * @param {function}    [opts.onChunk]      - 청크 수신 콜백 (delta: string)
 * @param {function}    [opts.onDone]       - 완료 콜백
 * @param {function}    [opts.onError]      - 오류 콜백 (message: string)
 * @param {AbortSignal} [opts.signal]       - 취소 신호
 */
export async function sendMessageStream({
  messages, projectContext, systemPrompt, onChunk, onDone, onError, signal,
}) {
  try {
    const res = await fetch(`${RAG_PIPELINE_URL}/api/agent/chat/stream`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type":  "application/json",
        "Accept":        "text/event-stream",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify({
        messages,
        system_prompt: systemPrompt || buildSystemPrompt(projectContext),
      }),
      signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || `HTTP ${res.status}`);
    }

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer    = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";   // 마지막 불완전한 줄은 버퍼에 보관

      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") { onDone?.(); return; }
        try {
          const parsed = JSON.parse(data);
          // 서버가 스트림 도중 오류를 만나면 error 필드를 실어 보낸다
          if (parsed.error) { onError?.(parsed.error); return; }
          onChunk?.(parsed.delta ?? "");
        } catch {}
      }
    }
    onDone?.();
  } catch (err) {
    // AbortError는 사용자 취소이므로 onError 호출 없이 조용히 종료
    if (err.name === "AbortError") return;
    onError?.(err.message || "스트리밍 오류가 발생했습니다.");
  }
}

/* ── 문서 수정 제안 요청 ── */

/** 서버 _PROFILES와 짝을 이루는 문서 종류 */
export const DOC_TYPES = {
  prd:      { key: "prd",      label: "PRD" },
  features: { key: "features", label: "기능 명세서" },
  api:      { key: "api",      label: "API 명세서" },
  erd:      { key: "erd",      label: "ERD 명세서" },
};

/**
 * EXAONE이 현재 문서를 읽고 섹션/항목 단위 수정안을 만듭니다.
 * 문서를 저장하지는 않습니다 — 사용자가 제안문과 diff를 보고 승인해야 적용됩니다.
 *
 * @param {object}   opts
 * @param {string}   opts.docType     - "prd" | "features" | "api" | "erd"
 * @param {object}   opts.document    - 현재 문서 JSON
 * @param {string}   opts.instruction - 사용자의 수정 요청
 * @param {object[]} [opts.history]   - 직전 대화 [{role, content}]
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<{intent: "edit"|"chat", reply: string, edits: object[]}>}
 *   edits[]: { section, label, before, after, diff: [{type:"same"|"add"|"del", text}] }
 */
export async function requestDocumentEdit({ docType, document, instruction, history = [], signal }) {
  const res = await fetch(`${RAG_PIPELINE_URL}/api/v1/document/${docType}/edit`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document: document || {}, instruction, history }),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.message || `HTTP ${res.status}`);
  }

  const body = await res.json();
  // pipeline_py 공통 응답 포맷: { success, code, data }
  return body?.data ?? body;
}

/* ── 백엔드 연결 테스트 ── */
export async function testConnection() {
  const res = await fetch(`${RAG_PIPELINE_URL}/api/agent/test`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.message || "연결 실패");
  }
  return true;
}
