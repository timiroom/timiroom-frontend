import { ProjectManagementView } from "@/components/project/ProjectManagementView";

export const metadata = {
  title: "프로젝트 설정 — Align-it",
};

export default function ProjectSettingsPage({ params }) {
  return <ProjectManagementView projectId={params.projectId} />;
}
