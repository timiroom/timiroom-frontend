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
  const res = await apiFetch(`${API_BASE_URL}/api/v1/projects`);
  if (!res || !res.ok) return [];
  const body = await res.json();
  return normalizeProjects(body?.data ?? body);
}

export async function fetchProjectsByTeam(teamId) {
  if (teamId == null) return [];
  const res = await apiFetch(`${API_BASE_URL}/api/v1/projects/team/${teamId}`);
  if (!res || !res.ok) return [];
  const body = await res.json();
  return normalizeProjects(body?.data ?? body);
}

/* ══════════════════════════════════════
   단일 프로젝트 조회
   GET /api/projects/{id}
══════════════════════════════════════ */
export async function fetchProject(id) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/projects/${id}`);
  if (!res || !res.ok) return null;
  const body = await res.json();
  return normalizeProject(body?.data ?? body);
}

/* ══════════════════════════════════════
   프로젝트 생성
   POST /api/v1/projects
══════════════════════════════════════ */
export async function createProject(payload) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/projects`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res || !res.ok) throw new Error(`프로젝트 생성 실패 (HTTP ${res?.status})`);
  const body = await res.json();
  return normalizeProject(body?.data ?? body);
}

/* ══════════════════════════════════════
   프로젝트 수정
   PATCH /api/v1/projects/{id}
══════════════════════════════════════ */
export async function updateProject(id, patch) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  if (!res || !res.ok) throw new Error(`프로젝트 수정 실패 (HTTP ${res?.status})`);
  const body = await res.json();
  return normalizeProject(body?.data ?? body);
}

/* ══════════════════════════════════════
   프로젝트 삭제
   DELETE /api/v1/projects/{id}
══════════════════════════════════════ */
export async function deleteProject(id) {
  await apiFetch(`${API_BASE_URL}/api/v1/projects/${id}`, { method: "DELETE" });
}

/* ══════════════════════════════════════
   응답 정규화
   백엔드 ProjectResponse → 프론트 Project 객체
══════════════════════════════════════ */
function normalizeStatus(s) {
  if (!s) return "draft";
  const upper = String(s).toUpperCase();
  if (upper === "PLANNING")    return "draft";
  if (upper === "IN_PROGRESS") return "active";
  if (upper === "COMPLETED")   return "completed";
  return String(s).toLowerCase();
}

function normalizeProject(raw) {
  return {
    id:               String(raw.projectId  ?? raw.id  ?? ""),
    teamId:           raw.teamId ?? null,
    name:             raw.projectName ?? raw.name ?? "",
    description:      raw.description      ?? "",
    status:           normalizeStatus(raw.status),
    color:            raw.color            ?? "var(--text-1)",
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
    // 파이프라인 결과물
    prdDocument:      raw.prdDocument      ?? null,
    dbSchema:         raw.dbSchema         ?? null,
    apiSpec:          raw.apiSpec          ?? null,
    featureList:      raw.featureList      ?? [],
  };
}

function normalizeProjects(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeProject);
}

