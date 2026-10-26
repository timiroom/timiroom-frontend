/**
 * pipelineApi.js
 * --------------
 * 요구사항 & 파이프라인 API 레이어.
 *
 * POST /api/v1/requirements                          → 요구사항 생성
 * POST /api/v1/pipeline/start/{requirementId}        → 파이프라인 시작
 * GET  /api/v1/pipeline/progress/{pipelineId}        → SSE 진행 스트림
 * GET  /api/v1/pipeline/executions/{id}/artifacts    → 결과 아티팩트
 */

import { API_BASE_URL, apiFetch } from "@/lib/authConfig";

export async function createRequirement(projectId, title, content) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/requirements`, {
    method: "POST",
    body: JSON.stringify({ projectId, title, content }),
  });
  if (!res || !res.ok) throw new Error(`요구사항 생성 실패 (HTTP ${res?.status})`);
  return res.json();
}

/**
 * 파이프라인 시작
 * @param {number} requirementId
 * @param {File[]} files - Step3 에서 업로드한 파일 배열 (선택)
 * @returns {{ executionId: number, pipelineId: string }}
 */
export async function startPipeline(requirementId, files = []) {
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));

  const res = await apiFetch(
    `${API_BASE_URL}/api/v1/pipeline/start/${requirementId}`,
    { method: "POST", body: formData }
  );
  if (!res || !res.ok) throw new Error(`파이프라인 시작 실패 (HTTP ${res?.status})`);
  return res.json();
}

/**
 * SSE 진행 상황 구독
 * @returns {() => void} cleanup 함수
 */
export function subscribePipelineProgress(pipelineId, { onProgress, onComplete, onError } = {}) {
  const url = `${API_BASE_URL}/api/v1/pipeline/progress/${pipelineId}`;
  const es = new EventSource(url, { withCredentials: true });

  es.addEventListener("progress", (e) => onProgress?.(e.data));
  es.addEventListener("complete", (e) => {
    onComplete?.(e.data);
    es.close();
  });
  es.addEventListener("error", (e) => {
    onError?.(e.data || "파이프라인 오류");
    es.close();
  });
  es.onerror = () => {
    onError?.("SSE 연결 오류");
    es.close();
  };

  return () => es.close();
}

/**
 * 파이프라인 재시작
 * POST /api/v1/pipeline/restart/{pipelineId}
 * @returns {{ pipelineId: string }}
 */
export async function restartPipeline(pipelineId) {
  const res = await apiFetch(
    `${API_BASE_URL}/api/v1/pipeline/restart/${pipelineId}`,
    { method: "POST" }
  );
  if (!res || !res.ok) {
    const body = await res?.json().catch(() => ({}));
    throw new Error(body?.message || body?.error || `다시 시작하지 못했습니다 (HTTP ${res?.status})`);
  }
  return res.json(); // { pipelineId }
}

/**
 * 내 진행 중인 생성. 새로고침하거나 다시 들어와도 진행 화면을 이어 보이게 한다.
 * GET /api/v1/pipeline/active → { runs: [{ pipelineId, projectId, startedAt }] }
 */
export async function fetchActiveRuns() {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/pipeline/active`);
  if (!res || !res.ok) return [];
  const body = await res.json().catch(() => ({}));
  return Array.isArray(body?.runs) ? body.runs : [];
}

export async function getArtifacts(executionId) {
  const res = await apiFetch(
    `${API_BASE_URL}/api/v1/pipeline/executions/${executionId}/artifacts`
  );
  if (!res || !res.ok) return [];
  return res.json();
}

/**
 * Artifact 내용 수정
 * PATCH /api/v1/pipeline/artifacts/{artifactId}
 */
export async function updateArtifact(artifactId, content) {
  const res = await apiFetch(
    `${API_BASE_URL}/api/v1/pipeline/artifacts/${artifactId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ content }),
    }
  );
  if (!res || !res.ok) throw new Error(`Artifact 저장 실패 (HTTP ${res?.status})`);
}


