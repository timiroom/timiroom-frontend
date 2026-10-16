"use client";

import { useState } from "react";

/**
 * 30일 추이 막대 그래프(라이브러리 없이 SVG). series: [{ key, label, tone }]
 * tone "primary"는 진한 색, "muted"는 연한 색. 막대에 마우스를 올리면 그날 값이 아래에 보인다.
 */
export function TrendChart({ data, series, format = (v) => v.toLocaleString("ko-KR") }) {
  const [hover, setHover] = useState(null);
  const width = 720;
  const height = 180;
  const pad = { top: 12, right: 8, bottom: 22, left: 8 };
  const max = Math.max(1, ...data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0)));
  const slot = (width - pad.left - pad.right) / data.length;
  const barW = Math.max(2, (slot - 4) / series.length);
  const y = (v) => pad.top + (height - pad.top - pad.bottom) * (1 - v / max);
  const active = hover != null ? data[hover] : data[data.length - 1];

  return (
    <div className="adm-chart">
      <div className="adm-chart__legend">
        {series.map((s) => (
          <span key={s.key} className="adm-chart__key">
            <i className={`adm-chart__dot adm-chart__dot--${s.tone}`} />{s.label}
            <strong>{format(Number(active?.[s.key]) || 0)}</strong>
          </span>
        ))}
        <span className="adm-chart__date">{active?.date}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="adm-chart__svg" role="img"
        aria-label={`최근 ${data.length}일 ${series.map((s) => s.label).join(", ")}`} onMouseLeave={() => setHover(null)}>
        <line x1={pad.left} x2={width - pad.right} y1={height - pad.bottom} y2={height - pad.bottom} className="adm-chart__axis" />
        {data.map((d, i) => {
          const x0 = pad.left + i * slot + 2;
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)}>
              <rect x={pad.left + i * slot} y={pad.top} width={slot} height={height - pad.top - pad.bottom}
                className={`adm-chart__hit${hover === i ? " is-hover" : ""}`} />
              {series.map((s, j) => {
                const v = Number(d[s.key]) || 0;
                const top = y(v);
                return (
                  <rect key={s.key} x={x0 + j * barW} y={top} width={barW - 1} height={Math.max(0, height - pad.bottom - top)}
                    rx="1.5" className={`adm-chart__bar adm-chart__bar--${s.tone}`} />
                );
              })}
              {(i === 0 || i === data.length - 1 || (i % 7 === 0 && data.length - 1 - i > 3)) && (
                <text x={pad.left + i * slot + slot / 2} y={height - 6} textAnchor="middle" className="adm-chart__label">
                  {d.date.slice(5).replace("-", ".")}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
