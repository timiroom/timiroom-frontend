import { NextResponse } from 'next/server';
import { mockProjects } from '@/app/api/mock/mockDb';

export async function GET(request, { params }) {
  const { id } = params;
  const project = mockProjects.find(p => p.projectId === id);
  
  if (!project) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }
  
  return NextResponse.json({
    success: true,
    data: project,
  });
}

export async function PATCH(request, { params }) {
  const { id } = params;
  const projectIndex = mockProjects.findIndex(p => p.projectId === id);
  
  if (projectIndex === -1) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }
  
  const body = await request.json();
  mockProjects[projectIndex] = { ...mockProjects[projectIndex], ...body, updatedAt: new Date().toISOString() };
  
  return NextResponse.json({
    success: true,
    data: mockProjects[projectIndex],
  });
}

export async function DELETE(request, { params }) {
  const { id } = params;
  const projectIndex = mockProjects.findIndex(p => p.projectId === id);
  
  if (projectIndex > -1) {
    mockProjects.splice(projectIndex, 1);
  }
  
  return NextResponse.json({ success: true });
}
