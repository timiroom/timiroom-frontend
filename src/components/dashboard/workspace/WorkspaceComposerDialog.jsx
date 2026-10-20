"use client";

import { useEffect, useRef, useState } from "react";

export function WorkspaceComposerDialog({
  open,
  createName,
  createDescription,
  joinCode,
  creating,
  joining,
  error,
  onClose,
  onCreateNameChange,
  onCreateDescriptionChange,
  onJoinCodeChange,
  onCreate,
  onJoin,
}) {
  const [joinOpen, setJoinOpen] = useState(false);
  const joinInputRef = useRef(null);

  useEffect(() => {
    if (!open) setJoinOpen(false);
  }, [open]);

  useEffect(() => {
    if (!joinOpen) return undefined;
    const frame = requestAnimationFrame(() => joinInputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [joinOpen]);

  if (!open) return null;

  return (
    <div className="ws-compose__backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}>
      <div className="ws-compose" role="dialog" aria-modal="true" aria-labelledby="ws-compose-title">
        <div className="ws-compose__head">
          <div>
            <div id="ws-compose-title" className="ws-compose__title">워크스페이스 추가</div>
            <div className="ws-compose__sub">새 워크스페이스를 만들거나 초대 코드로 참여해 보세요.</div>
          </div>
          <button type="button" className="ws-compose__close" onClick={onClose} aria-label="닫기">×</button>
        </div>

        <div className="ws-compose__body">
          <div className="ws-compose__label">새 워크스페이스</div>

          <form
            className="ws-compose__form"
            onSubmit={(event) => {
              event.preventDefault();
              onCreate();
            }}
          >
            <input
              className="ws-compose__field"
              value={createName}
              onChange={(event) => onCreateNameChange(event.target.value)}
              placeholder="워크스페이스 이름"
            />
            <textarea
              className="ws-compose__field ws-compose__field--area"
              value={createDescription}
              onChange={(event) => onCreateDescriptionChange(event.target.value)}
              placeholder="워크스페이스 설명"
              rows={4}
            />
            <button type="submit" className="ws-compose__primary" disabled={creating}>
              {creating ? "생성 중" : "워크스페이스 생성"}
            </button>
          </form>

          <button
            type="button"
            className="ws-compose__link"
            aria-expanded={joinOpen}
            aria-controls="ws-compose-join"
            onClick={() => setJoinOpen((value) => !value)}
          >
            초대코드 입력
          </button>

          <div id="ws-compose-join" className={`ws-compose__join${joinOpen ? " is-open" : ""}`}>
            <form
              className="ws-compose__join-inner"
              onSubmit={(event) => {
                event.preventDefault();
                onJoin();
              }}
            >
              <div className="ws-compose__join-row">
                <input
                  ref={joinInputRef}
                  aria-label="초대 코드"
                  className="ws-compose__field"
                  value={joinCode}
                  onChange={(event) => onJoinCodeChange(event.target.value)}
                  placeholder="받은 초대 코드를 입력하세요"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button type="submit" className="ws-compose__secondary" disabled={joining}>
                  {joining ? "참여 중" : "참여하기"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {error && <div className="ws-compose__error" role="alert">{error}</div>}
      </div>
    </div>
  );
}
