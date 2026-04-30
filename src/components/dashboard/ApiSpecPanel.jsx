"use client";

/**
 * ApiSpecPanel.jsx
 * ----------------
 * Swagger UI 스타일 API 명세 뷰어.
 * 엔드포인트를 태그별로 그룹핑, 클릭 시 Request/Response 상세 펼침.
 */

import { useState } from "react";
import { AiChatSidebar } from "./AiChatSidebar";

/* ── 색상 토큰 ── */
const C = {
  bg:       "#212121",
  surface:  "#1a1a1a",
  card:     "#252525",
  cardOpen: "#2a2a2a",
  border:   "rgba(255,255,255,0.07)",
  text:     "#ececec",
  muted:    "#8b8b8b",
  sub:      "#555",
  accent:   "#a78bfa",
  code:     "#1e1e1e",
};

/* ── HTTP 메서드 색상 ── */
const METHOD_COLOR = {
  GET:    { bg: "rgba(52,211,153,0.12)",  border: "rgba(52,211,153,0.35)",  text: "#34d399" },
  POST:   { bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.35)",  text: "#60a5fa" },
  PUT:    { bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.35)",  text: "#fbbf24" },
  PATCH:  { bg: "rgba(251,146,60,0.12)",  border: "rgba(251,146,60,0.35)",  text: "#fb923c" },
  DELETE: { bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.35)", text: "#f87171" },
};

