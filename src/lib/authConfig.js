/**
 * authConfig.js
 * -------------
 * 인증 관련 설정 상수 및 유틸리티.
 *
 * Spring Boot (Spring Security OAuth2) 연동 기준:
 *   - 백엔드가 /oauth2/authorization/{provider} 엔드포인트를 제공
 *   - OAuth 완료 후 백엔드가 /auth/callback?token={jwt} 로 리다이렉트
 *   - JWT는 Authorization: Bearer {token} 헤더로 모든 API 요청에 포함
 */

/** 백엔드 base URL — .env.local 의 NEXT_PUBLIC_API_BASE_URL 사용 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

/** 프론트엔드 URL — OAuth 콜백 리다이렉트 주소 계산에 사용 */
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/** Spring Security OAuth2 진입점 */
export const OAUTH_ENDPOINTS = {
  google: `${API_BASE_URL}/oauth2/authorization/google`,
  github: `${API_BASE_URL}/oauth2/authorization/github`,
};

/** 백엔드 REST API 경로 */
export const AUTH_API = {
  /** 현재 로그인 유저 정보 조회 (GET, Authorization 헤더 필요) */
  me:     `${API_BASE_URL}/api/auth/me`,
  /** 로그아웃 (POST, Authorization 헤더 필요) */
  logout: `${API_BASE_URL}/api/auth/logout`,
};

/** localStorage 키 */
export const TOKEN_KEY = "align_access_token";
export const USER_KEY  = "align_user";

/** ── 토큰 유틸 ── */
export function saveToken(token) {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function removeToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

/** ── API 요청 헬퍼 (JWT 자동 첨부) ── */
export async function apiFetch(url, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    // 토큰 만료 → 강제 로그아웃
    removeToken();
    window.location.href = "/";
    return null;
  }
  return res;
}

/**
 * OAuth 로그인 진입점.
 * 현재 경로를 state 파라미터에 인코딩해서 백엔드로 전달하면,
 * 백엔드가 로그인 후 해당 경로로 돌아올 수 있습니다.
 * (백엔드 구현에 따라 state 파라미터 처리 방식이 다를 수 있음)
 */
export function redirectToOAuth(provider) {
  const endpoint = OAUTH_ENDPOINTS[provider];
  if (!endpoint) throw new Error(`Unknown provider: ${provider}`);

  // 콜백 URL을 redirect_uri로 백엔드에 전달 (Spring Security 설정에 따라 조정)
  const callbackUrl = `${APP_URL}/auth/callback`;
  const url = `${endpoint}?redirect_uri=${encodeURIComponent(callbackUrl)}`;
  window.location.href = url;
}
