"use client";

import Link from "next/link";
import { aiErrorKind, toAiError } from "@/lib/aiErrors.mjs";
import { Icon } from "./Icon";

/**
 * AI 기능이 실패했을 때 보여 주는 안내 카드.
 * 제목(무슨 일인지) + 안내 문구(어떻게 하면 되는지) + 바로가기(내 AI 키, 사용량) / 다시 시도 버튼.
 * error: AiRequestError나 일반 Error, 또는 {code, message}.
 */
export function AiErrorNotice({ error, onRetry, compact = false }) {
  const normalized = error?.code && error?.message && !(error instanceof Error) ? error : toAiError(error);
  const kind = aiErrorKind(normalized.code);
  const tone = kind.action ? "action" : "temporary";
  return (
    <div className={`ai-error ai-error--${tone}${compact ? " ai-error--compact" : ""}`} role="alert">
      <span className="ai-error__icon" aria-hidden="true">
        <Icon name={kind.action ? (kind.action.href.includes("usage") ? "meter" : "key") : "warning"} size={15} />
      </span>
      <div className="ai-error__body">
        <strong className="ai-error__title">{kind.title}</strong>
        <p className="ai-error__message">{normalized.message}</p>
        {(kind.action || (kind.retry && onRetry)) && (
          <div className="ai-error__actions">
            {kind.action && <Link className="ai-error__btn ai-error__btn--primary" href={kind.action.href}>{kind.action.label}</Link>}
            {kind.retry && onRetry && <button type="button" className="ai-error__btn" onClick={onRetry}>다시 시도</button>}
          </div>
        )}
      </div>
    </div>
  );
}
