import { API_BASE_URL } from "@/lib/authConfig";
import { notifyUsageChanged, usageLimitErrorFrom } from "@/lib/usageApi";

/**
 * 백엔드 AI 게이트웨이(/api/v1/ai) 호출.
 * 예전에는 브라우저가 AI 서버를 직접 불렀지만, 사용량 한도와 기록을 위해 백엔드를 거친다.
 * - 한도 초과(429)면 UsageLimitError를 던지고 화면 전체에 알린다.
 * - 성공하면 사용량 표시를 새로 고치게 알린다.
 */
export async function aiFetch(path, { body, projectId, signal, accept } = {}) {
  const query = projectId != null && projectId !== "" ? `?projectId=${encodeURIComponent(projectId)}` : "";
  const res = await fetch(`${API_BASE_URL}/api/v1/ai${path}${query}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(accept ? { Accept: accept } : {}) },
    body: JSON.stringify(body ?? {}),
    signal,
  });
  const limitError = await usageLimitErrorFrom(res);
  if (limitError) throw limitError;
  if (res.ok && !accept) notifyUsageChanged();
  return res;
}

export { notifyUsageChanged };
