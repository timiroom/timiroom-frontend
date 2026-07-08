import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json([{ id: 1, teamName: "기본 팀" }]);
}

export async function POST(request) {
  const body = await request.json();
  return NextResponse.json({ id: 2, teamName: body.teamName });
}
