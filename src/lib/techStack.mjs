/**
 * PRD 기술 스택 표시용 해석.
 *
 * AI는 techStack 값을 "Node.js (NestJS)를 사용하여 …" 같은 문장으로 쓴다.
 * 화면에는 문장에 나온 기술을 로고로 보여 주고, 설명은 짧게 줄인다.
 * 로고 데이터는 techLogos.mjs(생성 파일, 약 50KB)에 있다. 기술 스택 화면을 열 때만
 * 불러오도록 여기서는 import하지 않고 slug로만 가리킨다.
 */
import { TECH_LABELS } from "./prdMarkdown.mjs";

/**
 * 문장에서 찾을 기술 목록. slug는 simple-icons 이름이고, 로고가 없으면 null이다.
 * 패턴끼리 겹치면(React ⊂ React Native) 더 긴 매치가 이긴다 — 패턴마다 예외를 두지 않는다.
 * iOS·Android는 기술 선택이 아니라 플랫폼 언급이라 넣지 않는다.
 */
export const TECH_REGISTRY = [
  // 백엔드·언어
  { name: "Node.js", slug: "nodedotjs", pattern: /node\.?js|\bnode\b/i },
  { name: "NestJS", slug: "nestjs", pattern: /nest\.?js/i },
  { name: "Express", slug: "express", pattern: /\bexpress(?:\.?js)?\b/i },
  { name: "Fastify", slug: "fastify", pattern: /fastify/i },
  { name: "Spring", slug: "spring", pattern: /\bspring\b/i },
  { name: "Spring Boot", slug: "springboot", pattern: /spring\s*boot/i },
  { name: "Django", slug: "django", pattern: /django/i },
  { name: "Flask", slug: "flask", pattern: /\bflask\b/i },
  { name: "FastAPI", slug: "fastapi", pattern: /fast\s*api/i },
  { name: "Ruby on Rails", slug: "rubyonrails", pattern: /(?:ruby\s+on\s+)?\brails\b/i },
  { name: "Laravel", slug: "laravel", pattern: /laravel/i },
  { name: "Go", slug: "go", pattern: /\bGo(?:lang)?\b|\bgolang\b/ },
  { name: "Java", slug: "openjdk", pattern: /\bjava\b/i },
  { name: "Kotlin", slug: "kotlin", pattern: /kotlin/i },
  { name: "Python", slug: "python", pattern: /python/i },
  { name: "PHP", slug: "php", pattern: /\bphp\b/i },
  { name: ".NET", slug: "dotnet", pattern: /(?:asp)?\.net\b/i },
  { name: "Rust", slug: "rust", pattern: /\brust\b/i },
  { name: "GraphQL", slug: "graphql", pattern: /graphql/i },
  { name: "TypeScript", slug: "typescript", pattern: /typescript/i },
  { name: "JavaScript", slug: "javascript", pattern: /javascript/i },
  { name: "Deno", slug: "deno", pattern: /\bdeno\b/i },
  // 프론트엔드·모바일
  { name: "React", slug: "react", pattern: /\breact(?:\.?js)?\b/i },
  { name: "React Native", slug: "react", pattern: /react\s*native/i },
  { name: "Next.js", slug: "nextdotjs", pattern: /next\.?js/i },
  { name: "Vue.js", slug: "vuedotjs", pattern: /\bvue(?:\.?js)?\b/i },
  { name: "Nuxt", slug: "nuxtdotjs", pattern: /\bnuxt(?:\.?js)?\b/i },
  { name: "Angular", slug: "angular", pattern: /angular/i },
  { name: "Svelte", slug: "svelte", pattern: /svelte(?:kit)?/i },
  { name: "Flutter", slug: "flutter", pattern: /flutter/i },
  { name: "Swift", slug: "swift", pattern: /\bswift(?:ui)?\b/i },
  { name: "Tailwind CSS", slug: "tailwindcss", pattern: /tailwind(?:\s*css)?/i },
  { name: "Redux", slug: "redux", pattern: /redux/i },
  { name: "Vite", slug: "vite", pattern: /\bvite\b/i },
  { name: "Expo", slug: "expo", pattern: /\bexpo\b/i },
  // 데이터베이스·저장소
  { name: "PostgreSQL", slug: "postgresql", pattern: /postgre(?:sql|s)?/i },
  { name: "MySQL", slug: "mysql", pattern: /mysql/i },
  { name: "MongoDB", slug: "mongodb", pattern: /mongo(?:db)?/i },
  { name: "Redis", slug: "redis", pattern: /redis/i },
  { name: "SQLite", slug: "sqlite", pattern: /sqlite/i },
  { name: "MariaDB", slug: "mariadb", pattern: /maria\s*db/i },
  { name: "Oracle", slug: "oracle", pattern: /\boracle\b/i },
  { name: "Cassandra", slug: "apachecassandra", pattern: /cassandra/i },
  { name: "DynamoDB", slug: "amazondynamodb", pattern: /dynamo\s*db/i },
  { name: "Amazon RDS", slug: "amazonrds", pattern: /(?:amazon\s*|aws\s*)?\brds\b/i },
  { name: "ElastiCache", slug: "amazonelasticache", pattern: /(?:amazon\s*|aws\s*)?elasti\s*cache/i },
  { name: "Amazon S3", slug: "amazons3", pattern: /(?:amazon\s*|aws\s*)?\bs3\b/i },
  { name: "Elasticsearch", slug: "elasticsearch", pattern: /elastic\s*search/i },
  { name: "Supabase", slug: "supabase", pattern: /supabase/i },
  { name: "Firebase", slug: "firebase", pattern: /firebase|firestore/i },
  { name: "Neo4j", slug: "neo4j", pattern: /neo4j/i },
  { name: "Prisma", slug: "prisma", pattern: /\bprisma\b/i },
  { name: "Memcached", slug: null, pattern: /memcache[d]?/i },
  // 메시지 큐
  { name: "Kafka", slug: "apachekafka", pattern: /(?:apache\s*)?kafka/i },
  { name: "RabbitMQ", slug: "rabbitmq", pattern: /rabbit\s*mq/i },
  { name: "NATS", slug: "natsdotio", pattern: /\bnats\b/i },
  { name: "Amazon SQS", slug: "amazonsqs", pattern: /(?:amazon\s*|aws\s*)?\bsqs\b/i },
  { name: "Celery", slug: "celery", pattern: /celery/i },
  // 클라우드·인프라·CDN
  { name: "AWS", slug: "amazonwebservices", pattern: /\baws\b|amazon\s+web\s+services/i },
  { name: "AWS CloudFront", slug: "amazonwebservices", pattern: /(?:aws\s*|amazon\s*)?cloud\s*front/i },
  { name: "AWS Lambda", slug: "awslambda", pattern: /(?:aws\s*)?\blambda\b/i },
  { name: "Amazon EC2", slug: "amazonec2", pattern: /(?:amazon\s*|aws\s*)?\bec2\b/i },
  { name: "Cloudflare", slug: "cloudflare", pattern: /cloudflare/i },
  { name: "Google Cloud", slug: "googlecloud", pattern: /google\s*cloud|\bgcp\b/i },
  { name: "Azure", slug: null, pattern: /azure/i },
  { name: "Vercel", slug: "vercel", pattern: /vercel/i },
  { name: "Netlify", slug: "netlify", pattern: /netlify/i },
  { name: "Docker", slug: "docker", pattern: /docker/i },
  { name: "Kubernetes", slug: "kubernetes", pattern: /kubernetes|\bk8s\b/i },
  { name: "Nginx", slug: "nginx", pattern: /nginx/i },
  { name: "GitHub Actions", slug: "githubactions", pattern: /github\s*actions/i },
  { name: "Fastly", slug: "fastly", pattern: /fastly/i },
  { name: "Akamai", slug: "akamai", pattern: /akamai/i },
  // 모니터링·인증·기타
  { name: "Prometheus", slug: "prometheus", pattern: /prometheus/i },
  { name: "Grafana", slug: "grafana", pattern: /grafana/i },
  { name: "Sentry", slug: "sentry", pattern: /sentry/i },
  { name: "Datadog", slug: "datadog", pattern: /datadog/i },
  { name: "Auth0", slug: "auth0", pattern: /auth0/i },
  { name: "JWT", slug: "jsonwebtokens", pattern: /\bjwt\b|json\s*web\s*tokens?/i },
  { name: "Keycloak", slug: "keycloak", pattern: /keycloak/i },
  { name: "Socket.IO", slug: "socketdotio", pattern: /socket\.?io/i },
  { name: "Stripe", slug: "stripe", pattern: /stripe/i },
  { name: "OpenAI", slug: "openai", pattern: /openai/i },
  { name: "LangChain", slug: "langchain", pattern: /langchain/i },
];

