// 메모리상에 유지되는 목업 데이터베이스
export const mockProjects = [
  {
    projectId: "proj-1",
    projectName: "AI 기반 스터디 매칭 플랫폼",
    description: "사용자의 학습 성향과 목표를 분석하여 최적의 스터디 그룹을 매칭해주는 서비스",
    status: "COMPLETED",
    color: "var(--primary-color, #4f46e5)",
    consistencyScore: 95,
    progress: 100,
    tags: ["Next.js", "Spring Boot", "PostgreSQL"],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    prdCount: 1,
    issueCount: 3,
    specCount: 2,
  },
  {
    projectId: "proj-2",
    projectName: "반려동물 건강 다이어리 앱",
    description: "반려동물의 식단, 배변, 수면 등 건강 지표를 기록하고 수의사 상담과 연계하는 앱",
    status: "IN_PROGRESS",
    color: "var(--accent-color, #10b981)",
    consistencyScore: 78,
    progress: 45,
    tags: ["React Native", "Node.js", "MongoDB"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    prdCount: 1,
    issueCount: 0,
    specCount: 0,
  }
];

export const mockArtifacts = {
  "proj-1": [
    {
      artifactType: "PRD",
      content: JSON.stringify({
        title: "스터디 매칭 플랫폼 PRD",
        overview: "본 문서는 AI 스터디 매칭 서비스의 제품 요구사항을 정의합니다.",
        features: ["사용자 성향 분석", "실시간 매칭 알고리즘", "스터디룸 채팅"]
      })
    },
    {
      artifactType: "DB_SCHEMA",
      content: JSON.stringify({
        diagram: "erDiagram\n    USER ||--o{ STUDY_GROUP : joins\n    USER {\n        int id\n        string name\n    }"
      })
    },
    {
      artifactType: "API_SPEC",
      content: JSON.stringify({
        openapi: "3.0.0",
        info: { title: "Study API", version: "1.0" },
        paths: { "/api/match": { get: { summary: "매칭 결과 반환" } } }
      })
    }
  ],
  "proj-2": [
    {
      artifactType: "PRD",
      content: JSON.stringify({
        title: "건강 다이어리 PRD (작성중)",
        overview: "반려동물 건강 기록..."
      })
    }
  ]
};
