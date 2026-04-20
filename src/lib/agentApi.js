/**
 * agentApi.js
 * -----------
 * LLM Agent 통신 추상화 레이어.
 *
 * ┌─ 아키텍처 ───────────────────────────────────────────────┐
 * │  Browser  →  Spring Boot (/api/agent/chat)  →  LLM API  │
 * │                                                          │
 * │  프론트는 API 키를 헤더로 백엔드에 전달하고,              │
 * │  백엔드가 Anthropic / OpenAI API를 실제로 호출합니다.    │
 * │  (브라우저에서 직접 LLM API 호출 시 CORS 차단됨)         │
 * └──────────────────────────────────────────────────────────┘
 *
 * ┌─ Spring Boot 백엔드 구현 가이드 ─────────────────────────┐
 * │                                                          │
 * │  [일반 응답]  POST /api/agent/chat                       │
 * │  Request Headers:                                        │
 * │    X-LLM-Provider : "anthropic" | "openai"              │
 * │    X-LLM-Api-Key  : 사용자가 입력한 API 키              │
 * │    X-LLM-Model    : 모델명 (예: claude-sonnet-4-6)      │
 * │  Request Body:                                           │
 * │    { messages: Message[], systemPrompt: string,          │
 * │      projectContext: object }                            │
 * │  Response: { content: string, usage: object }            │
 * │                                                          │
 * │  [스트리밍]   POST /api/agent/chat/stream                │
 * │  Response: text/event-stream (SSE)                       │
 * │    data: {"delta":"글자씩"}\n\n                          │
 * │    data: [DONE]\n\n                                      │
 * │                                                          │
 * │  의존성 (pom.xml):                                       │
 * │    spring-ai-anthropic-spring-boot-starter               │
 * │    또는 com.theokanning.openai-gpt3-java-client          │
 * └──────────────────────────────────────────────────────────┘
 */

import { API_BASE_URL } from "@/lib/authConfig";

/* ── 상수 ── */
export const AGENT_CONFIG_KEY = "align_agent_config";

export const PROVIDERS = {
  anthropic: {
    label:  "Anthropic (Claude)",
    models: [
      { id: "claude-opus-4-6",    label: "Claude Opus 4.6 (최고 성능)"  },
      { id: "claude-sonnet-4-6",  label: "Claude Sonnet 4.6 (권장)"     },
      { id: "claude-haiku-4-5-20251001",   label: "Claude Haiku 4.5 (빠름)"       },
    ],
  },
  openai: {
    label:  "OpenAI (GPT)",
    models: [
      { id: "gpt-4o",             label: "GPT-4o (최고 성능)"           },
      { id: "gpt-4o-mini",        label: "GPT-4o Mini (권장)"           },
      { id: "gpt-4-turbo",        label: "GPT-4 Turbo"                  },
    ],
  },
};

/* ── 설정 저장/불러오기 ── */
export function saveAgentConfig(config) {
  if (typeof window === "undefined") return;
  localStorage.setItem(AGENT_CONFIG_KEY, JSON.stringify(config));
}

export function loadAgentConfig() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AGENT_CONFIG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearAgentConfig() {
  if (typeof window !== "undefined") localStorage.removeItem(AGENT_CONFIG_KEY);
}

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
export async function sendMessage({ messages, config, projectContext }) {
  const { provider, apiKey, model } = config;

  const res = await fetch(`${API_BASE_URL}/api/agent/chat`, {
    method: "POST",
    headers: {
      "Content-Type":    "application/json",
      "X-LLM-Provider":  provider,
      "X-LLM-Api-Key":   apiKey,
      "X-LLM-Model":     model,
    },
    body: JSON.stringify({
      messages,
      systemPrompt:   buildSystemPrompt(projectContext),
      projectContext,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }

  return res.json(); // { content: string, usage: {...} }
}

/* ── 스트리밍 응답 전송 (SSE) ── */
/**
 * @param {object}   opts
 * @param {object[]} opts.messages        - 대화 히스토리
 * @param {object}   opts.config          - { provider, apiKey, model }
 * @param {object}   [opts.projectContext] - 프로젝트 컨텍스트
 * @param {function} [opts.onChunk]       - 청크 수신 콜백 (delta: string)
 * @param {function} [opts.onDone]        - 완료 콜백
 * @param {function} [opts.onError]       - 오류 콜백 (message: string)
 * @param {AbortSignal} [opts.signal]     - 취소 신호 (AbortController.signal)
 */
export async function sendMessageStream({ messages, config, projectContext, onChunk, onDone, onError, signal }) {
  const { provider, apiKey, model } = config;

  try {
    const res = await fetch(`${API_BASE_URL}/api/agent/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type":    "application/json",
        "X-LLM-Provider":  provider,
        "X-LLM-Api-Key":   apiKey,
        "X-LLM-Model":     model,
      },
      body: JSON.stringify({
        messages,
        systemPrompt:   buildSystemPrompt(projectContext),
        projectContext,
      }),
      signal,  // AbortController.signal 연결
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
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

/* ── API 키 유효성 빠른 테스트 ── */
export async function testApiKey({ provider, apiKey, model }) {
  const res = await fetch(`${API_BASE_URL}/api/agent/test`, {
    method: "POST",
    headers: {
      "Content-Type":   "application/json",
      "X-LLM-Provider": provider,
      "X-LLM-Api-Key":  apiKey,
      "X-LLM-Model":    model,
    },
    body: JSON.stringify({ prompt: "Hello" }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "API 키 검증 실패");
  }
  return true;
}