/** 로고가 없을 때 쓰는 카테고리 선 아이콘(Icon.jsx 이름). */
const CATEGORY_ICONS = {
  backend: "server", frontend: "code", mobile: "code", database: "database", cache: "zap",
  messageQueue: "shuffle", cdn: "graph", infra: "server", monitoring: "target", auth: "lock",
};

const MAX_TECHS = 3;

/** backend, Backend, message_queue, MESSAGEQUEUE 같은 키를 TECH_LABELS 키로 맞춘다. */
function canonicalKey(key) {
  const flat = String(key ?? "").replace(/[\s_-]/g, "").toLowerCase();
  return Object.keys(TECH_LABELS).find((k) => k.toLowerCase() === flat) ?? key;
}

/** 문장에 나온 기술을 등장 순서대로 찾는다. 겹치면 긴 쪽, 같은 로고는 한 번만. */
export function detectTechs(value) {
  const text = String(value ?? "");
  const hits = [];
  for (const tech of TECH_REGISTRY) {
    const re = new RegExp(tech.pattern.source, tech.pattern.flags.includes("g") ? tech.pattern.flags : `${tech.pattern.flags}g`);
    for (const m of text.matchAll(re)) hits.push({ tech, start: m.index, end: m.index + m[0].length });
  }
  hits.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));

  const taken = [];
  const seen = new Set();
  const techs = [];
  for (const hit of hits) {
    if (taken.some((t) => hit.start < t.end && t.start < hit.end)) continue;
    taken.push(hit);
    const id = hit.tech.slug ?? hit.tech.name;
    if (seen.has(id)) continue;
    seen.add(id);
    techs.push({ name: hit.tech.name, slug: hit.tech.slug });
    if (techs.length === MAX_TECHS) break;
  }
  return techs;
}

