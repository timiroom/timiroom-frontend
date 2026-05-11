"use client";

import { useAuth } from "@/context/AuthContext";

export function FooterCTA() {
  const { isLoggedIn, openAuthModal } = useAuth();

  return (
    <div className="al-get-aligned" id="get-started">
      {/* 배경 라이트 효과 */}
      <div className="al-get-aligned-bg" />

      <div className="al-get-aligned-inner">
        {/* 거대 텍스트 */}
        <div className="al-get-aligned-big al-anim">
          Get<br />Aligned
        </div>

        {/* 서브 타이틀 */}
        <p className="al-get-aligned-sub al-anim al-d1">
          기획과 개발의 간극을 제로로. 지금 바로 시작하세요.
        </p>

        {/* 글래스 CTA 버튼 */}
        <div className="al-anim al-d2">
          {isLoggedIn ? (
            <a href="/dashboard" className="al-pill-glass">
              <span>⚡</span>
              대시보드로 이동
            </a>
          ) : (
            <button className="al-pill-glass" onClick={openAuthModal}>
              <span>⚡</span>
              무료로 시작하기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
