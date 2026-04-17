/**
 * useMockProgress
 * ---------------
 * 모크업 진행바 애니메이션용 훅.
 * 지정된 범위(min~max) 사이를 왕복하며 부드럽게 값을 변경합니다.
 *
 * 사용법:
 *   const width = useMockProgress(72, 55, 90);
 *   <div style={{ width: `${width}%` }} />
 *
 * @param {number} initial - 초기값
 * @param {number} min     - 최솟값
 * @param {number} max     - 최댓값
 * @param {number} speed   - 변화 속도 (기본값 0.3)
 * @param {number} interval- setInterval 주기 (ms, 기본값 60)
 */

"use client";

import { useState, useEffect, useRef } from "react";

export function useMockProgress(initial = 72, min = 55, max = 90, speed = 0.3, interval = 60) {
  const [width, setWidth] = useState(initial);
  const growing = useRef(true);

  useEffect(() => {
    const id = setInterval(() => {
      setWidth((w) => {
        if (growing.current) {
          if (w >= max) { growing.current = false; return w - speed; }
          return w + speed;
        } else {
          if (w <= min) { growing.current = true; return w + speed; }
          return w - speed;
        }
      });
    }, interval);
    return () => clearInterval(id);
  }, [min, max, speed, interval]);

  return width;
}
