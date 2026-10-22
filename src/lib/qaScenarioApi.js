import { API_BASE_URL, apiFetch } from "@/lib/authConfig";
import { aiErrorFromResponse } from "@/lib/aiErrors.mjs";

async function errorFromResponse(res, fallback) {
  let message = fallback;
  try {
    const body = await res.json();
    if (body?.error) message = body.error;
  } catch {}
  return new Error(message);
}

/** AI를 부르는 요청(생성·실행)은 이유 코드와 함께 화면용 오류로 바꾼다 */
async function aiError(res) {
  if (!res) return new Error("로그인이 만료되었습니다. 다시 로그인해 주세요.");
  return aiErrorFromResponse(res);
}

export async function fetchQaScenarios(projectId) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/projects/${projectId}/qa-scenarios`);
  if (!res?.ok) throw await errorFromResponse(res, "QA 시나리오를 불러오지 못했습니다");
  const body = await res.json();
  return Array.isArray(body) ? body : [];
}

export async function createQaScenario(projectId, payload) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/projects/${projectId}/qa-scenarios`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res?.ok) throw await errorFromResponse(res, "시나리오 추가에 실패했습니다");
  return res.json();
}

/** AI가 지정한 기능의 시나리오를 생성한다. 실행하는 데 시간이 걸릴 수 있다. */
export async function generateQaScenarios(projectId, featureName) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/projects/${projectId}/qa-scenarios/generate`, {
    method: "POST",
    body: JSON.stringify({ featureName }),
  });
  if (!res?.ok) throw await aiError(res);
  return res.json();
}

/** 시나리오가 현재 명세·코드를 근거로 통과할지 AI가 판단한다. 실제 코드를 실행하지는 않는다. */
export async function runQaScenario(projectId, scenarioId) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/projects/${projectId}/qa-scenarios/${scenarioId}/run`, {
    method: "POST",
  });
  if (!res?.ok) throw await aiError(res);
  return res.json();
}

export async function deleteQaScenario(projectId, scenarioId) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/projects/${projectId}/qa-scenarios/${scenarioId}`, {
    method: "DELETE",
  });
  if (!res?.ok) throw await errorFromResponse(res, "시나리오 삭제에 실패했습니다");
}
