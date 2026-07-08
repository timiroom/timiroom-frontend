import { NextResponse } from 'next/server';
import { mockProjects } from '@/app/api/mock/mockDb';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: mockProjects,
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const newProject = {
      projectId: `proj-${Date.now()}`,
      projectName: body.projectName || "새 프로젝트",
      description: body.description || "설명이 없습니다.",
      status: "PLANNING",
      color: "#9ca3af",
      consistencyScore: 0,
      progress: 0,
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      prdCount: 0,
      issueCount: 0,
      specCount: 0,
    };
    
    mockProjects.unshift(newProject);
    
    return NextResponse.json({
      success: true,
      data: newProject,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
