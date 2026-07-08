import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  const { requirementId } = params;
  return NextResponse.json({ pipelineId: `pipe-${requirementId}` });
}
