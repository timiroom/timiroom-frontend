import { API_BASE_URL, apiFetch } from "@/lib/authConfig";

async function errorFromResponse(res, fallback) {
  let message = fallback;
  try {
    const body = await res.json();
    if (body?.error) message = body.error;
  } catch {}
  return new Error(`${message} (HTTP ${res?.status ?? "network"})`);
}

/** GitHub App을 조직/계정에 새로 설치하는 페이지로 이동시키는 URL. 설치 후 App 설정의 콜백으로 돌아온다. */
export const GITHUB_APP_INSTALL_URL = "https://github.com/apps/timiroom/installations/new";

export async function fetchTeamGithubInstallations(teamId) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/teams/${teamId}/github/installations`);
  if (!res?.ok) throw await errorFromResponse(res, "연결된 GitHub 설치를 불러오지 못했습니다");
  const body = await res.json();
  return Array.isArray(body) ? body : [];
}

export async function fetchUnassignedGithubInstallations(teamId) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/teams/${teamId}/github/installations/unassigned`);
  if (!res?.ok) throw await errorFromResponse(res, "미연결 GitHub 설치를 불러오지 못했습니다");
  const body = await res.json();
  return Array.isArray(body) ? body : [];
}

/** GitHub에서 설치 목록을 동기화하고 { connected, unassigned }를 함께 받는다. */
export async function syncTeamGithubInstallations(teamId) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/teams/${teamId}/github/installations/sync`, { method: "POST" });
  if (!res?.ok) throw await errorFromResponse(res, "GitHub 설치 목록 동기화에 실패했습니다");
  const body = await res.json();
  return {
    connected: Array.isArray(body?.connected) ? body.connected : [],
    unassigned: Array.isArray(body?.unassigned) ? body.unassigned : [],
  };
}

export async function linkTeamGithubInstallation(teamId, installationId) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/teams/${teamId}/github/installations/${installationId}/link`, {
    method: "POST",
  });
  if (!res?.ok) throw await errorFromResponse(res, "GitHub 설치 연결에 실패했습니다");
  return res.json();
}

export async function unlinkTeamGithubInstallation(teamId, installationId) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/teams/${teamId}/github/installations/${installationId}`, {
    method: "DELETE",
  });
  if (!res?.ok) throw await errorFromResponse(res, "GitHub 설치 연결 해제에 실패했습니다");
}

export async function fetchInstallationRepositories(teamId, installationId) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/teams/${teamId}/github/installations/${installationId}/repos`);
  if (!res?.ok) throw await errorFromResponse(res, "설치 레포 목록을 불러오지 못했습니다");
  const body = await res.json();
  return Array.isArray(body) ? body : [];
}

export async function fetchProjectRepositories(projectId) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/projects/${projectId}/repos`);
  if (!res?.ok) throw await errorFromResponse(res, "연결된 레포를 불러오지 못했습니다");
  const body = await res.json();
  return Array.isArray(body) ? body : [];
}

export async function linkProjectRepository(projectId, payload) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/projects/${projectId}/repos`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res?.ok) throw await errorFromResponse(res, "레포 연결에 실패했습니다");
  return res.json();
}

export async function unlinkProjectRepository(projectId, repoId) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/projects/${projectId}/repos/${repoId}`, {
    method: "DELETE",
  });
  if (!res?.ok) throw await errorFromResponse(res, "레포 연결 해제에 실패했습니다");
}

export async function fetchRepositoryBranches(projectId, repoId) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/projects/${projectId}/repos/${repoId}/branches`);
  if (!res?.ok) throw await errorFromResponse(res, "브랜치 목록을 불러오지 못했습니다");
  const body = await res.json();
  return Array.isArray(body) ? body : [];
}

export async function fetchRepositoryCommits(projectId, repoId, branch) {
  const query = new URLSearchParams({ branch });
  const res = await apiFetch(`${API_BASE_URL}/api/v1/projects/${projectId}/repos/${repoId}/commits?${query}`);
  if (!res?.ok) throw await errorFromResponse(res, "커밋 히스토리를 불러오지 못했습니다");
  const body = await res.json();
  return Array.isArray(body) ? body : [];
}

export async function fetchProjectIssues(projectId) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/projects/${projectId}/issues`);
  if (!res?.ok) throw await errorFromResponse(res, "이슈 목록을 불러오지 못했습니다");
  const body = await res.json();
  return Array.isArray(body) ? body : [];
}

export async function createProjectIssue(projectId, payload) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/projects/${projectId}/issues`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res?.ok) throw await errorFromResponse(res, "이슈 생성에 실패했습니다");
  return res.json();
}

export async function updateProjectIssue(projectId, repoId, issueNumber, payload) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/projects/${projectId}/issues/${repoId}/${issueNumber}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  if (!res?.ok) throw await errorFromResponse(res, "이슈 동기화에 실패했습니다");
  return res.json();
}

export async function fetchProjectPullRequests(projectId) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/projects/${projectId}/pulls`);
  if (!res?.ok) throw await errorFromResponse(res, "PR 목록을 불러오지 못했습니다");
  const body = await res.json();
  return Array.isArray(body) ? body : [];
}

export async function checkPullRequestConsistency(projectId, repoId, pullNumber) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/projects/${projectId}/pulls/${repoId}/${pullNumber}/check`, {
    method: "POST",
  });
  if (!res?.ok) throw await errorFromResponse(res, "PR 정합성 검사에 실패했습니다");
  return res.json();
}

/** 프로젝트에서 가장 최근에 검사된 PR의 정합성 요약. 검사 이력이 없으면 null. */
export async function fetchLatestConsistencySummary(projectId) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/projects/${projectId}/pulls/consistency/latest`);
  if (res?.status === 204) return null;
  if (!res?.ok) throw await errorFromResponse(res, "정합성 검사 결과를 불러오지 못했습니다");
  return res.json();
}
