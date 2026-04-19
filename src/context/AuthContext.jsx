"use client";

/**
 * AuthContext.jsx
 * ---------------
 * 전역 인증 상태 관리.
 *
 * 제공 값:
 *   user        — { id, name, email, avatarUrl, provider } | null
 *   isLoading   — 초기 토큰 검증 중 여부
 *   isLoggedIn  — user !== null
 *   login(token)  — JWT 저장 → /api/auth/me 호출 → user 세팅
 *   logout()      — 토큰·유저 삭제 → 홈으로 이동
 *   openAuthModal / closeAuthModal — 로그인 모달 제어
 *   authModalOpen
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  saveToken,
  getToken,
  removeToken,
  USER_KEY,
  AUTH_API,
  apiFetch,
} from "@/lib/authConfig";

/* ── Context 생성 ── */
const AuthContext = createContext(null);

/* ── Provider ── */
export function AuthProvider({ children }) {
  const [user,          setUser]          = useState(null);
  const [isLoading,     setIsLoading]     = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  /** 앱 시작 시: localStorage 토큰 확인 → 유저 정보 복원 */
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    // 캐시된 유저 정보 즉시 복원 (UX 개선)
    const cached = localStorage.getItem(USER_KEY);
    if (cached) {
      try { setUser(JSON.parse(cached)); } catch {}
    }
    // 백엔드에서 최신 유저 정보 재검증
    apiFetch(AUTH_API.me)
      .then((res) => res && res.ok ? res.json() : null)
      .then((data) => {
        if (data) {
          setUser(data);
          localStorage.setItem(USER_KEY, JSON.stringify(data));
        } else {
          removeToken();
          setUser(null);
        }
      })
      .catch(() => {
        // 네트워크 에러 시 캐시 유저 유지 (오프라인 대응)
      })
      .finally(() => setIsLoading(false));
  }, []);

  /**
   * OAuth 콜백에서 호출.
   * token: 백엔드가 전달한 JWT
   */
  const login = useCallback(async (token) => {
    saveToken(token);
    try {
      const res  = await apiFetch(AUTH_API.me);
      const data = res && res.ok ? await res.json() : null;
      if (data) {
        setUser(data);
        localStorage.setItem(USER_KEY, JSON.stringify(data));
      }
    } catch {
      // /me 실패해도 토큰은 저장된 상태 — 다음 요청에서 재시도
    }
  }, []);

  /** 로그아웃 */
  const logout = useCallback(async () => {
    try {
      await apiFetch(AUTH_API.logout, { method: "POST" });
    } catch {}
    removeToken();
    setUser(null);
    window.location.href = "/";
  }, []);

  const openAuthModal  = useCallback(() => setAuthModalOpen(true),  []);
  const closeAuthModal = useCallback(() => setAuthModalOpen(false), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isLoggedIn: !!user,
        login,
        logout,
        authModalOpen,
        openAuthModal,
        closeAuthModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ── 커스텀 훅 ── */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
