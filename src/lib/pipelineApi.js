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

// POST /api/v1/pipeline/restart/{pipelineId}
// 백엔드 PipelineController에 /restart 엔드포인트 추가 필요
export async function restartPipeline(pipelineId) {
  const res = await apiFetch(
    `${API_BASE_URL}/api/v1/pipeline/restart/${pipelineId}`,
    { method: "POST" }
  );
  if (!res || !res.ok) throw new Error(`파이프라인 재시작 실패 (HTTP ${res?.status})`);
  return res.json(); // { executionId, pipelineId }
}
