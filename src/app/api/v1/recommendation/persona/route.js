import { NextResponse } from 'next/server';

export async function POST(request) {
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const mockData = [
    {
      name: "김혁신 (28세)",
      occupation: "스타트업 주니어 기획자",
      needs: "머릿속 아이디어를 빠르게 구체적인 개발 명세서로 바꾸고 싶어합니다.",
      painPoints: "PRD 작성 경험이 부족하여 개발팀과 소통할 때 어려움을 겪습니다."
    },
    {
      name: "이숙련 (35세)",
      occupation: "중소기업 풀스택 개발자",
      needs: "사이드 프로젝트를 시작할 때 초기 DB 스키마와 API 스펙 세팅을 자동화하고 싶어합니다.",
      painPoints: "초기 아키텍처 설계와 문서화에 너무 많은 시간을 뺏깁니다."
    }
  ];

  return NextResponse.json({
    success: true,
    data: mockData,
    message: "타겟 유저 페르소나를 성공적으로 불러왔습니다."
  });
}
