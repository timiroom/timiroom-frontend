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

  /** 앱 시작 시: 세션 확인 → 유저 정보 복원 */
  useEffect(() => {
    // 캐시된 유저 정보 즉시 복원 (UX 개선)
    const cached = localStorage.getItem(USER_KEY);
    if (cached) {
      try { setUser(JSON.parse(cached)); } catch {}
    }

    // 백엔드에서 세션 유효성 및 최신 유저 정보 확인
    apiFetch(AUTH_API.me)
      .then((res) => {
        if (res && res.status === 401) {
          // 세션 없음 - 정상적인 비로그인 상태
          return null;
        }
        return res && res.ok ? res.json() : null;
      })
      .then((data) => {
        if (data) {
          setUser(data);
          localStorage.setItem(USER_KEY, JSON.stringify(data));
        } else {
          setUser(null);
          localStorage.removeItem(USER_KEY);
        }
      })
      .catch(() => {
        // 네트워크 에러 등
      })
      .finally(() => setIsLoading(false));
  }, []);

  /**
   * 로그인 처리
   */
  const login = useCallback(async () => {
    try {
      const res  = await apiFetch(AUTH_API.me);
      if (res && res.ok) {
        const data = await res.json();
        setUser(data);
        localStorage.setItem(USER_KEY, JSON.stringify(data));
      } else {
        setUser(null);
        localStorage.removeItem(USER_KEY);
      }
    } catch {
      setUser(null);
    }
  }, []);

  /** 로그아웃 */
  const logout = useCallback(async () => {
    try {
      await apiFetch(AUTH_API.logout, { method: "POST" });
    } catch {}
    setUser(null);
    localStorage.removeItem(USER_KEY);
    // 로그아웃 후에는 명시적으로 홈으로 리다이렉트
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
