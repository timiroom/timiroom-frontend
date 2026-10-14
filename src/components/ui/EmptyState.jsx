"use client";

import { Icon } from "./Icon";

/**
 * 목록·화면이 비었을 때의 안내. 아이콘, 제목, 한두 문장 설명, 다음 행동 버튼을 둔다.
 * "없습니다"로 끝내지 않고 무엇을 하면 채워지는지 알려 주는 것이 목적이다.
 *   <EmptyState icon="flag" title="아직 이슈가 없습니다" description="…">
 *     <ActionButton variant="primary">이슈 만들기</ActionButton>
 *   </EmptyState>
 */
export function EmptyState({ icon = "box", title, description, children, compact = false }) {
  return (
    <div className={`ui-empty${compact ? " ui-empty--compact" : ""}`}>
      <span className="ui-empty__icon" aria-hidden="true"><Icon name={icon} size={compact ? 18 : 22} strokeWidth={1.7} /></span>
      {title && <h3 className="ui-empty__title">{title}</h3>}
      {description && <p className="ui-empty__desc">{description}</p>}
      {children && <div className="ui-empty__actions">{children}</div>}
    </div>
  );
}

/** 불러오는 중 표시. 화면 가운데에 작은 원과 문구를 둔다. */
export function LoadingState({ label = "불러오는 중…" }) {
  return (
    <div className="ui-loading" role="status">
      <span className="ui-loading__spinner" aria-hidden="true" />
      {label}
    </div>
  );
}
