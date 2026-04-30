/**
 * projectApi.js
 * -------------
 * Spring Boot + PostgreSQL 백엔드 연동 프로젝트 API 레이어.
 *
 * ┌─ 백엔드 REST Endpoints ─────────────────────────────────────┐
 * │  GET    /api/projects          → 내 프로젝트 목록           │
 * │  GET    /api/projects/{id}     → 단일 프로젝트 조회         │
 * │  POST   /api/projects          → 프로젝트 생성              │
 * │  PATCH  /api/projects/{id}     → 프로젝트 수정              │
 * │  DELETE /api/projects/{id}     → 프로젝트 삭제              │
 * │                                                             │
 * │  인증: Authorization: Bearer {JWT} 헤더 (apiFetch 자동 첨부) │
 * └─────────────────────────────────────────────────────────────┘
 *
 * 백엔드 응답 DTO (ProjectResponse.java):
 *   id, name, description, status, color,
 *   consistencyScore, progress, createdAt, updatedAt
 */

import { API_BASE_URL, apiFetch } from "@/lib/authConfig";

/* ══════════════════════════════════════
   프로젝트 목록 조회
   GET /api/projects
══════════════════════════════════════ */
export async function fetchProjects() {
  const res = await apiFetch(`${API_BASE_URL}/api/projects`);
  if (!res || !res.ok) return [];
  const data = await res.json();
  return normalizeProjects(data);
}

/* ══════════════════════════════════════
   단일 프로젝트 조회
   GET /api/projects/{id}
══════════════════════════════════════ */
export async function fetchProject(id) {
  const res = await apiFetch(`${API_BASE_URL}/api/projects/${id}`);
  if (!res || !res.ok) return null;
  const data = await res.json();
  return normalizeProject(data);
}

/* ══════════════════════════════════════
   프로젝트 생성
   POST /api/projects
══════════════════════════════════════ */
export async function createProject(payload) {
  const res = await apiFetch(`${API_BASE_URL}/api/projects`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res || !res.ok) throw new Error(`프로젝트 생성 실패 (HTTP ${res?.status})`);
  const data = await res.json();
  return normalizeProject(data);
}

/* ══════════════════════════════════════
   프로젝트 수정
   PATCH /api/projects/{id}
══════════════════════════════════════ */
export async function updateProject(id, patch) {
  const res = await apiFetch(`${API_BASE_URL}/api/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  if (!res || !res.ok) throw new Error(`프로젝트 수정 실패 (HTTP ${res?.status})`);
  const data = await res.json();
  return normalizeProject(data);
}

/* ══════════════════════════════════════
   프로젝트 삭제
   DELETE /api/projects/{id}
══════════════════════════════════════ */
export async function deleteProject(id) {
  await apiFetch(`${API_BASE_URL}/api/projects/${id}`, { method: "DELETE" });
}

/* ══════════════════════════════════════
   응답 정규화
   백엔드 ProjectResponse → 프론트 Project 객체
══════════════════════════════════════ */
function normalizeProject(raw) {
  return {
    id:               String(raw.id),
    name:             raw.name             ?? "",
    description:      raw.description      ?? "",
    status:           raw.status           ?? "draft",
    color:            raw.color            ?? "#7C3AED",
    // 백엔드 필드명: consistencyScore → 프론트 score
    score:            raw.consistencyScore ?? raw.score ?? 0,
    consistencyScore: raw.consistencyScore ?? raw.score ?? 0,
    progress:         raw.progress         ?? 0,
    tags:             raw.tags             ?? [],
    members:          raw.members          ?? [],
    lastActivity:     raw.updatedAt        ?? "",
    created:          (raw.createdAt       ?? "").split("T")[0],
    prdCount:         raw.prdCount         ?? 0,
    issueCount:       raw.issueCount       ?? 0,
    specCount:        raw.specCount        ?? 0,
  };
}

function normalizeProjects(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeProject);
}
