"use client";

import Link from "next/link";
import { Icon } from "./Icon";

/**
 * 설정 화면(/settings) 공통 틀. 내 계정·워크스페이스·프로젝트 설정이 모두 이 틀을 쓴다.
 * 상용 앱 설정 화면처럼 왼쪽에 메뉴, 오른쪽에 그 메뉴 하나의 카드 묶음을 둔다.
 * 설정 영역이 좁으면(컨테이너 쿼리) 섹션 목록이 위쪽 가로 탭으로 바뀐다(theme.css .ui-set-*).
 *
 *   <SettingsLayout nav={<SettingsNav … />}>
 *     <SettingsHeader title="…" />
 *     <SettingsSection title="일반" footer={…}>
 *       <SettingsRow label="이름" description="…"><input className="ui-input" /></SettingsRow>
 *     </SettingsSection>
 *   </SettingsLayout>
 */

export function SettingsLayout({ nav, children }) {
  return (
    <div className="ui-set-scope">
      <div className="ui-set-layout">
        {nav}
        <div className="ui-set-main">{children}</div>
      </div>
    </div>
  );
}

/**
 * 왼쪽 섹션 목록. 섹션마다 따로 페이지이므로 항목은 링크다.
 *   groups: [{ label?, top?, items: [{ key, label, href, icon?, danger? }] }]
 *   top에는 그룹 맨 위에 둘 요소(내 계정 카드, 워크스페이스 선택)를 넣는다. 그룹 사이에는 구분선이 들어간다.
 */
export function SettingsNav({ groups, active, label = "설정 메뉴" }) {
  return (
    <nav className="ui-set-nav" aria-label={label}>
      {groups.map((group, index) => (
        <div key={group.label ?? index} className="ui-set-nav__group">
          {group.label && <div className="ui-set-nav__label">{group.label}</div>}
          {group.top}
          {group.items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`ui-set-nav__item${active === item.key ? " is-active" : ""}${item.danger ? " is-danger" : ""}`}
              aria-current={active === item.key ? "page" : undefined}
            >
              {item.icon && <Icon name={item.icon} size={15} strokeWidth={1.8} />}
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}

/** 설정 화면 맨 위의 제목 줄. eyebrow는 지금 어느 범위(내 계정, 워크스페이스 이름)인지 알려 주는 작은 글씨다. */
export function SettingsHeader({ eyebrow, leading, title, meta, description, actions }) {
  return (
    <header className="ui-set-header">
      {leading}
      <div className="ui-set-header__text">
        {eyebrow && <div className="ui-set-header__eyebrow">{eyebrow}</div>}
        <h1 className="ui-set-header__title">{title}</h1>
        {meta && <div className="ui-set-header__meta">{meta}</div>}
        {description && <p className="ui-set-header__desc">{description}</p>}
      </div>
      {actions && <div className="ui-set-header__actions">{actions}</div>}
    </header>
  );
}

/**
 * 제목·설명 아래 카드 하나. footer는 카드 아래 회색 띠(저장 버튼 자리).
 * tone="danger"면 빨간 테두리. highlighted면 잠깐 테두리를 강조한다(섹션 이동 시).
 */
export function SettingsSection({ sectionRef, title, description, actions, footer, tone, highlighted, children }) {
  return (
    <section ref={sectionRef} className="ui-set-section">
      {(title || actions) && (
        <div className="ui-set-section__head">
          <div>
            {title && <h2 className={`ui-set-section__title${tone === "danger" ? " is-danger" : ""}`}>{title}</h2>}
            {description && <p className="ui-set-section__desc">{description}</p>}
          </div>
          {actions && <div className="ui-set-section__actions">{actions}</div>}
        </div>
      )}
      <div className={`ui-set-card${tone === "danger" ? " ui-set-card--danger" : ""}${highlighted ? " is-highlighted" : ""}`}>
        {children}
        {footer && <div className="ui-set-footer">{footer}</div>}
      </div>
    </section>
  );
}

/** 왼쪽 이름·설명, 오른쪽 입력·버튼. stacked면 입력을 아래 전체 폭으로 둔다. */
export function SettingsRow({ label, description, children, stacked = false }) {
  return (
    <div className={`ui-set-row${stacked ? " ui-set-row--stacked" : ""}`}>
      <div className="ui-set-row__text">
        <div className="ui-set-row__label">{label}</div>
        {description && <div className="ui-set-row__desc">{description}</div>}
      </div>
      {children != null && <div className="ui-set-row__control">{children}</div>}
    </div>
  );
}

/** 멤버·프로젝트·연결 목록의 한 줄. onClick을 주면 줄 전체가 버튼이 된다. */
export function SettingsItem({ leading, title, subtitle, trailing, onClick }) {
  const body = (
    <>
      {leading}
      <div className="ui-set-item__text">
        <div className="ui-set-item__title">{title}</div>
        {subtitle && <div className="ui-set-item__sub">{subtitle}</div>}
      </div>
      {trailing && <div className="ui-set-item__trail">{trailing}</div>}
    </>
  );
  if (onClick) return <button type="button" className="ui-set-item ui-set-item--link" onClick={onClick}>{body}</button>;
  return <div className="ui-set-item">{body}</div>;
}

export function SettingsEmpty({ children }) {
  return <div className="ui-set-empty">{children}</div>;
}

/** 이름 첫 글자 또는 이미지로 된 동그란 아바타. square면 모서리가 둥근 사각형(워크스페이스·프로젝트). */
export function Avatar({ name, src, size = 32, square = false }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.4) };
  return (
    <span className={`ui-avatar${square ? " ui-avatar--square" : ""}`} style={style} aria-hidden="true">
      {/* 사진은 사용자가 올린 외부 주소라 next/image 허용 도메인 설정 없이 그대로 그린다. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt="" /> : (name || "?").trim().charAt(0).toUpperCase()}
    </span>
  );
}
