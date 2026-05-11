"use client";

import { SectionHeader } from "@/components/ui";

const CATEGORIES = [
  { label: "AI & LLM",        type: "ai", tags: ["OpenAI GPT-4o","LangChain","LangGraph4j","Hybrid RAG"] },
  { label: "Data & Graph",    type: "dt", tags: ["Neo4j","pgvector","PostgreSQL","Redis"]                 },
  { label: "Frontend & Viz",  type: "fe", tags: ["Next.js","TypeScript","React Flow","D3.js"]             },
  { label: "Backend & DevOps",type: "be", tags: ["Spring Boot","Kafka","Swagger","Mermaid.js"]            },
];

export function TechStack() {
  return (
    <section className="al-section" id="tech" style={{ background: "var(--bg-light)" }}>
      <div className="al-container">
        <div className="al-tech-2col">
          {/* Left — copy */}
          <div>
            <SectionHeader
              eyebrow="적용 기술"
              title={<>검증된 기술 스택으로<br /><span className="hl">안정적인 성능</span>을 보장합니다</>}
              desc="OpenAI GPT-4o의 강력한 언어 이해와 Neo4j 지식 그래프, Spring Boot 백엔드, Next.js 프론트엔드의 조합으로 엔터프라이즈급 안정성을 제공합니다."
            />
          </div>

          {/* Right — tech grid */}
          <div className="al-tech-grid al-anim slide-r al-d1">
            {CATEGORIES.map((cat) => (
              <div className="al-tech-cat" key={cat.label}>
                <div className="al-tech-cat-lbl">{cat.label}</div>
                <div className="al-tech-tags">
                  {cat.tags.map((tag) => (
                    <span key={tag} className={`al-tag ${cat.type}`}>{tag}</span>
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
