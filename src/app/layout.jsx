import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { UsageProvider } from "@/context/UsageContext";
import { AuthModal }    from "@/components/auth/AuthModal";
import { ConfirmHost } from "@/components/ui/ConfirmHost";

// 휴대폰 노치·홈 표시줄 영역까지 쓰고(안쪽 여백은 safe-area로 띄운다) 확대 없이 기기 폭에 맞춘다.
export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export const metadata = {
  title: "Align-it — 기획과 개발의 정합성, AI로 완성합니다",
  description:
    "LLM과 지식 그래프를 결합한 오케스트레이션 플랫폼. PRD부터 QA 시나리오까지, 멀티 에이전트가 전 주기의 설계 일관성을 실시간으로 검증합니다.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        {/* 본문 폰트 Pretendard. 설치되지 않은 컴퓨터에서도 같은 폰트로 보이도록 웹폰트로 불러온다.
            dynamic-subset은 화면에 나온 글자 묶음만 받는다(CSS 약 21KB, 글꼴 파일은 필요할 때). */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.min.css"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <AuthProvider>
          <ToastProvider>
            <UsageProvider>
            {children}
            {/* 전역 인증 모달 — 어느 페이지에서든 openAuthModal() 호출로 표시 */}
            <AuthModal />
            <ConfirmHost />
            </UsageProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
