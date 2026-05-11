import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { AuthModal }    from "@/components/auth/AuthModal";

export const metadata = {
  title: "Align-it — 기획과 개발의 정합성, AI로 완성합니다",
  description:
    "LLM과 지식 그래프를 결합한 오케스트레이션 플랫폼. PRD부터 QA 시나리오까지, 멀티 에이전트가 전 주기의 설계 일관성을 실시간으로 검증합니다.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <AuthProvider>
          {children}
          {/* 전역 인증 모달 — 어느 페이지에서든 openAuthModal() 호출로 표시 */}
          <AuthModal />
        </AuthProvider>
      </body>
    </html>
  );
}