/* ══════════════════════════════════════
   프로젝트 멤버 목록
   GET /api/v1/projects/{id}/members
══════════════════════════════════════ */
export async function fetchProjectMembers(projectId) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/projects/${projectId}/members`);
  if (!res || !res.ok) return [];
  const body = await res.json();
  return Array.isArray(body) ? body : (body?.data ?? []);
}

/* ══════════════════════════════════════
   프로젝트 문서 저장
   PATCH /api/v1/projects/{id}/documents/{type}
   문서가 없으면 최신 파이프라인 실행에 새 artifact를 생성한다.
══════════════════════════════════════ */
export async function saveProjectDocument(projectId, type, content) {
  const res = await apiFetch(
    `${API_BASE_URL}/api/v1/projects/${projectId}/documents/${encodeURIComponent(type)}`,
    { method: "PATCH", body: JSON.stringify({ content }) }
  );
  if (!res || !res.ok) {
    let message = "문서 저장에 실패했습니다";
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {}
    throw new Error(`${message} (HTTP ${res?.status ?? "network"})`);
  }
  return res.json();
}

/* ══════════════════════════════════════
   프로젝트 멤버 역할 변경
   PATCH /api/v1/projects/{id}/members/{targetId}
══════════════════════════════════════ */
export async function updateProjectMemberRole(projectId, targetMemberId, role) {
  const res = await apiFetch(
    `${API_BASE_URL}/api/v1/projects/${projectId}/members/${targetMemberId}`,
    { method: "PATCH", body: JSON.stringify({ role }) }
  );
  if (!res || !res.ok) throw new Error(`역할 변경 실패 (HTTP ${res?.status})`);
  return res.json();
}

/* ══════════════════════════════════════
   프로젝트 멤버 제거
   DELETE /api/v1/projects/{id}/members/{targetId}
══════════════════════════════════════ */
export async function removeProjectMember(projectId, targetMemberId) {
  const res = await apiFetch(
    `${API_BASE_URL}/api/v1/projects/${projectId}/members/${targetMemberId}`,
    { method: "DELETE" }
  );
  if (!res || !res.ok) throw new Error(`멤버 제거 실패 (HTTP ${res?.status})`);
}

/* ══════════════════════════════════════
   프로젝트 멤버 추가
   POST /api/v1/projects/{id}/members
══════════════════════════════════════ */
export async function addProjectMember(projectId, memberId, role) {
  const res = await apiFetch(
    `${API_BASE_URL}/api/v1/projects/${projectId}/members`,
    { method: "POST", body: JSON.stringify({ memberId: String(memberId), role }) }
  );
  if (!res || !res.ok) throw new Error(`멤버 추가 실패 (HTTP ${res?.status})`);
  return res.json();
}

/* ══════════════════════════════════════
   프로젝트의 최신 파이프라인 Artifact 조회
   GET /api/v1/pipeline/projects/{projectId}/artifacts
   반환: [{ artifactType, content, ... }, ...]
══════════════════════════════════════ */
export async function fetchProjectArtifacts(projectId) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/pipeline/projects/${projectId}/artifacts`);
  if (!res || !res.ok) return [];
  const body = await res.json();
  return Array.isArray(body) ? body : (body?.data ?? []);
}

/* ══════════════════════════════════════
   Artifact 배열로 project 객체 보강
   artifactType: PRD | DB_SCHEMA | API_SPEC | FEATURE_LIST | MARKET_RESEARCH | QA_REPORT
══════════════════════════════════════ */
export function enrichProjectWithArtifacts(project, artifacts) {
  const map = {};
  const idMap = {};
  artifacts.forEach(a => {
    map[a.artifactType] = a.content;
    idMap[a.artifactType] = a.artifactId;
  });

  const tryParse = (val) => {
    if (val == null) return null;
    if (typeof val === "object") {
      // 빈 객체/배열은 null로 취급 (파이프라인 생성 실패 결과물 방지)
      if (Array.isArray(val)) return val.length > 0 ? val : null;
      return Object.keys(val).length > 0 ? val : null;
    }
    try {
      const parsed = JSON.parse(val);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && Object.keys(parsed).length === 0) return null;
      return parsed;
    } catch { return null; }
  };

  return {
    ...project,
    prdDocument:    tryParse(map["PRD"])              ?? project.prdDocument    ?? null,
    dbSchema:       tryParse(map["DB_SCHEMA"])        ?? project.dbSchema       ?? null,
    apiSpec:        tryParse(map["API_SPEC"])         ?? project.apiSpec        ?? null,
    featureList:    tryParse(map["FEATURE_LIST"])     ?? project.featureList    ?? [],
    marketResearch: tryParse(map["MARKET_RESEARCH"])  ?? project.marketResearch ?? null,
    artifactIds:    idMap,
  };
}
