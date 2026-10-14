import { redirect } from "next/navigation";
import { buildDashboardUrl } from "@/lib/dashboardUrl";

// 프로젝트 설정은 대시보드의 프로젝트 안(설정 탭)으로 옮겼다. 예전 링크와 북마크를 위해 남겨 둔다.
export default function ProjectSettingsRedirect({ params }) {
  redirect(buildDashboardUrl({ projectId: params.projectId, view: "settings" }));
}
