import { NextResponse } from 'next/server';

export async function GET() {
  // 실제 로그인 화면을 시뮬레이션하기 위해 /dashboard로 리다이렉트 하면서 쿠키 설정
  // 원래라면 구글/깃허브 로그인 창이 뜨겠지만, 목업에서는 바로 로그인 성공으로 처리
  const response = NextResponse.redirect('http://localhost:3000/dashboard');
  response.cookies.set('mock_session', 'authenticated', { path: '/' });
  return response;
}
