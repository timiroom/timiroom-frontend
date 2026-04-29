/**
 * projectApi.js
 * -------------
 * Spring Boot + MySQL 백엔드 연동 프로젝트 API 레이어.
 *
 * ┌─ 백엔드 구현 가이드 (Spring Boot + MySQL) ──────────────────┐
 * │                                                             │
 * │  [application.yml]                                          │
 * │  spring:                                                    │
 * │    datasource:                                              │
 * │      url: jdbc:mysql://localhost:3306/alignit               │
 * │      username: ${DB_USER}                                   │
 * │      password: ${DB_PASS}                                   │
 * │      driver-class-name: com.mysql.cj.jdbc.Driver            │
 * │    jpa:                                                     │
 * │      hibernate.ddl-auto: update                             │
 * │      show-sql: true                                         │
 * │                                                             │
 * │  [Project Entity — JPA]                                     │
 * │  @Entity @Table(name = "projects")                          │
 * │  public class Project {                                     │
 * │    @Id @GeneratedValue(strategy = IDENTITY)                 │
 * │    private Long id;                                         │
 * │    private String name;                                     │
 * │    private String description;                              │
 * │    private String status;       // draft | active | done    │
 * │    private Integer score;                                   │
 * │    private Integer progress;                                │
 * │    private String color;                                    │
 * │    @ElementCollection                                       │
 * │    private List<String> tags;                               │
 * │    private LocalDateTime createdAt;                         │
 * │    private LocalDateTime updatedAt;                         │
 * │    @ManyToOne User owner;                                   │
 * │  }                                                          │
 * │                                                             │
 * │  [REST Endpoints]                                           │
 * │  GET    /api/projects          → 내 프로젝트 목록           │
 * │  GET    /api/projects/{id}     → 단일 프로젝트 조회         │
 * │  POST   /api/projects          → 프로젝트 생성 (미래)       │
 * │  PATCH  /api/projects/{id}     → 프로젝트 수정              │
 * │  DELETE /api/projects/{id}     → 프로젝트 삭제              │
 * └─────────────────────────────────────────────────────────────┘
 */

import { apiFetch } from "@/lib/authConfig";

/* ══════════════════════════════════════
   프로젝트 목록 조회
   GET /api/projects
══════════════════════════════════════ */
/**
 * @returns {Promise<Project[]>}
 *
 * 응답 예시:
 * [
 *   {
 *     "id": 1,
 *     "name": "Align-it",
 *     "description": "정합성 검증 플랫폼",
 *     "status": "active",
 *     "score": 82,
 *     "progress": 60,
 *     "color": "#7C3AED",
 *     "tags": ["Next.js", "Spring Boot", "MySQL"],
 *     "createdAt": "2025-03-01T09:00:00"
 *   }
 * ]
 */
export async function fetchProjects() {
  const data = await apiFetch("/api/projects");
  return normalizeProjects(data);
}

/* ══════════════════════════════════════
   단일 프로젝트 조회
   GET /api/projects/{id}
══════════════════════════════════════ */
export async function fetchProject(id) {
  const data = await apiFetch(`/api/projects/${id}`);
  return normalizeProject(data);
}

/* ══════════════════════════════════════
   프로젝트 수정
   PATCH /api/projects/{id}
══════════════════════════════════════ */
export async function updateProject(id, patch) {
  const data = await apiFetch(`/api/projects/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return normalizeProject(data);
}

/* ══════════════════════════════════════
   프로젝트 삭제
   DELETE /api/projects/{id}
══════════════════════════════════════ */
export async function deleteProject(id) {
  await apiFetch(`/api/projects/${id}`, { method: "DELETE" });
}

/* ══════════════════════════════════════
   응답 정규화 (백엔드 snake_case → 프론트 camelCase)
══════════════════════════════════════ */
function normalizeProject(raw) {
  return {
    id:           String(raw.id),
    name:         raw.name          ?? "",
    description:  raw.description   ?? "",
    status:       raw.status        ?? "draft",
    score:        raw.score         ?? 0,
    progress:     raw.progress      ?? 0,
    color:        raw.color         ?? "#7C3AED",
    tags:         raw.tags          ?? [],
    members:      raw.members       ?? [],
    lastActivity: raw.lastActivity  ?? raw.updatedAt ?? "",
    created:      (raw.createdAt ?? "").split("T")[0],
    prdCount:     raw.prdCount      ?? 0,
    issueCount:   raw.issueCount    ?? 0,
    specCount:    raw.specCount     ?? 0,
  };
}

function normalizeProjects(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeProject);
}
