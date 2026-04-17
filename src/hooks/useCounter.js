/**
 * useCounter
 * ----------
 * 요소가 뷰포트에 진입할 때 숫자를 0 → target 까지 애니메이션합니다.
 *
 * 사용법:
 *   const [value, ref] = useCounter(80, 1800);
 *   <span ref={ref}>{value}</span>
 *
 * @param {number} target   - 목표 숫자
 * @param {number} duration - 애니메이션 지속 시간 (ms), 기본값 1800
 * @returns {[number, React.RefObject]}
 */

"use client";

import { useState, useEffect, useRef } from "react";

export function useCounter(target, duration = 1800) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const step = target / (duration / 16);
          let current = 0;
          const timer = setInterval(() => {
            current += step;
            if (current >= target) {
              current = target;
              clearInterval(timer);
            }
            setValue(Math.floor(current));
          }, 16);
        }
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target, duration]);

  return [value, ref];
}
