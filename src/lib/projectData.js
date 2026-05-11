/**
 * projectData.js
 * --------------
 * 목(Mock) 프로젝트 데이터.
 * 실제 구현 시 API 호출로 교체하세요.
 */

export const MOCK_PROJECTS = [
  {
    id: "proj-001",
    name: "이커머스 리뉴얼",
    description: "기존 쇼핑몰 전체 아키텍처 재설계. PRD 기반 API·DB 자동화 적용.",
    status: "running",      // running | done | draft | paused
    score: 72,
    progress: 58,           // 파이프라인 진행률 %
    tags: ["API", "DB", "결제"],
    members: ["M", "J", "S"],
    lastActivity: "2분 전",
    created: "2026-04-01",
    prdCount: 23,
    issueCount: 3,
    specCount: 47,
    color: "var(--text-1)",
  },
  {
    id: "proj-002",
    name: "결제 시스템 개선",
    description: "PG사 연동 고도화 및 정산 배치 파이프라인 재구축.",
    status: "done",
    score: 91,
    progress: 100,
    tags: ["결제", "배치", "보안"],
    members: ["M", "K"],
    lastActivity: "3시간 전",
    created: "2026-03-15",
    prdCount: 18,
    issueCount: 0,
    specCount: 62,
    color: "#6b6960",
  },
  {
    id: "proj-003",
    name: "모바일 앱 API",
    description: "iOS·Android 앱 신기능 대응 REST API 설계 및 문서화.",
    status: "running",
    score: 45,
    progress: 31,
    tags: ["모바일", "REST", "Push"],
    members: ["J", "P", "L", "S"],
    lastActivity: "12분 전",
    created: "2026-04-10",
    prdCount: 15,
    issueCount: 7,
    specCount: 21,
    color: "#a8a69f",
  },
  {
    id: "proj-004",
    name: "사내 관리자 포털",
    description: "내부 운영팀을 위한 통합 관리 대시보드 백엔드 구축.",
    status: "draft",
    score: 23,
    progress: 12,
    tags: ["Admin", "내부"],
    members: ["M"],
    lastActivity: "2일 전",
    created: "2026-04-14",
    prdCount: 8,
    issueCount: 2,
    specCount: 5,
    color: "#1a1916",
  },
  {
    id: "proj-005",
    name: "추천 엔진 v2",
    description: "벡터 검색 기반 개인화 추천 알고리즘 설계 자동화.",
    status: "paused",
    score: 58,
    progress: 44,
    tags: ["ML", "pgvector", "추천"],
    members: ["S", "K"],
    lastActivity: "5일 전",
    created: "2026-03-28",
    prdCount: 11,
    issueCount: 1,
    specCount: 33,
    color: "#6b6960",
  },
];

export const STATUS_META = {
  running: { label: "진행 중", color: "var(--text-2)",  bg: "var(--border)"  },
  done:    { label: "완료",   color: "var(--text-1)",   bg: "var(--border-2)"   },
  draft:   { label: "초안",   color: "var(--text-3)", bg: "var(--bg)" },
  paused:  { label: "일시정지",color: "var(--db-text-muted)", bg: "var(--db-bg-elevated)" },
};

/** 유저 이니셜 → 색 매핑 */
export const MEMBER_COLORS = {
  M: "var(--text-1)", J: "#a8a69f", S: "#6b6960",
  K: "#1a1916", P: "#a8a69f", L: "#1a1916",
};
