"use client";

import { Badge } from "./Badge";

/**
 * 문서·작업 패널 맨 위의 헤더: [프로젝트 머리글자] 프로젝트 이름 › 문서 이름 … 오른쪽 버튼들.
 * 패널마다 복사해 쓰던 마크업을 하나로 모았다. 오른쪽에 둘 버튼은 children으로 넘긴다.
 */
/** 헤더 왼쪽의 "프로젝트 › 문서" 표시만 따로 쓸 때. */
export function PanelTitle({ project, label }) {
  return (
    <div className="ui-panel-header__crumb">
      {project && <span className="ui-panel-header__avatar" aria-hidden="true">{(project.name || "P").charAt(0).toUpperCase()}</span>}
      {project && <span>{project.name}</span>}
      {project && <span className="ui-panel-header__sep" aria-hidden="true">›</span>}
      <Badge>{label}</Badge>
    </div>
  );
}

export function PanelHeader({ project, label, children }) {
  return (
    <div className="ui-panel-header">
      <PanelTitle project={project} label={label} />
      {children && <div className="ui-panel-header__actions">{children}</div>}
    </div>
  );
}
