"use client";

import { ActionButton } from "@/components/ui";
import { navigateDashboard } from "@/lib/dashboardUrl";

/**
 * 연결된 GitHub 레포가 없을 때의 빈 화면. 안내 문구만 두지 않고
 * 프로젝트 설정의 GitHub 레포 탭으로 바로 가는 버튼을 함께 둔다.
 */
export function RepoConnectEmpty({ projectId, message = "GitHub 레포를 연결하면 여기에 표시됩니다." }) {
  return (
    <div className="repo-empty">
      <p>{message}</p>
      {projectId && (
        <ActionButton variant="primary" onClick={() => navigateDashboard({ projectId, view: "settings", tab: "repositories" })}>
          레포 연결하러 가기
        </ActionButton>
      )}
    </div>
  );
}
