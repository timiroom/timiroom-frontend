import { API_BASE_URL, apiFetch } from "@/lib/authConfig";

/** 사용량이 바뀌었을 수 있을 때(AI 호출 뒤) 화면 곳곳의 사용량 표시를 새로 고치게 알린다. */
export const USAGE_CHANGED_EVENT = "timiroom:usage-changed";
/** 서버가 한도 초과(429)를 돌려줬을 때 */
export const USAGE_LIMIT_EVENT = "timiroom:usage-limit";

export function notifyUsageChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(USAGE_CHANGED_EVENT));
}

/** 한도 초과 오류. resetAt(ISO)과 plan(FREE|PRO)을 담는다. */
export class UsageLimitError extends Error {
  constructor({ message, resetAt, plan } = {}) {
    super(message || "이번 달 AI 사용 한도를 모두 썼습니다.");
    this.name = "UsageLimitError";
    this.code = "USAGE_LIMIT_EXCEEDED";
    this.resetAt = resetAt ?? null;
    this.plan = plan ?? null;
  }
}

/** 429 응답이면 UsageLimitError를 만들고 화면 전체에 알린다. 아니면 null. */
export async function usageLimitErrorFrom(res) {
  if (!res || res.status !== 429) return null;
  const body = await res.clone().json().catch(() => ({}));
  const error = new UsageLimitError({ message: body.error || body.detail, resetAt: body.resetAt, plan: body.plan });
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(USAGE_LIMIT_EVENT, { detail: error }));
  return error;
}

export function formatResetDate(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}

export const FEATURE_LABELS = {
  PROJECT_GENERATION: "프로젝트 생성",
  PROJECT_CHAT: "새 프로젝트 대화",
  AI_CHAT: "AI 채팅",
  DOCUMENT_EDIT: "AI 문서 수정",
  RECOMMENDATION: "추천",
  PR_CONSISTENCY: "PR 정합성 검사",
  SPEC_REVIEW: "변경안 검토",
};

export function formatKrw(value) {
  const number = Number(value ?? 0);
  return `${Math.round(number).toLocaleString("ko-KR")}원`;
}

async function getJson(path, fallbackMessage) {
  const res = await apiFetch(`${API_BASE_URL}${path}`);
  if (!res) return null;
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || fallbackMessage);
  }
  return res.json();
}

export const fetchUsageMe = () => getJson("/api/v1/usage/me", "사용량을 불러오지 못했습니다");
export const fetchUsageFeatures = () => getJson("/api/v1/usage/me/features", "사용량을 불러오지 못했습니다");
export const fetchPlans = () => getJson("/api/v1/usage/plans", "요금제를 불러오지 못했습니다");

/** AI 품질(빠름·균형·정밀). { tier, effectiveTier, options: [{ tier, label, description, proOnly, available }] } */
export const fetchModelTier = () => getJson("/api/v1/usage/model-tier", "AI 품질을 불러오지 못했습니다");

export async function updateModelTier(tier) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/usage/model-tier`, { method: "PUT", body: JSON.stringify({ tier }) });
  if (!res) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "AI 품질을 바꾸지 못했습니다");
  return body;
}