/* ══════════════════════════════════════
   더미 API 명세 데이터
══════════════════════════════════════ */
const API_SPEC = {
  title:   "Align-it API",
  version: "v1.0.0",
  baseUrl: "http://localhost:8080",
  tags: [
    {
      name: "Auth",
      description: "소셜 OAuth2 로그인 및 사용자 인증",
      endpoints: [
        {
          id: "get-me",
          method: "GET",
          path: "/api/auth/me",
          summary: "현재 로그인 사용자 정보 조회",
          description: "Authorization 헤더의 JWT를 검증하고 사용자 정보를 반환합니다.",
          auth: true,
          parameters: [],
          requestBody: null,
          responses: [
            {
              status: 200,
              description: "사용자 정보 반환 성공",
              schema: {
                id: "number  // 1",
                name: "string  // \"김민준\"",
                email: "string  // \"user@example.com\"",
                profileImageUrl: "string | null",
                provider: "string  // \"google\"",
                createdAt: "string  // \"2025-03-01T09:00:00\"",
              },
            },
            { status: 401, description: "인증 토큰 없음 또는 만료" },
          ],
        },
        {
          id: "oauth-google",
          method: "GET",
          path: "/oauth2/authorization/google",
          summary: "Google OAuth2 로그인 시작",
          description: "브라우저를 Google 로그인 페이지로 리다이렉트합니다. 인증 완료 후 /auth/callback?token={JWT}로 돌아옵니다.",
          auth: false,
          parameters: [],
          requestBody: null,
          responses: [
            { status: 302, description: "Google OAuth 페이지로 리다이렉트" },
          ],
        },
      ],
    },
    {
      name: "Projects",
      description: "프로젝트 생성, 조회, 수정, 삭제",
      endpoints: [
        {
          id: "list-projects",
          method: "GET",
          path: "/api/projects",
          summary: "내 프로젝트 목록 조회",
          description: "로그인한 사용자가 소유한 프로젝트를 생성일 최신순으로 반환합니다.",
          auth: true,
          parameters: [],
          requestBody: null,
          responses: [
            {
              status: 200,
              description: "프로젝트 목록 반환 성공",
              schema: [
                {
                  id: "number  // 1",
                  name: "string  // \"Align-it MVP\"",
                  description: "string",
                  status: "\"draft\" | \"active\" | \"completed\" | \"archived\"",
                  color: "string  // \"#7C3AED\"",
                  consistencyScore: "number  // 0–100",
                  progress: "number  // 0–100",
                  createdAt: "string  // ISO 8601",
                  updatedAt: "string  // ISO 8601",
                },
              ],
            },
          ],
        },
        {
          id: "get-project",
          method: "GET",
          path: "/api/projects/{id}",
          summary: "단일 프로젝트 조회",
          auth: true,
          parameters: [
            { in: "path", name: "id", type: "number", required: true, description: "프로젝트 ID" },
          ],
          requestBody: null,
          responses: [
            { status: 200, description: "프로젝트 반환 성공", schema: { id: "number", name: "string", "...": "위와 동일" } },
            { status: 404, description: "프로젝트를 찾을 수 없음" },
          ],
        },
        {
          id: "create-project",
          method: "POST",
          path: "/api/projects",
          summary: "프로젝트 생성",
          auth: true,
          parameters: [],
          requestBody: {
            contentType: "application/json",
            schema: {
              name: "string  // required",
              description: "string  // optional",
              status: "\"draft\" | \"active\"  // optional, default: \"draft\"",
              color: "string  // optional, default: \"#7C3AED\"",
            },
          },
          responses: [
            { status: 201, description: "프로젝트 생성 성공", schema: { id: "number", name: "string", "...": "전체 ProjectResponse" } },
            { status: 400, description: "필수 필드 누락" },
          ],
        },
        {
          id: "patch-project",
          method: "PATCH",
          path: "/api/projects/{id}",
          summary: "프로젝트 수정 (Partial Update)",
          description: "전달된 필드만 업데이트합니다. null 필드는 무시됩니다.",
          auth: true,
          parameters: [
            { in: "path", name: "id", type: "number", required: true, description: "프로젝트 ID" },
          ],
          requestBody: {
            contentType: "application/json",
            schema: {
              name: "string  // optional",
              description: "string  // optional",
              status: "string  // optional",
              consistencyScore: "number  // optional, 0–100",
              progress: "number  // optional, 0–100",
            },
          },
          responses: [
            { status: 200, description: "수정된 프로젝트 반환" },
            { status: 404, description: "프로젝트를 찾을 수 없음" },
          ],
        },
        {
          id: "delete-project",
          method: "DELETE",
          path: "/api/projects/{id}",
          summary: "프로젝트 삭제",
          auth: true,
          parameters: [
            { in: "path", name: "id", type: "number", required: true, description: "프로젝트 ID" },
          ],
          requestBody: null,
          responses: [
            { status: 204, description: "삭제 완료 (No Content)" },
            { status: 404, description: "프로젝트를 찾을 수 없음" },
          ],
        },
      ],
    },
    {
      name: "Pipeline",
      description: "멀티 에이전트 파이프라인 실행 및 상태 조회",
      endpoints: [
        {
          id: "run-pipeline",
          method: "POST",
          path: "/api/pipeline/run",
          summary: "파이프라인 실행",
          description: "선택된 에이전트 목록과 프로젝트 컨텍스트로 파이프라인을 시작합니다.",
          auth: true,
          parameters: [],
          requestBody: {
            contentType: "application/json",
            schema: {
              projectId: "number  // required",
              agents: "[\"search\", \"pm\", \"prd\", \"api\", \"db\", \"qa\"]",
              prdContent: "string  // 자연어 PRD 입력",
            },
          },
          responses: [
            {
              status: 202,
              description: "파이프라인 시작됨 (Accepted)",
              schema: { pipelineId: "string  // UUID", status: "\"pending\"", startedAt: "string" },
            },
          ],
        },
        {
          id: "pipeline-status",
          method: "GET",
          path: "/api/pipeline/{pipelineId}/status",
          summary: "파이프라인 실행 상태 조회",
          auth: true,
          parameters: [
            { in: "path", name: "pipelineId", type: "string", required: true, description: "파이프라인 UUID" },
          ],
          requestBody: null,
          responses: [
            {
              status: 200,
              description: "파이프라인 상태 반환",
              schema: {
                pipelineId: "string",
                status: "\"pending\" | \"running\" | \"completed\" | \"failed\"",
                progress: "number  // 0–100",
                currentAgent: "string  // 현재 실행 중인 에이전트",
                steps: "[{ agent, status, startedAt, completedAt }]",
              },
            },
          ],
        },
      ],
    },
    {
      name: "Agent",
      description: "LLM 에이전트 채팅 및 스트리밍",
      endpoints: [
        {
          id: "agent-chat",
          method: "POST",
          path: "/api/agent/chat",
          summary: "LLM 에이전트 일반 응답",
          auth: true,
          parameters: [],
          requestBody: {
            contentType: "application/json",
            headers: {
              "X-LLM-Provider": "\"anthropic\" | \"openai\"",
              "X-LLM-Api-Key": "string  // 사용자 LLM API 키",
              "X-LLM-Model": "string  // 예: \"claude-sonnet-4-6\"",
            },
            schema: {
              messages: "[{ role: \"user\" | \"assistant\", content: string }]",
              systemPrompt: "string",
              projectContext: "object  // optional",
            },
          },
          responses: [
            {
              status: 200,
              description: "LLM 응답 반환",
              schema: { content: "string", usage: "{ inputTokens: number, outputTokens: number }" },
            },
          ],
        },
        {
          id: "agent-stream",
          method: "POST",
          path: "/api/agent/chat/stream",
          summary: "LLM 에이전트 스트리밍 응답 (SSE)",
          description: "text/event-stream 형식으로 토큰 단위 스트리밍 응답을 반환합니다.",
          auth: true,
          parameters: [],
          requestBody: {
            contentType: "application/json",
            schema: {
              messages: "[{ role, content }]",
              systemPrompt: "string",
            },
          },
          responses: [
            {
              status: 200,
              description: "SSE 스트림 응답",
              schema: 'data: {"delta":"토큰"}\n\ndata: [DONE]',
            },
          ],
        },
      ],
    },
  ],
};

