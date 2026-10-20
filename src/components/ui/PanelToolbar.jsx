"use client";

import { Icon } from "./Icon";

/** 패널 헤더 아래 도구줄. children은 왼쪽, end는 오른쪽 끝에 놓인다. */
export function PanelToolbar({ children, end }) {
  return (
    <div className="ui-panel-toolbar">
      {children}
      {end && <div className="ui-panel-toolbar__end">{end}</div>}
    </div>
  );
}

/** 돋보기 아이콘이 붙은 검색 입력. 모든 패널의 검색창이 이것을 쓴다. */
export function SearchInput({ value, onChange, placeholder, label, ...props }) {
  return (
    <label className="ui-search">
      <Icon name="search" size={14} />
      <input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={label || placeholder} {...props} />
    </label>
  );
}

/** 숫자 요약 카드 묶음. items: [{ label, value }] */
export function StatGrid({ items }) {
  return (
    <div className="ui-stats">
      {items.map((item) => (
        <div key={item.label} className="ui-stat">
          <div className="ui-stat__label">{item.label}</div>
          <div className="ui-stat__value">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
