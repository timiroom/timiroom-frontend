"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui";
import { isLightColor } from "@/lib/techStack.mjs";

/**
 * 메인 페이지에 보이는 기술 목록. 상단 흐르는 칩(TrustSection)과 적용 기술 섹션(TechStack)이
 * 같은 목록을 쓴다 — 두 곳을 따로 두었다가 실제와 다른 기술이 섞인 적이 있다.
 * 실제로 쓰는 기술만 둔다(2026-10 기준 backend build.gradle, pipeline requirements.txt,
 * frontend package.json에서 확인). slug는 techLogos.mjs 로고, 없으면 icon(선 아이콘).
 */
export const TECH_CATEGORIES = [
  { label: "AI & LLM", type: "ai", items: [
    { label: "GPT-5.4 mini",  slug: "openai" },
    { label: "LangGraph",     icon: "graph" },
    { label: "Upstage Solar", icon: "zap" },
    { label: "Cohere Rerank", icon: "list" },
  ] },
  { label: "Data & Graph", type: "dt", items: [
    { label: "PostgreSQL", slug: "postgresql" },
    { label: "pgvector",   icon: "database" },
    { label: "Neo4j",      slug: "neo4j" },
    { label: "Redis",      slug: "redis" },
  ] },
  { label: "Backend & Pipeline", type: "be", items: [
    { label: "Spring Boot", slug: "springboot" },
    { label: "FastAPI",     slug: "fastapi" },
    { label: "Kafka",       slug: "apachekafka" },
    { label: "Swagger",     slug: "swagger" },
  ] },
  { label: "Frontend & DevOps", type: "fe", items: [
    { label: "Next.js", slug: "nextdotjs" },
    { label: "React",   slug: "react" },
    { label: "Docker",  slug: "docker" },
    { label: "k3s",     slug: "k3s" },
  ] },
];

export const TECH_ITEMS = TECH_CATEGORIES.flatMap((cat) => cat.items);

/** 로고 데이터(약 50KB)는 첫 화면을 그린 뒤 따로 받는다. 받기 전에는 null. */
export function useTechLogos() {
  const [logos, setLogos] = useState(null);
  useEffect(() => {
    let alive = true;
    import("@/lib/techLogos.mjs").then((m) => { if (alive) setLogos(m.TECH_LOGOS); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return logos;
}

/** 기술 로고. 흰 바탕에서 안 보이는 밝은 브랜드색은 글자색으로 바꾼다. 불러오는 동안은 자리만 둔다. */
export function TechLogoMark({ item, logos, size = 16 }) {
  if (item.icon) return <Icon name={item.icon} size={size} strokeWidth={1.8} style={{ color: "var(--text-3)", flexShrink: 0 }} />;
  const logo = logos?.[item.slug];
  const box = { width: size, height: size, flexShrink: 0, display: "block" };
  if (!logo) return <span style={box} aria-hidden="true" />;
  return (
    <svg style={box} viewBox="0 0 24 24" fill={isLightColor(logo.hex) ? "var(--text-1)" : logo.hex} aria-hidden="true">
      <path d={logo.path} />
    </svg>
  );
}
