"use client";

/**
 * AuthModal.jsx
 * -------------
 * 로그인 / 회원가입 모달.
 *
 * - Google OAuth, GitHub OAuth 버튼
 * - 버튼 클릭 → redirectToOAuth() → Spring Boot OAuth2 엔드포인트로 이동
 * - 모달 바깥 클릭 또는 ESC 키로 닫기
 */

import { useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { redirectToOAuth } from "@/lib/authConfig";

/* ── OAuth 공급자 정의 ── */
const PROVIDERS = [
  {
    key:      "google",
    label:    "Google로 계속하기",
    subLabel: "Google 계정으로 로그인",
    Icon:     GoogleIcon,
    style: {
      background: "#fff",
      color:      "#1F1F1F",
      border:     "1.5px solid #E5E7EB",
    },
    hoverStyle: { background: "#F9FAFB", borderColor: "#D1D5DB" },
  },
  {
    key:      "github",
    label:    "GitHub로 계속하기",
    subLabel: "GitHub 계정으로 로그인",
    Icon:     GitHubIcon,
    style: {
      background: "#24292F",
      color:      "#fff",
      border:     "1.5px solid #24292F",
    },
    hoverStyle: { background: "#1C2128" },
  },
];

/* ── 아이콘 컴포넌트 ── */
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.6 20-21 0-1.3-.2-2.7-.5-4z" fill="#FFC107"/>
      <path d="M6.3 14.7l7 5.1C15.1 16.1 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3c-7.8 0-14.6 4.5-17.7 11.7z" fill="#FF3D00"/>
      <path d="M24 45c5.5 0 10.5-1.9 14.4-5.1l-6.7-5.5C29.5 35.9 26.9 37 24 37c-6 0-10.6-3.1-11.8-7.5l-7 5.4C8.1 41.1 15.5 45 24 45z" fill="#4CAF50"/>
      <path d="M44.5 20H24v8.5h11.8c-.6 2.7-2.3 4.9-4.5 6.5l6.7 5.5C42.3 37.3 45 31.1 45 24c0-1.3-.2-2.7-.5-4z" fill="#1976D2"/>
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.757-1.333-1.757-1.089-.745.084-.729.084-.729 1.205.084 1.84 1.236 1.84 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.418-1.305.762-1.605-2.665-.3-5.467-1.332-5.467-5.931 0-1.31.469-2.381 1.236-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.301 1.23a11.51 11.51 0 013.003-.404c1.02.005 2.047.138 3.006.404 2.29-1.552 3.297-1.23 3.297-1.23.655 1.653.243 2.873.12 3.176.77.84 1.233 1.911 1.233 3.221 0 4.61-2.807 5.628-5.48 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.898-.015 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
    </svg>
  );
}

/* ── OAuthButton ── */
function OAuthButton({ provider, isLoading, onLoadingChange }) {
  const handleClick = () => {
    onLoadingChange(provider.key);
    redirectToOAuth(provider.key);
    // 리다이렉트 후 페이지가 이동하므로 로딩 해제 불필요
  };

  const loading = isLoading === provider.key;

  return (
    <button
      onClick={handleClick}
      disabled={!!isLoading}
      style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        gap:            12,
        width:          "100%",
        padding:        "13px 20px",
        borderRadius:   12,
        fontSize:       15,
        fontWeight:     600,
        cursor:         isLoading ? "not-allowed" : "pointer",
        transition:     "all 0.18s ease",
        opacity:        isLoading && !loading ? 0.5 : 1,
        ...provider.style,
      }}
      onMouseEnter={(e) => {
        if (!isLoading) Object.assign(e.currentTarget.style, provider.hoverStyle);
      }}
      onMouseLeave={(e) => {
        if (!isLoading) Object.assign(e.currentTarget.style, provider.style);
      }}
    >
      {loading ? (
        <svg
          width="20" height="20" viewBox="0 0 24 24" fill="none"
          style={{ animation: "auth-spin 0.8s linear infinite" }}
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.3"/>
          <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      ) : (
        <provider.Icon />
      )}
      <span>{provider.label}</span>
    </button>
  );
}

