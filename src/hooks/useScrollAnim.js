/**
 * useScrollAnim
 * -------------
 * .al-anim 클래스를 가진 요소들을 Intersection Observer로 감지하여
 * 뷰포트에 들어오면 .visible 클래스를 추가합니다.
 *
 * 사용법:
 *   useScrollAnim();  // 컴포넌트 최상단에서 한 번만 호출
 *
 * CSS에서 .al-anim, .al-anim.visible 을 함께 정의하세요.
 */

"use client";

import { useEffect } from "react";

export function useScrollAnim() {
  useEffect(() => {
    const els = document.querySelectorAll(".al-anim");
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => e.isIntersecting && e.target.classList.add("visible")),
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}
