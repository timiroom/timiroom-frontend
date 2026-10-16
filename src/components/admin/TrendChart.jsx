"use client";

import { useState } from "react";

/**
 * 추이 막대 그래프(라이브러리 없이 SVG). series: [{ key, label, tone }]
 * tone "primary"는 진한 색, "muted"는 연한 색. 막대에 마우스를 올리면 그 시점 값이 위에 보인다.
 */
export function TrendChart({
  data, series, format = (v) => v.toLocaleString("ko-KR"), labelEvery = 7,
  labelFormat = (d) => d.slice(5).replace("-", "."),
}) {
  const [hover, setHover] = useState(null);
  const width = 720;
  const height = 190;
  const pad = { top: 10, right: 4, bottom: 22, left: 4 };
  const rawMax = Math.max(0, ...data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0)));
  const max = niceMax(rawMax);
  const plotH = height - pad.top - pad.bottom;
  const slot = (width - pad.left - pad.right) / data.length;
  const groupW = Math.max(3, slot * 0.62);
  const barW = groupW / series.length;
  const y = (v) => pad.top + plotH * (1 - v / max);
  const active = hover != null ? data[hover] : data[data.length - 1];
  const grid = [0.5, 1];

  return (
    <div className="adm-chart">
      <div className="adm-chart__legend">
        {series.map((s) => (
          <span key={s.key} className="adm-chart__key">
            <i className={`adm-chart__dot adm-chart__dot--${s.tone}`} />{s.label}
            <strong>{format(Number(active?.[s.key]) || 0)}</strong>
          </span>
        ))}
        <span className="adm-chart__date">{active?.date}{hover == null ? " (최근)" : ""}</span>
      </div>
      <div className="adm-chart__plot">
        <div className="adm-chart__ticks" aria-hidden="true">
          {grid.map((g) => <span key={g} style={{ top: `${((pad.top + plotH * (1 - g)) / height) * 100}%` }}>{format(max * g)}</span>)}
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} className="adm-chart__svg" preserveAspectRatio="none" role="img"
          aria-label={`${series.map((s) => s.label).join(", ")} 추이`} onMouseLeave={() => setHover(null)}>
          {grid.map((g) => (
            <line key={g} x1={pad.left} x2={width - pad.right} y1={y(max * g)} y2={y(max * g)} className="adm-chart__grid" />
          ))}
          <line x1={pad.left} x2={width - pad.right} y1={height - pad.bottom} y2={height - pad.bottom} className="adm-chart__axis" />
          {data.map((d, i) => {
            const x0 = pad.left + i * slot + (slot - groupW) / 2;
            return (
              <g key={d.date} onMouseEnter={() => setHover(i)}>
                <rect x={pad.left + i * slot} y={pad.top} width={slot} height={plotH}
                  className={`adm-chart__hit${hover === i ? " is-hover" : ""}`} />
                {series.map((s, j) => {
                  const v = Number(d[s.key]) || 0;
                  const h = Math.max(v > 0 ? 1.5 : 0, height - pad.bottom - y(v));
                  return (
                    <rect key={s.key} x={x0 + j * barW} y={height - pad.bottom - h} width={Math.max(1, barW - 1)} height={h}
                      rx="2" className={`adm-chart__bar adm-chart__bar--${s.tone}${hover === i ? " is-hover" : ""}`} />
                  );
                })}
              </g>
            );
          })}
        </svg>
        <div className="adm-chart__labels" aria-hidden="true">
          {data.map((d, i) => ((i === 0 || i === data.length - 1 || (i % labelEvery === 0 && data.length - 1 - i > labelEvery / 2))
            ? <span key={d.date} style={{ left: `${((pad.left + i * slot + slot / 2) / width) * 100}%` }}>{labelFormat(d.date)}</span>
            : null))}
        </div>
      </div>
    </div>
  );
}

/** 눈금이 깔끔하게 떨어지는 최대값(1, 2, 5 × 10^n) */
function niceMax(value) {
  if (value <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(value));
  const f = value / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nice * exp;
}
