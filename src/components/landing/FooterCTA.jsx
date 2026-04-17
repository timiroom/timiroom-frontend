"use client";

import { Button } from "@/components/ui";

export function FooterCTA() {
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
          <Button variant="white" size="lg" href="#">무료로 시작하기 →</Button>
          <Button variant="ghost" size="lg" href="#">GitHub에서 보기</Button>
        </div>
      </div>
    </div>
  );
}
