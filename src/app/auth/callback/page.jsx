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
import { AUTH_RETURN_TO_KEY, safeAuthReturnTo } from "@/lib/authConfig";
import { ActionButton, LoadingScreen, StatusPage } from "@/components/ui";

// 로그인 앞뒤 화면과 같은 밝은 바탕을 써서, 소셜 로그인 사이에 어두운 화면이 번쩍이지 않게 한다.
function StatusScreen({ type, message }) {
  if (type === "error") {
    return (
      <StatusPage title="로그인하지 못했습니다" message={message}>
        <ActionButton variant="primary" href="/">처음 화면으로</ActionButton>
      </StatusPage>
    );
  }
  return <LoadingScreen title="로그인 중" message={message} />;
}

function CallbackInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { login }    = useAuth();
  const [status, setStatus] = useState({ type: "loading", message: "인증 정보를 확인하는 중입니다..." });

  useEffect(() => {
    const error = searchParams.get("error");

    if (error) {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(AUTH_RETURN_TO_KEY);
      }
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
      const returnTo = typeof window !== "undefined"
        ? window.localStorage.getItem(AUTH_RETURN_TO_KEY)
        : null;
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(AUTH_RETURN_TO_KEY);
      }
      setStatus({ type: "loading", message: "대시보드로 이동 중..." });
      if (safeAuthReturnTo(returnTo)) {
        router.replace(returnTo);
      } else {
        router.replace("/dashboard");
      }
    }).catch(() => {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(AUTH_RETURN_TO_KEY);
      }
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
