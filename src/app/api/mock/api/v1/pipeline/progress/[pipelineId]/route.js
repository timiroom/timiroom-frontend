import { NextResponse } from 'next/server';

export async function GET(request) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event, data) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      sendEvent('progress', { step: 'PHASE1_START', percent: 10, message: 'RAG 컨텍스트 준비 중...' });
      await new Promise(r => setTimeout(r, 2000));
      
      sendEvent('progress', { step: 'SEARCH', percent: 25, message: '관련 레퍼런스 및 문헌 검색 중...' });
      await new Promise(r => setTimeout(r, 2000));
      
      sendEvent('progress', { step: 'PM', percent: 45, message: 'PM 에이전트: 핵심 기능 기획 중...' });
      await new Promise(r => setTimeout(r, 2500));
      
      sendEvent('progress', { step: 'PRD', percent: 65, message: 'PRD 에이전트: 제품 요구사항 정의서 작성 중...' });
      await new Promise(r => setTimeout(r, 2500));
      
      sendEvent('progress', { step: 'DBA_API', percent: 85, message: 'DB/API 에이전트: 스키마 및 명세 설계 중...' });
      await new Promise(r => setTimeout(r, 3000));
      
      sendEvent('complete', { 
        result: {
          prdDocument: {
            projectOverview: "이 프로젝트는 사용자의 성향을 분석하여 최적의 스터디를 매칭해주는 AI 플랫폼입니다.",
            background: "최근 자기계발에 대한 수요가 늘어남에 따라, 자신과 잘 맞는 스터디원을 찾는 것에 어려움을 느끼는 사람들이 많아졌습니다.",
            goals: ["사용자 성향 기반 90% 이상 매칭 만족도 달성", "초기 한 달 내 1,000명의 활성 사용자 확보"],
            coreFeatures: [
              { name: "성향 분석 테스트", priority: "P1", description: "간단한 설문으로 학습 스타일 도출" },
              { name: "AI 매칭 알고리즘", priority: "P1", description: "성향, 목표, 지역 기반 추천" },
              { name: "스터디룸 화상회의", priority: "P2", description: "내장형 웹RTC 화상 기능" }
            ],
            userPersonas: [
              { name: "이직 준비생 김민수", age: "28", job: "주니어 개발자", goal: "프론트엔드 심화 스터디 참여", painPoint: "시간이 안 맞는 스터디원들" }
            ],
            techStack: { "Frontend": "Next.js, TailwindCSS", "Backend": "Spring Boot, JPA", "Database": "PostgreSQL, Redis" }
          },
          dbSchema: {
            tables: [
              {
                name: "users",
                columns: [
                  { name: "id", type: "BIGINT", constraints: "PK, AUTO_INCREMENT" },
                  { name: "email", type: "VARCHAR(255)", constraints: "UNIQUE, NOT NULL" },
                  { name: "password", type: "VARCHAR(255)", constraints: "NOT NULL" },
                  { name: "created_at", type: "TIMESTAMP", constraints: "NOT NULL" }
                ],
                indexes: ["idx_users_email"]
              },
              {
                name: "study_groups",
                columns: [
                  { name: "id", type: "BIGINT", constraints: "PK, AUTO_INCREMENT" },
                  { name: "title", type: "VARCHAR(100)", constraints: "NOT NULL" },
                  { name: "max_members", type: "INT", constraints: "NOT NULL" }
                ]
              }
            ],
            relationships: ["users (1) <--> (N) study_groups : 회원은 여러 스터디에 참여 가능"]
          },
          apiSpec: {
            endpoints: [
              {
                method: "GET",
                path: "/api/users/me",
                description: "내 정보 조회",
                request: { headers: { Authorization: "Bearer Token" } },
                response: { success: { id: 1, email: "user@test.com" } }
              },
              {
                method: "POST",
                path: "/api/match",
                description: "스터디 매칭 요청",
                request: { headers: { Authorization: "Bearer Token" }, body: { preferences: ["frontend", "weekend"] } },
                response: { success: { matchId: 101, status: "pending" } }
              }
            ]
          }
        }
      });
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
