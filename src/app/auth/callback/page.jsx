"use client";

/**
 * /auth/callback
 * ---------------
 * Spring Boot OAuth2 로그인 완료 후 리다이렉트되는 페이지.
 *
 * 백엔드 리다이렉트 형식:
 *   http://localhost:3000/auth/callback?token={jwt}&error={message}
 *
 * Spring Security 설정 예시 (application.yml):
 *   spring.security.oauth2.client.registration.google.redirect-uri:
 *     "{baseUrl}/login/oauth2/code/{registrationId}"
 *
 * 그리고 AuthenticationSuccessHandler 에서:
 *   response.sendRedirect(frontendUrl + "/auth/callback?token=" + jwtToken);
 *
 * NOTE: useSearchParams() requires a Suspense boundary in Next.js 14.
 *       CallbackInner 는 Suspense 내부에서만 렌더링됩니다.
 */

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/* ── 상태 표시 컴포넌트 ── */
function StatusScreen({ type, message }) {
  const isError = type === "error";
  return (
    <div style={{
      minHeight:      "100vh",
      display:        "flex",
      flexDirection:  "column",
      alignItems:     "center",
      justifyContent: "center",
      gap:            16,
      background:     "#F5F3FF",
      fontFamily:     "'Pretendard', 'Noto Sans KR', sans-serif",
    }}>
      <div style={{
        width:          64,
        height:         64,
        borderRadius:   18,
        background:     isError
          ? "linear-gradient(135deg,#EF4444,#DC2626)"
          : "linear-gradient(135deg,#6B5CE7,#8B5CF6)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        fontSize:       28,
        boxShadow:      isError
          ? "0 8px 24px rgba(239,68,68,0.3)"
          : "0 8px 24px rgba(107,92,231,0.35)",
        animation:      isError ? "none" : "cb-pulse 1.5s ease infinite",
      }}>
        {isError ? "✕" : "✦"}
      </div>
      <div style={{ textAlign: "center" }}>
        <p style={{
          fontSize:   18,
          fontWeight: 700,
          color:      isError ? "#EF4444" : "#1E1B4B",
          marginBottom: 6,
        }}>
          {isError ? "로그인 실패" : "로그인 중..."}
        </p>
        <p style={{ fontSize: 14, color: "#6B7280" }}>{message}</p>
      </div>

      {isError && (
        <a
          href="/"
          style={{
            marginTop:   8,
            padding:     "10px 24px",
            background:  "linear-gradient(135deg,#6B5CE7,#8B5CF6)",
            color:       "#fff",
            borderRadius: 10,
            fontWeight:  700,
            fontSize:    14,
            textDecoration: "none",
          }}
        >
          홈으로 돌아가기
        </a>
      )}

      <style>{`
        @keyframes cb-pulse {
          0%,100% { transform: scale(1);    opacity: 1;   }
          50%      { transform: scale(1.06); opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}

/* ── 콜백 내부 컴포넌트 (useSearchParams 사용 → Suspense 필수) ── */
function CallbackInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { login }    = useAuth();
  const [status, setStatus] = useState({ type: "loading", message: "인증 정보를 확인하는 중입니다..." });

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error) {
      const messages = {
        access_denied:      "로그인이 취소되었습니다.",
        email_not_verified: "이메일 인증이 완료되지 않은 계정입니다.",
        server_error:       "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      };
      setStatus({
        type:    "error",
        message: messages[error] || `오류가 발생했습니다: ${error}`,
      });
      return;
    }

    if (!token) {
      setStatus({
        type:    "error",
        message: "인증 토큰을 받지 못했습니다. 다시 로그인해주세요.",
      });
      return;
    }

    // 토큰 저장 + 유저 정보 조회
    login(token).then(() => {
      setStatus({ type: "loading", message: "대시보드로 이동 중..." });
      router.replace("/dashboard");
    });
  }, [searchParams, login, router]);

  return <StatusScreen {...status} />;
}

/* ── 콜백 페이지 (Suspense 래핑) ── */
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <StatusScreen type="loading" message="인증 정보를 확인하는 중입니다..." />
    }>
      <CallbackInner />
    </Suspense>
  );
}
