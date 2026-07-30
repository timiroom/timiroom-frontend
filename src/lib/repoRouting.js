export const REPOSITORY_ROLE_META = {
  GENERAL: { label: "공통" },
  FRONTEND: { label: "프론트엔드" },
  BACKEND: { label: "백엔드" },
  PIPELINE: { label: "초기 파이프라인" },
  CONSISTENCY: { label: "정합성 AI" },
  INFRA: { label: "인프라" },
};

const ROLE_ORDER = ["FRONTEND", "BACKEND", "PIPELINE", "CONSISTENCY", "INFRA"];

const REPOSITORY_ALIASES = {
  FRONTEND: ["frontend", "front-end", "web", "client", "ui", "mobile", "app"],
  BACKEND: ["backend", "back-end", "server", "api", "spring", "nest", "django", "fastapi"],
  PIPELINE: ["pipeline", "ingest", "rag", "embedding", "kafka", "queue"],
  CONSISTENCY: ["consistency", "reviewer", "review-bot", "validator", "exaone", "llm"],
  INFRA: ["infra", "ops", "devops", "gitops", "deploy", "k8s", "kubernetes", "terraform"],
};

const TECH_STACK_ALIASES = {
  FRONTEND: ["frontend", "front-end", "ui", "ux", "client", "react", "vue", "next", "vite", "svelte", "flutter", "android", "ios", "mobile"],
  BACKEND: ["backend", "back-end", "server", "api", "database", "db", "cache", "auth", "spring", "java", "kotlin", "nest", "node", "django", "fastapi", "postgres", "mysql", "mongodb", "redis"],
  PIPELINE: ["pipeline", "messagequeue", "message queue", "queue", "kafka", "rabbitmq", "rag", "embedding", "vector", "ingest"],
  CONSISTENCY: ["consistency", "ai", "llm", "model", "exaone", "openai", "anthropic", "friendli", "inference"],
  INFRA: ["infra", "devops", "cloud", "cdn", "monitoring", "observability", "deploy", "docker", "kubernetes", "k8s", "aws", "azure", "gcp", "vercel", "grafana", "prometheus", "opentelemetry", "terraform"],
};

const FEATURE_ALIASES = {
  FRONTEND: ["frontend", "front-end", "프론트", "화면", "페이지", "대시보드", "ui", "ux", "컴포넌트", "react", "vue", "next", "vite", "모바일"],
  BACKEND: ["backend", "back-end", "백엔드", "api", "서버", "endpoint", "엔드포인트", "인증", "권한", "auth", "database", "데이터베이스", "db", "crud", "spring", "nest", "서비스"],
  PIPELINE: ["pipeline", "파이프라인", "kafka", "rabbitmq", "message queue", "메시지 큐", "queue", "웹훅", "webhook", "event", "이벤트", "rag", "embedding", "임베딩", "수집"],
  CONSISTENCY: ["consistency", "정합성", "review", "리뷰", "검증", "validation", "분석", "ai", "llm", "모델", "exaone", "경고", "불일치"],
  INFRA: ["infra", "인프라", "devops", "배포", "deploy", "cloud", "클라우드", "docker", "kubernetes", "k8s", "monitoring", "모니터링", "ci/cd", "cdn", "grafana", "prometheus"],
};

function normalizedText(value) {
  return String(value ?? "").toLowerCase().replace(/[_.:/\\-]+/g, " ").replace(/\s+/g, " ").trim();
}

function includesAlias(text, alias) {
  const normalizedAlias = normalizedText(alias);
  if (!normalizedAlias) return false;
  if (normalizedAlias.length <= 3 && /^[a-z]+$/.test(normalizedAlias)) {
    return new RegExp(`(^|[^a-z0-9])${normalizedAlias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "i").test(text);
  }
  return text.includes(normalizedAlias);
}

function matchesAny(text, aliases) {
  return aliases.some((alias) => includesAlias(text, alias));
}

function techEntries(techStack) {
  if (!techStack || typeof techStack !== "object" || Array.isArray(techStack)) return [];
  return Object.entries(techStack).map(([key, value]) => ({ key, text: normalizedText(`${key} ${value}`) }));
}

export function classifyRepository(repo) {
  const explicitRole = String(repo?.roleHint ?? "").trim().toUpperCase();
  if (REPOSITORY_ROLE_META[explicitRole]) return explicitRole;

  const text = normalizedText(repo?.fullName ?? repo?.name ?? "");
  const matched = ROLE_ORDER.find((role) => matchesAny(text, REPOSITORY_ALIASES[role]));
  return matched ?? "GENERAL";
}

export function techStackRoles(techStack) {
  const entries = techEntries(techStack);
  return ROLE_ORDER.filter((role) => entries.some(({ text }) => matchesAny(text, TECH_STACK_ALIASES[role])));
}

export function techStackKeysForRole(techStack, role) {
  const aliases = TECH_STACK_ALIASES[role] ?? [];
  return techEntries(techStack).filter(({ text }) => matchesAny(text, aliases)).map(({ key }) => key);
}

function featureText(feature) {
  const requirements = Array.isArray(feature?.requirements) ? feature.requirements : [feature?.requirements];
  return normalizedText([feature?.name, feature?.description, ...requirements].filter(Boolean).join(" "));
}

export function inferFeatureRoles(feature, techStack, repos = []) {
  const availableRoles = [...new Set(repos.map(classifyRepository).filter((role) => role !== "GENERAL"))];
  const text = featureText(feature);
  const detected = ROLE_ORDER.filter((role) => matchesAny(text, FEATURE_ALIASES[role]));
  if (detected.length > 0) return detected;

  const declaredRoles = techStackRoles(techStack);
  if (declaredRoles.length > 0) return declaredRoles;
  if (availableRoles.length === 0) return repos.length ? ["GENERAL"] : [];
  return availableRoles;
}

export function recommendRepository(repos, role) {
  if (!Array.isArray(repos) || repos.length === 0) return null;
  const normalizedRole = REPOSITORY_ROLE_META[role] ? role : "GENERAL";
  const ranked = repos.map((repo, index) => {
    const explicitRole = String(repo?.roleHint ?? "").trim().toUpperCase();
    const inferredRole = classifyRepository(repo);
    let score = 0;
    if (explicitRole === normalizedRole) score += 1000;
    if (inferredRole === normalizedRole) score += 300;
    if (normalizedRole === "GENERAL" && inferredRole === "GENERAL") score += 100;
    return { repo, score, index };
  }).sort((left, right) => right.score - left.score || left.index - right.index);
  return ranked[0]?.score > 0 ? ranked[0].repo : null;
}

export function recommendRepositoriesForFeature(feature, techStack, repos = []) {
  const seen = new Set();
  return inferFeatureRoles(feature, techStack, repos).map((role) => ({
    role,
    repo: recommendRepository(repos, role),
  })).filter(({ repo }) => {
    if (!repo) return false;
    const key = String(repo.id ?? repo.githubRepoId ?? repo.fullName);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function roleLabel(role) {
  return REPOSITORY_ROLE_META[role]?.label ?? role ?? "공통";
}
