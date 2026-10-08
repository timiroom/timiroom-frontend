import { API_BASE_URL, apiFetch } from "@/lib/authConfig";

const messages = {
  ACCESS_DENIED: "현재 계정에 권한이 없거나 연결이 해제되었습니다.",
  SPEC_CONFLICT: "문서 기준이 변경되었습니다. 최신 기준으로 다시 요청해 주세요.",
  ARTIFACT_REVIEW_REQUIRED: "이 변경안의 문서 교차검증을 먼저 통과해야 합니다.",
  SPEC_NOT_PUBLISHED: "PM이 명세 기준을 발행한 뒤 이용할 수 있습니다.",
  SLACK_REQUEST_CONFLICT: "연결 코드가 만료되었거나 기존 연결과 충돌합니다. 새 코드를 확인해 주세요.",
  CONCURRENCY_LIMIT: "진행 중인 작업이 끝난 뒤 다시 요청해 주세요.",
  RATE_LIMITED: "요청이 많습니다. 잠시 후 다시 시도해 주세요.",
};

export async function integrationRequest(path, { method = "GET", body } = {}) {
  const headers = {};
  if (!["GET", "HEAD"].includes(method)) {
    const csrf = await apiFetch(`${API_BASE_URL}/api/v1/integrations/csrf`);
    if (!csrf?.ok) throw new Error("연결을 확인하지 못했습니다. 다시 로그인해 주세요.");
    const token = await csrf.json();
    headers[token.headerName] = token.token;
  }
  const response = await apiFetch(`${API_BASE_URL}${path}`, { method, headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  if (!response?.ok) {
    let code;
    try { code = (await response?.json())?.code; } catch { /* Safe user-facing fallback. */ }
    const error = new Error(messages[code] || (response?.status === 404 ? "이 서버에서 연결 기능을 사용할 수 없습니다." : "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요."));
    error.code = code; throw error;
  }
  return response.status === 204 ? null : response.json();
}

export const connections = () => integrationRequest("/api/v1/integrations/connections");
export const revokeConnection = (id) => integrationRequest(`/api/v1/integrations/connections/${encodeURIComponent(id)}`, { method: "DELETE" });
export const slackConnection = () => integrationRequest("/api/v1/integrations/slack");
export const linkSlack = (code) => integrationRequest("/api/v1/integrations/slack/link", { method: "POST", body: { code } });
export const unlinkSlack = () => integrationRequest("/api/v1/integrations/slack/link", { method: "DELETE" });
export const configureSlackChannel = (projectId, channelId) => integrationRequest("/api/v1/integrations/slack/channels", { method: "POST", body: { projectId, channelId } });
export const removeSlackChannel = (projectId) => integrationRequest(`/api/v1/integrations/slack/channels/${projectId}`, { method: "DELETE" });

const projectPath = (id) => `/api/v1/projects/${id}`;
export const latestSnapshot = (project) => integrationRequest(`${projectPath(project)}/spec-snapshots/latest`);
export const publishSnapshot = (project) => integrationRequest(`${projectPath(project)}/spec-snapshots`, { method: "POST" });
export const specChange = (project, id) => integrationRequest(`${projectPath(project)}/spec-changes/${id}`);
export const proposeManualChange = (project, input) => integrationRequest(`${projectPath(project)}/spec-changes`, { method: "POST", body: input });
export const approveChange = (project, id, revision) => integrationRequest(`${projectPath(project)}/spec-changes/${id}/approve`, { method: "POST", body: { revision } });
export const rejectChange = (project, id, revision) => integrationRequest(`${projectPath(project)}/spec-changes/${id}/reject`, { method: "POST", body: { revision } });
export const reviewChange = (project, id, revision, idempotencyKey) => integrationRequest(`${projectPath(project)}/spec-changes/${id}/review`, { method: "POST", body: { revision, idempotencyKey } });
export const integrationJob = (project, id) => integrationRequest(`${projectPath(project)}/spec-changes/jobs/${id}`);
