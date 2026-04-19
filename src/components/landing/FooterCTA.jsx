"use client";

import { Button } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";

export function FooterCTA() {
  const { isLoggedIn, openAuthModal } = useAuth();

  return (
    <div className="al-fcta">
      <div className="al-fcta-blob b1" />
      <div className="al-fcta-blob b2" />
      <div className="al-container al-fcta-inner">
        <div className="al-fcta-big al-anim">
          Get<br /><span className="al-fcta-hl">Aligned</span>
        </div>
        <p className="al-fcta-sub al-anim al-d1">
          기획과 개발의 간극을 제로로. Align-it으로 시작하세요.
        </p>
        <div className="al-fcta-btns al-anim al-d2">
          {isLoggedIn ? (
            <Button variant="white" size="lg" href="/dashboard">대시보드로 이동 →</Button>
          ) : (
            <Button variant="white" size="lg" onClick={openAuthModal}>무료로 시작하기 →</Button>
          )}
          <Button variant="ghost" size="lg" href="https://github.com" target="_blank" rel="noopener noreferrer">
            GitHub에서 보기
          </Button>
        </div>
      </div>
    </div>
  );
}