/* ── AuthModal (exported) ── */
export function AuthModal() {
  const { authModalOpen, closeAuthModal } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState(null);

  // ESC 키로 닫기
  const handleKeyDown = useCallback(
    (e) => { if (e.key === "Escape") closeAuthModal(); },
    [closeAuthModal]
  );

  useEffect(() => {
    if (authModalOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [authModalOpen, handleKeyDown]);

  if (!authModalOpen) return null;

  return (
    <>
      {/* 스핀 애니메이션 */}
      <style>{`@keyframes auth-spin { to { transform: rotate(360deg); } }`}</style>

      {/* 배경 오버레이 */}
      <div
        onClick={closeAuthModal}
        style={{
          position:   "fixed",
          inset:      0,
          background: "rgba(26,25,22, 0.4)",
          backdropFilter: "blur(6px)",
          zIndex:     9000,
          display:    "flex",
          alignItems: "center",
          justifyContent: "center",
          padding:    "20px",
          animation:  "auth-fade-in 0.15s ease",
        }}
      >
        {/* 모달 패널 */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background:   "#fff",
            borderRadius: 24,
            padding:      "40px 36px 36px",
            width:        "100%",
            maxWidth:     420,
            position:     "relative",
            boxShadow:    "0 32px 80px rgba(26,25,22, 0.1), 0 8px 32px rgba(0,0,0,0.12)",
            animation:    "auth-slide-up 0.2s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          {/* 닫기 버튼 */}
          <button
            onClick={closeAuthModal}
            style={{
              position:   "absolute",
              top:        16,
              right:      16,
              width:      32,
              height:     32,
              borderRadius: "50%",
              border:     "none",
              background: "#F3F4F6",
              cursor:     "pointer",
              display:    "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize:   18,
              color:      "#6B7280",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#E5E7EB")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#F3F4F6")}
          >
            ×
          </button>

          {/* 헤더 */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{
              width:          48,
              height:         48,
              borderRadius:   14,
              background:     "var(--text-1)",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              fontSize:       22,
              fontWeight:     900,
              color:          "#fff",
              margin:         "0 auto 16px",
              boxShadow:      "0 6px 20px rgba(26,25,22, 0.15)",
            }}>
              A
            </div>
            <h2 style={{
              fontSize:   22,
              fontWeight: 800,
              color:      "var(--text-1)",
              marginBottom: 6,
            }}>
              Align-it 시작하기
            </h2>
            <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.5 }}>
              소셜 계정으로 간편하게 로그인하고<br />
              기획·개발 정합성을 AI로 완성하세요.
            </p>
          </div>

          {/* OAuth 버튼들 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {PROVIDERS.map((provider) => (
              <OAuthButton
                key={provider.key}
                provider={provider}
                isLoading={loadingProvider}
                onLoadingChange={setLoadingProvider}
              />
            ))}
          </div>

          {/* 구분선 */}
          <div style={{
            display:    "flex",
            alignItems: "center",
            gap:        12,
            margin:     "20px 0",
          }}>
            <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
            <span style={{ fontSize: 12, color: "#9CA3AF", whiteSpace: "nowrap" }}>
              계속하면 다음에 동의하는 것입니다
            </span>
            <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
          </div>

          {/* 약관 */}
          <p style={{
            textAlign: "center",
            fontSize:  12,
            color:     "#9CA3AF",
            lineHeight: 1.6,
          }}>
            <a href="/terms" style={{ color: "var(--text-2)", textDecoration: "underline" }}>
              이용약관
            </a>{" "}
            및{" "}
            <a href="/privacy" style={{ color: "var(--text-2)", textDecoration: "underline" }}>
              개인정보처리방침
            </a>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes auth-fade-in  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes auth-slide-up {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)     scale(1);    }
        }
      `}</style>
    </>
  );
}

/* useState import 누락 방지 */
import { useState } from "react";
