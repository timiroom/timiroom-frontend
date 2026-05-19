"use client";

/**
 * /auth/callback
 * ---------------
 * Spring Boot OAuth2 완료 후 리다이렉트되는 페이지.
 * 백엔드가 세션 쿠키를 이미 설정한 상태로 리다이렉트하므로
 * 토큰 처리 없이 /auth/me 만 호출해서 유저 정보를 가져온다.
 */

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

function StatusScreen({ type, message }) {
  const isError = type === "error";
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 16,
      background: "#0d0d0d", fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 18,
        background: isError
          ? "linear-gradient(135deg,#EF4444,#DC2626)"
          : "linear-gradient(135deg,#6B5CE7,#8B5CF6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 28,
        boxShadow: isError
          ? "0 8px 24px rgba(239,68,68,0.3)"
          : "0 8px 24px rgba(107,92,231,0.35)",
        animation: isError ? "none" : "cb-pulse 1.5s ease infinite",
      }}>
        {isError ? "✕" : "✦"}
      </div>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 18, fontWeight: 700, color: isError ? "#EF4444" : "#fff", marginBottom: 6 }}>
          {isError ? "로그인 실패" : "로그인 중..."}
        </p>
        <p style={{ fontSize: 14, color: "#6B7280" }}>{message}</p>
      </div>
      {isError && (
        <a href="/" style={{
          marginTop: 8, padding: "10px 24px",
          background: "linear-gradient(135deg,#6B5CE7,#8B5CF6)",
          color: "#fff", borderRadius: 10, fontWeight: 700, fontSize: 14,
          textDecoration: "none",
        }}>
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

function CallbackInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { login }    = useAuth();
  const [status, setStatus] = useState({ type: "loading", message: "인증 정보를 확인하는 중입니다..." });

  useEffect(() => {
    const error = searchParams.get("error");

    if (error) {
      const messages = {
        access_denied:      "로그인이 취소되었습니다.",
        email_not_verified: "이메일 인증이 완료되지 않은 계정입니다.",
        server_error:       "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      };
      setStatus({ type: "error", message: messages[error] || `오류: ${error}` });
      return;
    }

    // 백엔드가 세션을 이미 설정했으므로 /auth/me 호출
    login().then(() => {
      setStatus({ type: "loading", message: "대시보드로 이동 중..." });
      router.replace("/dashboard");
    }).catch(() => {
      setStatus({ type: "error", message: "로그인 정보를 확인하지 못했습니다." });
    });
  }, [searchParams, login, router]);

  return <StatusScreen {...status} />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<StatusScreen type="loading" message="인증 정보를 확인하는 중입니다..." />}>
      <CallbackInner />
    </Suspense>
  );
}
