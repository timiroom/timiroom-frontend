"use client";

import { PanelHeader } from "@/components/ui";
import { ProjectSettings, PROJECT_PAGES } from "@/components/settings/ProjectSettings";

/**
 * 프로젝트 안의 "프로젝트 설정" 화면. GitHub 저장소 설정처럼 프로젝트 문서들과 같은 자리에 열고,
 * 위쪽 가로 탭으로 일반 · GitHub 레포 · 멤버 · 삭제를 오간다. 계정·워크스페이스 설정은 /settings에 있다.
 */
export function ProjectSettingsView({ project, page = "general", onChangePage, onProjectGone, onProjectChanged }) {
  const current = PROJECT_PAGES[page] ? page : "general";
  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      <PanelHeader project={project} label="프로젝트 설정" />
      <nav className="ui-tabs" aria-label="프로젝트 설정 메뉴">
        {Object.entries(PROJECT_PAGES).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`ui-tabs__item${current === key ? " is-active" : ""}${key === "delete" ? " is-danger" : ""}`}
            aria-current={current === key ? "page" : undefined}
            onClick={() => onChangePage(key)}
          >
            {label}
          </button>
        ))}
      </nav>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div className="ui-set-page">
          <ProjectSettings
            key={project.id}
            projectId={project.id}
            page={current}
            onProjectGone={onProjectGone}
            onProjectChanged={onProjectChanged}
          />
        </div>
      </div>
    </div>
  );
}
