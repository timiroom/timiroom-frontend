import { API_BASE_URL, apiFetch } from "@/lib/authConfig";

async function request(path, { method = "GET", body, fallback } = {}) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/ai-keys${path}`, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res) return null;
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || fallback || "요청을 처리하지 못했습니다");
  }
  return res.status === 204 ? null : res.json();
}

export const fetchAiKeys = () => request("", { fallback: "AI 키 목록을 불러오지 못했습니다" });
export const registerAiKey = (payload) => request("", { method: "POST", body: payload, fallback: "AI 키를 등록하지 못했습니다" });
export const verifyAiKey = (id) => request(`/${id}/verify`, { method: "POST", fallback: "연결을 확인하지 못했습니다" });
export const updateAiKey = (id, payload) => request(`/${id}`, { method: "PATCH", body: payload, fallback: "AI 키를 바꾸지 못했습니다" });
export const deleteAiKey = (id) => request(`/${id}`, { method: "DELETE", fallback: "AI 키를 지우지 못했습니다" });

/** 화면에 보여 줄 제공자 정보와 대표 모델(직접 입력도 된다). */
export const PROVIDERS = {
  OPENAI: { label: "OpenAI", hint: "sk-로 시작하는 키", models: ["gpt-5.4-mini", "gpt-5.4", "gpt-4.1-mini"], keyUrl: "https://platform.openai.com/api-keys" },
  ANTHROPIC: { label: "Anthropic (Claude)", hint: "sk-ant-로 시작하는 키", models: ["claude-sonnet-5-5", "claude-haiku-5-5", "claude-opus-5-5"], keyUrl: "https://console.anthropic.com/settings/keys" },
  GOOGLE: { label: "Google (Gemini)", hint: "AI Studio에서 만든 키", models: ["gemini-2.5-flash", "gemini-2.5-pro"], keyUrl: "https://aistudio.google.com/apikey" },
  CUSTOM: { label: "OpenAI 호환 주소", hint: "Friendli, OpenRouter 같은 서비스의 키", models: [], keyUrl: null },
};
