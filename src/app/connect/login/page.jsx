"use client";

import { OAUTH_ENDPOINTS } from "@/lib/authConfig";
import { GoogleIcon, GitHubIcon } from "@/components/auth/AuthModal";
import { ConnectShell } from "@/components/connect/ConnectShell";

/**
 * AI 도구 연결 중 티미룸 로그인이 필요할 때 오는 화면.
 * 버튼은 API 서버의 소셜 로그인으로 가고, 로그인이 끝나면 API 서버가 저장해 둔 승인 요청으로 이어 준다.
 */
export default function ConnectLoginPage() {
  return (
    <ConnectShell title="AI 도구 연결을 위해 로그인" description="티미룸에서 쓰는 계정으로 로그인해 주세요. 로그인한 뒤 연결할 프로젝트와 허용할 기능을 고릅니다.">
      <div className="connect-providers">
        <a className="connect-btn connect-provider" href={OAUTH_ENDPOINTS.google}><GoogleIcon /> Google로 계속하기</a>
        <a className="connect-btn connect-provider" href={OAUTH_ENDPOINTS.github}><GitHubIcon /> GitHub로 계속하기</a>
      </div>
      <p className="connect-hint">비밀번호나 토큰은 이 화면에 입력하지 않습니다.</p>
    </ConnectShell>
  );
}