/* ══════════════════════════════════════
   엔드포인트 카드
══════════════════════════════════════ */
function EndpointCard({ endpoint }) {
  const [open, setOpen] = useState(false);
  const mc = METHOD_COLOR[endpoint.method] || METHOD_COLOR.GET;

  return (
    <div style={{
      borderRadius: 8,
      border: `1px solid ${open ? "rgba(167,139,250,0.2)" : C.border}`,
      background: open ? C.cardOpen : C.card,
      marginBottom: 6,
      overflow: "hidden",
      transition: "all 0.15s",
    }}>
      {/* 헤더 행 */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 12,
          padding: "12px 16px", background: "none", border: "none",
          cursor: "pointer", textAlign: "left",
        }}
      >
        {/* 메서드 배지 */}
        <span style={{
          fontSize: 11, fontWeight: 800, letterSpacing: "0.04em",
          padding: "3px 8px", borderRadius: 5,
          background: mc.bg, border: `1px solid ${mc.border}`, color: mc.text,
          minWidth: 56, textAlign: "center", flexShrink: 0,
        }}>
          {endpoint.method}
        </span>

        {/* 경로 */}
        <code style={{
          fontSize: 13, fontWeight: 500, color: C.text,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          flex: 1,
        }}>
          {endpoint.path}
        </code>

        {/* 요약 */}
        <span style={{
          fontSize: 12, color: C.muted, flexShrink: 0,
          maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {endpoint.summary}
        </span>

        {/* 인증 필요 배지 */}
        {endpoint.auth && (
          <span style={{
            fontSize: 10, padding: "2px 7px", borderRadius: 4,
            background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)",
            color: "#fbbf24", flexShrink: 0,
          }}>
            🔒 JWT
          </span>
        )}

        {/* 토글 화살표 */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke={C.muted} strokeWidth="2" strokeLinecap="round"
          style={{ flexShrink: 0, transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* 상세 내용 */}
      {open && (
        <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${C.border}` }}>
          {/* 설명 */}
          {endpoint.description && (
            <p style={{ fontSize: 13, color: C.muted, margin: "12px 0 0", lineHeight: 1.6 }}>
              {endpoint.description}
            </p>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 14 }}>
            {/* 왼쪽: Parameters + Request Body */}
            <div>
              {/* Path/Query Parameters */}
              {endpoint.parameters.length > 0 && (
                <Section title="Parameters">
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr>
                        {["이름", "위치", "타입", "필수", "설명"].map(h => (
                          <th key={h} style={{ padding: "5px 8px", textAlign: "left", color: C.sub, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {endpoint.parameters.map(p => (
                        <tr key={p.name}>
                          <td style={{ padding: "6px 8px" }}><code style={{ color: C.accent, fontFamily: "monospace" }}>{p.name}</code></td>
                          <td style={{ padding: "6px 8px", color: C.muted }}>{p.in}</td>
                          <td style={{ padding: "6px 8px", color: "#60a5fa" }}>{p.type}</td>
                          <td style={{ padding: "6px 8px", color: p.required ? "#34d399" : C.sub }}>{p.required ? "✓" : "-"}</td>
                          <td style={{ padding: "6px 8px", color: C.muted }}>{p.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Section>
              )}

              {/* Request Body */}
              {endpoint.requestBody && (
                <Section title={`Request Body — ${endpoint.requestBody.contentType}`} style={{ marginTop: endpoint.parameters.length > 0 ? 12 : 0 }}>
                  {endpoint.requestBody.headers && (
                    <>
                      <div style={{ fontSize: 11, color: C.sub, marginBottom: 4, marginTop: 2 }}>Headers</div>
                      <SchemaBlock data={endpoint.requestBody.headers} />
                    </>
                  )}
                  <div style={{ fontSize: 11, color: C.sub, marginBottom: 4, marginTop: endpoint.requestBody.headers ? 8 : 2 }}>Body</div>
                  <SchemaBlock data={endpoint.requestBody.schema} />
                </Section>
              )}

              {!endpoint.requestBody && endpoint.parameters.length === 0 && (
                <div style={{ fontSize: 12, color: C.sub, padding: "8px 0" }}>파라미터 없음</div>
              )}
            </div>

            {/* 오른쪽: Responses */}
            <div>
              <Section title="Responses">
                {endpoint.responses.map(res => (
                  <div key={res.status} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <StatusBadge status={res.status} />
                      <span style={{ fontSize: 12, color: C.muted }}>{res.description}</span>
                    </div>
                    {res.schema && <SchemaBlock data={res.schema} />}
                  </div>
                ))}
              </Section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 섹션 래퍼 ── */
function Section({ title, children, style }) {
  return (
    <div style={style}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: C.sub,
        letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

/* ── JSON 스키마 블록 ── */
function SchemaBlock({ data }) {
  const text = typeof data === "string"
    ? data
    : JSON.stringify(data, null, 2)
        .replace(/"/g, "")
        .replace(/,$/gm, "");

  return (
    <pre style={{
      margin: 0, padding: "10px 12px",
      background: C.code, borderRadius: 6,
      border: `1px solid ${C.border}`,
      fontSize: 11.5, color: "#c4b5fd",
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      lineHeight: 1.7, overflowX: "auto",
      whiteSpace: "pre-wrap", wordBreak: "break-word",
    }}>
      {text}
    </pre>
  );
}

/* ── HTTP 상태 코드 배지 ── */
function StatusBadge({ status }) {
  const color =
    status < 300 ? "#34d399" :
    status < 400 ? "#fbbf24" :
    status < 500 ? "#fb923c" : "#f87171";

  return (
    <span style={{
      fontSize: 11, fontWeight: 800, padding: "2px 7px", borderRadius: 4,
      background: `${color}18`, border: `1px solid ${color}40`, color,
      fontFamily: "monospace", flexShrink: 0,
    }}>
      {status}
    </span>
  );
}

/* ══════════════════════════════════════
   태그 그룹
══════════════════════════════════════ */
function TagGroup({ tag }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ marginBottom: 24 }}>
      {/* 태그 헤더 */}
      <button
        onClick={() => setCollapsed(v => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          width: "100%", padding: "10px 0", marginBottom: 8,
          background: "none", border: "none", borderBottom: `2px solid ${C.border}`,
          cursor: "pointer", textAlign: "left",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke={C.accent} strokeWidth="2.5" strokeLinecap="round"
          style={{ transition: "transform 0.15s", transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
        <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{tag.name}</span>
        <span style={{ fontSize: 12, color: C.muted }}>{tag.description}</span>
        <span style={{
          marginLeft: "auto", fontSize: 11, color: C.sub,
          padding: "2px 7px", borderRadius: 10,
          background: "rgba(255,255,255,0.05)",
        }}>
          {tag.endpoints.length}
        </span>
      </button>

      {!collapsed && (
        <div>
          {tag.endpoints.map(ep => (
            <EndpointCard key={ep.id} endpoint={ep} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   API SPEC PANEL (exported)
══════════════════════════════════════ */
export function ApiSpecPanel({ project }) {
  const [search, setSearch] = useState("");

  const filteredTags = API_SPEC.tags.map(tag => ({
    ...tag,
    endpoints: tag.endpoints.filter(ep =>
      !search ||
      ep.path.toLowerCase().includes(search.toLowerCase()) ||
      ep.summary.toLowerCase().includes(search.toLowerCase()) ||
      ep.method.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(tag => tag.endpoints.length > 0);

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      height: "100vh", background: C.bg, overflow: "hidden",
      fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
    }}>
      {/* 상단 헤더 */}
      <div style={{
        height: 52, flexShrink: 0,
        borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center",
        padding: "0 28px", justifyContent: "space-between",
        background: C.surface,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {project && (
            <div style={{
              width: 22, height: 22, borderRadius: 6,
              background: `${project.color || "#7C3AED"}22`,
              border: `1px solid ${project.color || "#7C3AED"}44`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 900, color: project.color || "#a78bfa",
            }}>
              {(project.name || "P").charAt(0).toUpperCase()}
            </div>
          )}
          {project && <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{project.name}</span>}
          <span style={{ fontSize: 13, color: C.sub }}>›</span>
          <span style={{
            fontSize: 13, fontWeight: 500, color: "#60a5fa",
            padding: "2px 8px", borderRadius: 6,
            background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.2)",
          }}>
            API 명세서
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            fontSize: 11, color: C.sub, padding: "3px 8px", borderRadius: 5,
            background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`,
            fontFamily: "monospace",
          }}>
            {API_SPEC.baseUrl}
          </span>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 5,
            background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.25)",
            color: C.accent,
          }}>
            {API_SPEC.version}
          </span>
        </div>
      </div>

      {/* 검색 바 */}
      <div style={{
        padding: "12px 28px", borderBottom: `1px solid ${C.border}`,
        background: C.surface,
      }}>
        <div style={{ position: "relative", maxWidth: 420 }}>
          <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.sub }}
               width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="엔드포인트 검색 (경로, 메서드, 요약)"
            style={{
              width: "100%", padding: "8px 12px 8px 32px",
              background: "#2a2a2a", border: `1px solid ${C.border}`,
              borderRadius: 8, fontSize: 13, color: C.text,
              outline: "none", boxSizing: "border-box",
            }}
            onFocus={e => e.target.style.borderColor = "rgba(167,139,250,0.4)"}
            onBlur={e => e.target.style.borderColor = C.border}
          />
        </div>
      </div>

      {/* 엔드포인트 목록 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
        {/* API 제목 */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.text }}>
            {API_SPEC.title}
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: C.muted }}>
            RESTful API · JSON · JWT Bearer Auth
          </p>
        </div>

        {filteredTags.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: C.sub, fontSize: 14 }}>
            검색 결과가 없습니다
          </div>
        ) : (
          filteredTags.map(tag => <TagGroup key={tag.name} tag={tag} />)
        )}
      </div>
    </div>
  );
}
