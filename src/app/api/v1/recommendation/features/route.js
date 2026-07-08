import { NextResponse } from 'next/server';

export async function POST(request) {
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const mockData = [
    { name: "채팅 기반 5단계 프로젝트 생성", priority: "Must Have", description: "플랫폼, 기술스택, 문제정의, 타겟유저, 기능정의 폼 제공" },
    { name: "멀티 에이전트 오케스트레이션", priority: "Must Have", description: "PM, PRD, DBA, API 에이전트 병렬 작업" },
    { name: "AI 실시간 추천 기능", priority: "Must Have", description: "폼 입력 과정에서 비동기로 기술스택/페르소나 추천" },
    { name: "표준 명세서 자동 추출", priority: "Should Have", description: "Swagger UI 및 Mermaid ERD 형태로 변환" },
    { name: "문서 버전 관리 (Commit)", priority: "Could Have", description: "변경사항에 대해 커밋 단위로 이력 추적 및 롤백" },
    { name: "팀원 초대 및 동시 편집", priority: "Won't Have", description: "초기 릴리즈에서는 단일 사용자 기반으로 제공" }
  ];

  return NextResponse.json({
    success: true,
    data: mockData,
    message: "MoSCoW 기능 추천을 성공적으로 불러왔습니다."
  });
}
