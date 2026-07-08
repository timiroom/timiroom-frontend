import { NextResponse } from 'next/server';
import { mockArtifacts } from '@/app/api/mock/mockDb';

export async function GET(request, { params }) {
  const { id } = params;
  const artifacts = mockArtifacts[id] || [];
  
  return NextResponse.json({
    success: true,
    data: artifacts,
  });
}
