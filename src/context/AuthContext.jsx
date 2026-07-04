"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { AUTH_API, apiFetch } from "@/lib/authConfig";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,          setUser]          = useState(null);
  const [isLoading,     setIsLoading]     = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authReturnTo,  setAuthReturnTo]  = useState(null);

  /** 앱 시작 시: 세션 쿠키로 로그인 상태 복원 */
  useEffect(() => {
    apiFetch(AUTH_API.me)
      .then((res) => (res && res.ok ? res.json() : null))
      .then((data) => { if (data) setUser(data); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  /**
   * OAuth 콜백에서 호출.
   * 백엔드가 이미 세션을 설정했으므로 /auth/me 만 호출.
   */
  const login = useCallback(async () => {
    try {
      const res  = await apiFetch(AUTH_API.me);
      const data = res && res.ok ? await res.json() : null;
      if (data) setUser(data);
    } catch {}
  }, []);

  const logout = useCallback(async () => {
    try { await apiFetch(AUTH_API.logout, { method: "POST" }); } catch {}
    setUser(null);
    window.location.href = "/";
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res  = await apiFetch(AUTH_API.me);
      const data = res && res.ok ? await res.json() : null;
      if (data) setUser(data);
    } catch {}
  }, []);

  const openAuthModal  = useCallback((returnTo = null) => {
    setAuthReturnTo(returnTo || null);
    setAuthModalOpen(true);
  }, []);
  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
    setAuthReturnTo(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isLoggedIn: !!user,
      login,
      logout,
      refreshUser,
      authModalOpen,
      authReturnTo,
      openAuthModal,
      closeAuthModal,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
