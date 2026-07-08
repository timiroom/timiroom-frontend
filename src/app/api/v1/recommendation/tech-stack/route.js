import { NextResponse } from 'next/server';

export async function POST(request) {
  // 실제 API처럼 약간의 지연 시간 시뮬레이션
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const mockData = {
    frontend: ["Next.js", "React", "Tailwind CSS"],
    backend: ["Spring Boot", "Java 21"],
    database: ["PostgreSQL", "Redis", "pgvector"],
    infrastructure: ["Docker", "AWS", "Nginx"]
  };

  return NextResponse.json({
    success: true,
    data: mockData,
    message: "추천 기술 스택을 성공적으로 불러왔습니다."
  });
}
