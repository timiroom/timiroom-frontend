"use client";

const CHIPS = [
  "🤖 OpenAI GPT-4o", "🦜 LangChain",   "🗺️ LangGraph4j", "🕸️ Neo4j",
  "🐘 PostgreSQL",     "⚡ pgvector",     "📊 React Flow",   "⚙️ Spring Boot",
  "📝 Swagger",        "🔱 Mermaid.js",  "🧮 D3.js",        "🎯 TypeScript",
];

export function TrustSection() {
  // 무한 스크롤을 위해 2배 복제
  const doubled = [...CHIPS, ...CHIPS];

  return (
    <div className="al-trust">
      <div className="al-container">
        <p className="al-trust-lbl">사용된 핵심 기술 스택</p>
      </div>
      <div className="al-logo-wrap">
        <div className="al-logo-track">
          {doubled.map((chip, i) => (
            <div className="al-tech-chip" key={i}>{chip}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
