"use client";

import { useCounter } from "@/hooks";
import { SectionHeader } from "@/components/ui";

const ITEMS = [
  { target: 80,  unit: "%", label: "설계 오류 수정 비용 절감"            },
  { target: 40,  unit: "%", label: "낭비 리소스 절약 (기존 수동 관리)"   },
  { target: 100, unit: "%", label: "E2E 설계 정합성 자동화 커버리지"      },
  { target: 4,   unit: "종",label: "자동 생성 산출물 (API·DB·QA·Swagger)"},
];

function MetricCard({ target, unit, label, delay }) {
  const [val, ref] = useCounter(target);
  return (
    <div className={`al-metric al-anim al-d${delay}`} ref={ref}>
      <div className="al-metric-num">
        {val}
        <span style={{ fontSize: 24, fontWeight: 900 }}>{unit}</span>
      </div>
      <div className="al-metric-lbl">{label}</div>
    </div>
  );
}

export function Metrics() {
  return (
    <section className="al-section" id="metrics" style={{ background: "white" }}>
      <div className="al-container">
        <SectionHeader
          eyebrow="기대 성과"
          title={<>현장에서 인터랙션 가능한<br /><span className="hl">실질적 엔지니어링 혁신</span></>}
          center
        />
        <div className="al-metrics-grid">
          {ITEMS.map((item, i) => (
            <MetricCard key={item.label} {...item} delay={i + 1} />
          ))}
        </div>
      </div>
    </section>
  );
}
