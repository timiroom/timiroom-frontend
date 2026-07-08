import { NextResponse } from 'next/server';

export async function GET() {
  const response = NextResponse.redirect('http://localhost:3000/dashboard');
  response.cookies.set('mock_session', 'authenticated', { path: '/' });
  return response;
}
