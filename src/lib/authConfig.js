/**
 * authConfig.js
 * -------------
 * 인증 관련 설정 상수 및 유틸리티.
 *
 * Spring Boot (Spring Security OAuth2) 세션 기반 인증:
 *   - 백엔드가 /oauth2/authorization/{provider} 엔드포인트를 제공
 *   - OAuth 완료 후 백엔드가 /auth/callback 으로 리다이렉트 (세션 쿠키 발급)
 *   - 모든 API 요청에 credentials: "include" 로 세션 쿠키 자동 첨부
 */

/** 백엔드 base URL */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

/** rag-pipeline base URL */
export const RAG_PIPELINE_URL =
  process.env.NEXT_PUBLIC_RAG_PIPELINE_URL || "http://localhost:8081";

/** 프론트엔드 URL */
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/** OAuth 로그인 후 돌아올 경로 저장 키 */
export const AUTH_RETURN_TO_KEY = "timiroom.authReturnTo";

/** Spring Security OAuth2 진입점 */
export const OAUTH_ENDPOINTS = {
  google: `${API_BASE_URL}/oauth2/authorization/google`,
  github: `${API_BASE_URL}/oauth2/authorization/github`,
};

/** 백엔드 REST API 경로 */
export const AUTH_API = {
  me:     `${API_BASE_URL}/auth/me`,
  logout: `${API_BASE_URL}/auth/logout`,
};

/** OAuth 공급자 로그인 페이지로 이동 */
export function redirectToOAuth(provider, returnTo = null) {
  const url = OAUTH_ENDPOINTS[provider];
  if (!url) throw new Error(`Unknown OAuth provider: ${provider}`);
  if (typeof window !== "undefined" && returnTo) {
    window.localStorage.setItem(AUTH_RETURN_TO_KEY, returnTo);
  }
  window.location.href = url;
}

/**
 * API 요청 헬퍼 — 세션 쿠키 자동 첨부.
 * FormData는 Content-Type 헤더를 설정하지 않음 (브라우저가 boundary 포함해서 자동 설정).
 */
export async function apiFetch(url, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = isFormData
    ? { ...options.headers }
    : { "Content-Type": "application/json", ...options.headers };

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  if (res.status === 401) {
    const REDIRECT_EXEMPT = ["/", "/auth/callback"];
    const path = typeof window !== "undefined" ? window.location.pathname : "/";
    if (!REDIRECT_EXEMPT.includes(path) && !path.startsWith("/invite/")) {
      window.location.href = "/";
    }
    return null;
  }
  return res;
}