// "X를 사용하여", "X을 주 데이터베이스로 채택해" 처럼 기술 이름을 다시 말하는 앞부분.
const LEAD_IN = /^.{0,60}?(?:을|를)\s*(?:[^,.]{0,20}?(?:으로|로)\s+)?(?:사용|활용|채택|도입|이용|적용)(?:하여|해서|해|하고|하며)\s*,?\s*/;

/**
 * 설명을 첫 문장으로 줄이고, 로고로 이미 보이는 기술 이름 앞부분은 뗀다.
 * 앞부분에 기술 이름이 없으면("주문 데이터를 활용해") 내용이라 떼지 않는다.
 */
export function summarizeTech(value) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  const first = text.split(/(?<=[.!?])\s+/)[0];
  const leadIn = LEAD_IN.exec(first)?.[0];
  if (!leadIn || !detectTechs(leadIn).length) return first;
  const stripped = first.slice(leadIn.length);
  return stripped.length >= 10 ? stripped : first;
}

/** 0~1 상대 휘도. 밝은 브랜드색(JavaScript 노랑 등)은 어두운 타일에 올린다. */
export function isLightColor(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex ?? ""));
  if (!m) return false;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(m[1].slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6;
}

/** techStack 객체 → 카드 목록. 값이 문자열이 아니어도(배열·객체) 글로 펴서 읽는다. */
export function techStackCards(stack) {
  if (!stack || typeof stack !== "object") return [];
  return Object.entries(stack).map(([key, raw]) => {
    const value = Array.isArray(raw) ? raw.join(", ") : raw && typeof raw === "object" ? Object.values(raw).join(", ") : String(raw ?? "");
    const canonical = canonicalKey(key);
    const techs = detectTechs(value);
    return {
      key,
      label: TECH_LABELS[canonical] ?? key,
      icon: CATEGORY_ICONS[canonical] ?? "box",
      techs,
      title: techs.length ? techs.map((t) => t.name).join(" · ") : (TECH_LABELS[canonical] ?? key),
      summary: summarizeTech(value),
      full: value,
    };
  });
}
