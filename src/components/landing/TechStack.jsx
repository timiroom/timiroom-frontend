"use client";

import { SectionHeader } from "@/components/ui";
import { TECH_CATEGORIES, TechLogoMark, useTechLogos } from "./techStackData";

export function TechStack() {
  const logos = useTechLogos();
  return (
    <section className="al-section" id="tech" style={{ background: "var(--bg-light)" }}>
      <div className="al-container">
        <div className="al-tech-2col">
          {/* Left — copy */}
          <div>
            <SectionHeader
              eyebrow="적용 기술"
              title={<>검증된 기술 스택으로<br /><span className="hl">안정적인 성능</span>을 보장합니다</>}
              desc="OpenAI GPT 기반 에이전트에 pgvector 하이브리드 검색과 Cohere 재정렬(RAG), Neo4j 지식 그래프를 더하고, Spring Boot 백엔드와 Next.js 프론트엔드로 묶었습니다."
            />
          </div>

          {/* Right — tech grid */}
          <div className="al-tech-grid al-anim slide-r al-d1">
            {TECH_CATEGORIES.map((cat) => (
              <div className="al-tech-cat" key={cat.label}>
                <div className="al-tech-cat-lbl">{cat.label}</div>
                <div className="al-tech-tags">
                  {cat.items.map((item) => (
                    <span key={item.label} className={`al-tag al-tag--logo ${cat.type}`}>
                      <TechLogoMark item={item} logos={logos} size={13} />
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
