import { redirect } from "next/navigation";

// 프로젝트 설정은 설정 > 프로젝트로 옮겼다. 예전 링크와 북마크를 위해 남겨 둔다.
export default function ProjectSettingsRedirect({ params }) {
  redirect(`/settings/project/${encodeURIComponent(params.projectId)}/general`);
}
