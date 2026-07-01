/**
 * commitApi.js
 * ------------
 * 커밋 히스토리 관련 API 레이어.
 *
 * ┌─ 백엔드 REST Endpoints ─────────────────────────────────────────┐
 * │  GET  /api/v1/commits                → 전체 커밋 목록           │
 * │  GET  /api/v1/projects/{id}/commits  → 프로젝트별 커밋 목록     │
 * │  POST /api/v1/commits                → 커밋 생성                │
 * └────────────────────────────────────────────────────────────────┘
 *
 * 백엔드 응답 DTO 예시:
 *   { id, message, description, projectId, projectName, hash, createdAt }
 */

import { API_BASE_URL, apiFetch } from "@/lib/authConfig";

/* ══════════════════════════════════════
   전체 커밋 목록 조회
   GET /api/v1/commits
══════════════════════════════════════ */
export async function fetchCommits() {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/commits`);
  if (!res || res.status === 404) return [];
  if (!res.ok) throw new Error(`커밋 목록 조회 실패 (HTTP ${res.status})`);
  const body = await res.json();
  return normalizeCommits(body?.data ?? body);
}

/* ══════════════════════════════════════
   프로젝트별 커밋 목록 조회
   GET /api/v1/projects/{projectId}/commits
══════════════════════════════════════ */
export async function fetchCommitsByProject(projectId) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/projects/${projectId}/commits`);
  if (!res || res.status === 404) return [];
  if (!res.ok) throw new Error(`커밋 목록 조회 실패 (HTTP ${res.status})`);
  const body = await res.json();
  return normalizeCommits(body?.data ?? body);
}

/* ══════════════════════════════════════
   커밋 생성
   POST /api/v1/commits
   body: { projectId, message, description }
══════════════════════════════════════ */
export async function createCommit({ projectId, message, description = "" }) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/commits`, {
    method: "POST",
    body: JSON.stringify({ projectId, message, description }),
  });
  if (!res || !res.ok) throw new Error(`커밋 생성 실패 (HTTP ${res?.status})`);
  const body = await res.json();
  return normalizeCommit(body?.data ?? body);
}

/* ══════════════════════════════════════
   응답 정규화
   백엔드 CommitResponse → 프론트 Commit 객체
══════════════════════════════════════ */
function normalizeCommit(raw) {
  return {
    id:          String(raw.id          ?? raw.commitId ?? ""),
    summary:     raw.message            ?? raw.summary  ?? "",
    description: raw.description        ?? "",
    project:     raw.projectName        ?? raw.project  ?? "",
    projectId:   String(raw.projectId   ?? ""),
    hash:        raw.hash               ?? raw.shortHash ?? "",
    time:        formatRelativeTime(raw.createdAt ?? raw.timestamp ?? ""),
    createdAt:   raw.createdAt          ?? "",
  };
}

function normalizeCommits(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeCommit);
}

/* ══════════════════════════════════════
   상대 시간 포맷
   "2025-05-27T15:00:00" → "1시간 전"
══════════════════════════════════════ */
export function formatRelativeTime(isoString) {
  if (!isoString) return "";
  const now   = Date.now();
  const past  = new Date(isoString).getTime();
  const diffMs = now - past;

  const mins  = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days  = Math.floor(diffMs / 86_400_000);

  if (mins  <  1)  return "방금 전";
  if (mins  < 60)  return `${mins}분 전`;
  if (hours <  2)  return "1시간 전";
  if (hours < 24)  return `${hours}시간 전`;
  if (days  ===1)  return "어제";
  if (days  <  7)  return `${days}일 전`;
  return new Date(isoString).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}
