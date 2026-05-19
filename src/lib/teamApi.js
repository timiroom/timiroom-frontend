/**
 * teamApi.js
 * ----------
 * 팀 관련 API 레이어.
 *
 * GET  /api/v1/teams       → 내 팀 목록
 * POST /api/v1/teams       → 팀 생성 { teamName, description }
 */

import { API_BASE_URL, apiFetch } from "@/lib/authConfig";

export async function getMyTeams() {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/teams`);
  if (!res || !res.ok) return [];
  return res.json();
}

export async function createTeam(teamName, description = "") {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/teams`, {
    method: "POST",
    body: JSON.stringify({ teamName, description }),
  });
  if (!res || !res.ok) throw new Error("팀 생성 실패");
  return res.json();
}

/** 팀이 없으면 기본 팀을 생성해 반환 */
export async function getOrCreateDefaultTeam() {
  const teams = await getMyTeams();
  if (teams.length > 0) return teams[0];
  return createTeam("내 팀");
}
