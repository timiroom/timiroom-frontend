import { NextResponse } from 'next/server';

export async function POST() {
  // 가상의 세션 ID 생성
  return NextResponse.json({
    sessionId: `mock-session-${Date.now()}`
  });
}
