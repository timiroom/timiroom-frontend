/**
 * teamApi.js
 * ----------
 * 팀 관련 API 레이어.
 *
 * GET  /api/v1/teams       → 내 팀 목록
 * POST /api/v1/teams       → 팀 생성 { teamName, description }
 * POST /api/v1/teams/join  → 초대코드로 팀 참여 { inviteCode }
 * GET  /api/v1/teams/{id}/workspace → 팀 상세 / 멤버 목록
 */

import { API_BASE_URL, apiFetch } from "@/lib/authConfig";

const ACTIVE_TEAM_KEY = "timiroom.activeTeamId";

function normalizeTeamId(team) {
  return team?.teamId ?? team?.id ?? null;
}

function readActiveTeamId() {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(ACTIVE_TEAM_KEY);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function writeActiveTeamId(teamId) {
  if (typeof window === "undefined") return;
  if (teamId == null) {
    window.localStorage.removeItem(ACTIVE_TEAM_KEY);
  } else {
    window.localStorage.setItem(ACTIVE_TEAM_KEY, String(teamId));
  }
}

export async function getMyTeams() {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/teams`);
  if (!res || !res.ok) return [];
  return res.json();
}

export async function fetchTeamInvitePreview(inviteCode) {
  const trimmed = (inviteCode || "").trim();
  const res = await fetch(`${API_BASE_URL}/api/v1/teams/invite/${encodeURIComponent(trimmed)}`, {
    credentials: "include",
  });

  if (!res || !res.ok) {
    let message = "초대 정보를 불러오지 못했습니다";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {}
    throw new Error(message);
  }

  return res.json();
}

export async function createTeam(teamName, description = "") {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/teams`, {
    method: "POST",
    body: JSON.stringify({ teamName, description }),
  });
  if (!res || !res.ok) {
    let message = "팀 생성 실패";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {}
    throw new Error(message);
  }
  const data = await res.json();
  writeActiveTeamId(normalizeTeamId(data));
  return data;
}

export async function joinTeamByInviteCode(inviteCode) {
  const trimmed = (inviteCode || "").trim();
  const res = await apiFetch(`${API_BASE_URL}/api/v1/teams/join`, {
    method: "POST",
    body: JSON.stringify({ inviteCode: trimmed }),
  });
  if (!res || !res.ok) {
    let message = "팀 참여 실패";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {}
    throw new Error(message);
  }
  const data = await res.json();
  if (data?.teamId != null) {
    writeActiveTeamId(data.teamId);
  }
  return data;
}

export async function getTeamWorkspace(teamId) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/teams/${teamId}/workspace`);
  if (!res || !res.ok) {
    let message = "워크스페이스 정보를 불러오지 못했습니다";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {}
    throw new Error(message);
  }
  return res.json();
}

export async function updateTeam(teamId, payload) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/teams/${teamId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  if (!res || !res.ok) {
    let message = "팀 정보 수정 실패";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {}
    throw new Error(message);
  }
  return res.json();
}

export async function regenerateTeamInviteCode(teamId) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/teams/${teamId}/invite-code`, {
    method: "PATCH",
  });
  if (!res || !res.ok) {
    let message = "초대 코드 재발급 실패";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {}
    throw new Error(message);
  }
  return res.json();
}

export async function transferTeamOwnership(teamId, memberId) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/teams/${teamId}/owner`, {
    method: "PATCH",
    body: JSON.stringify({ memberId: String(memberId) }),
  });
  if (!res || !res.ok) {
    let message = "소유자 권한 이전 실패";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {}
    throw new Error(message);
  }
  return res.json();
}

export async function updateTeamMemberRole(teamId, memberId, role) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/teams/${teamId}/members/${memberId}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
  if (!res || !res.ok) {
    let message = "역할 변경 실패";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {}
    throw new Error(message);
  }
  return res.json();
}

export async function removeTeamMember(teamId, memberId) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/teams/${teamId}/members/${memberId}`, {
    method: "DELETE",
  });
  if (!res || !res.ok) {
    let message = "멤버 제거 실패";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {}
    throw new Error(message);
  }
  return true;
}

export async function leaveTeam(teamId) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/teams/${teamId}/leave`, {
    method: "POST",
  });
  if (!res || !res.ok) {
    let message = "워크스페이스에서 나가기 실패";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {}
    throw new Error(message);
  }
  return true;
}

export async function deleteTeam(teamId) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/teams/${teamId}`, {
    method: "DELETE",
  });
  if (!res || !res.ok) {
    let message = "워크스페이스 삭제 실패";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {}
    throw new Error(message);
  }
  return true;
}

export function getActiveTeamId() {
  return readActiveTeamId();
}

export function setActiveTeamId(teamId) {
  writeActiveTeamId(teamId);
}

export async function uploadWorkspaceIcon(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "workspace-icons");
  const res = await apiFetch(`${API_BASE_URL}/api/v1/storage/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res || !res.ok) {
    let message = "아이콘 업로드 실패";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {}
    throw new Error(message);
  }
  const data = await res.json();
  return data.url;
}

export async function updateTeamIcon(teamId, iconUrl) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/teams/${teamId}/icon`, {
    method: "PATCH",
    body: JSON.stringify({ iconUrl }),
  });
  if (!res || !res.ok) {
    let message = "아이콘 저장 실패";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {}
    throw new Error(message);
  }
  return res.json();
}

export function getPreferredTeam(teams) {
  const activeId = readActiveTeamId();
  if (activeId != null) {
    const activeTeam = teams.find((team) => normalizeTeamId(team) === activeId);
    if (activeTeam) return activeTeam;
  }

  const fallback = teams[0] ?? null;
  if (fallback) {
    writeActiveTeamId(normalizeTeamId(fallback));
  }
  return fallback;
}

/** 팀이 없으면 기본 팀을 생성해 반환 */
export async function getOrCreateDefaultTeam() {
  const teams = await getMyTeams();
  const preferred = getPreferredTeam(teams);
  if (preferred) return preferred;
  return createTeam("내 팀");
}

/** 프로필 이미지 업로드 — POST /auth/me/avatar */
export async function uploadUserAvatar(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiFetch(`${API_BASE_URL}/auth/me/avatar`, {
    method: "POST",
    body: formData,
  });
  if (!res || !res.ok) {
    let message = "프로필 이미지 업로드 실패";
    try { const data = await res.json(); if (data?.error) message = data.error; } catch {}
    throw new Error(message);
  }
  return res.json();
}

/** 이름 수정 — PATCH /auth/me */
export async function updateMemberName(name) {
  const res = await apiFetch(`${API_BASE_URL}/auth/me`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
  if (!res || !res.ok) {
    let message = "이름 저장 실패";
    try { const data = await res.json(); if (data?.error) message = data.error; } catch {}
    throw new Error(message);
  }
  return res.json();
}

/** GitHub 사용자명 수정 — Issue 담당자 자동 지정에 사용 */
export async function updateMemberGithubLogin(githubLogin) {
  const res = await apiFetch(`${API_BASE_URL}/auth/me`, {
    method: "PATCH",
    body: JSON.stringify({ githubLogin }),
  });
  if (!res || !res.ok) {
    let message = "GitHub 계정 저장 실패";
    try { const data = await res.json(); if (data?.error) message = data.error; } catch {}
    throw new Error(message);
  }
  return res.json();
}
