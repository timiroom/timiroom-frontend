import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = cookies();
  const session = cookieStore.get('mock_session');

  // 로그인이 안되어있으면 401 반환
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 로그인 상태라면 목 데이터 반환
  return NextResponse.json({
    id: 1,
    name: "팀루미",
    email: "timiroom@align-it.com",
    profileImage: "https://avatars.githubusercontent.com/u/1?v=4",
    role: "USER"
  });
}
