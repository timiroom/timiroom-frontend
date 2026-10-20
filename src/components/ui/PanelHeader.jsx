"use client";

import { Badge } from "./Badge";

/**
 * 문서·작업 패널 맨 위의 헤더: [프로젝트 머리글자] 프로젝트 이름 › 문서 이름 … 오른쪽 버튼들.
 * 패널마다 복사해 쓰던 마크업을 하나로 모았다. 오른쪽에 둘 버튼은 children으로 넘긴다.
 */
/**
 * 헤더 왼쪽의 "프로젝트 › 문서 v3" 표시만 따로 쓸 때.
 * docType을 주면 서버 문서의 version을 이름 옆에 붙인다. 저장할 때마다 서버가 1씩 올린다.
 * 기능 명세처럼 여러 산출물 중 있는 것을 쓰는 화면은 우선순위대로 배열로 넘긴다.
 */
export function PanelTitle({ project, label, docType }) {
  const source = docType ? [].concat(docType).map((type) => project?.artifactSources?.[type]).find(Boolean) : null;
  return (
    <div className="ui-panel-header__crumb">
      {project && <span className="ui-panel-header__avatar" aria-hidden="true">{(project.name || "P").charAt(0).toUpperCase()}</span>}
      {project && <span>{project.name}</span>}
      {project && <span className="ui-panel-header__sep" aria-hidden="true">›</span>}
      <Badge>{label}</Badge>
      {source?.version != null && (
        <span className="ui-panel-header__version" title={`이 문서를 ${source.version}번 저장했습니다. 기준 명세 발행 차수와는 따로 셉니다.`}>저장 v{source.version}</span>
      )}
    </div>
  );
}

export function PanelHeader({ project, label, docType, children }) {
  return (
    <div className="ui-panel-header">
      <PanelTitle project={project} label={label} docType={docType} />
      {children && <div className="ui-panel-header__actions">{children}</div>}
    </div>
  );
}
