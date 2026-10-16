"use client";

/** 켜고 끄는 스위치. 접근성을 위해 role="switch"와 aria-checked를 쓴다. */
export function Switch({ checked, onChange, disabled = false, label, id }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={Boolean(checked)}
      aria-label={label}
      disabled={disabled}
      className={`ui-switch${checked ? " is-on" : ""}`}
      onClick={() => onChange?.(!checked)}
    >
      <span className="ui-switch__thumb" aria-hidden="true" />
    </button>
  );
}
