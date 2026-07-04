"use client";

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
  if (!open) return null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(8,8,8,0.42)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 240,
      padding: 20,
    }}>
      <div style={{
        width: "min(720px, 100%)",
        background: "var(--surface)",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 22,
        boxShadow: "0 28px 80px rgba(0,0,0,0.28)",
        overflow: "hidden",
      }}>
        <div style={{
          padding: "18px 22px",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 19, fontWeight: 800, color: "var(--text-1)" }}>
              워크스페이스 추가
            </div>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>
              새 워크스페이스를 만들거나 초대 코드로 참여해 보세요.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.08)",
              background: "var(--surface)",
              color: "var(--text-2)",
              cursor: "pointer",
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            ×
          </button>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 0,
        }}>
          <section style={{ padding: 22, borderRight: "1px solid rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 12 }}>
              새 워크스페이스
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                onCreate();
              }}
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
            >
              <input
                value={createName}
                onChange={(event) => onCreateNameChange(event.target.value)}
                placeholder="워크스페이스 이름"
                style={fieldStyle}
              />
              <textarea
                value={createDescription}
                onChange={(event) => onCreateDescriptionChange(event.target.value)}
                placeholder="워크스페이스 설명"
                rows={4}
                style={{ ...fieldStyle, resize: "vertical", minHeight: 108 }}
              />
              <button
                type="submit"
                disabled={creating}
                style={primaryButtonStyle(creating)}
              >
                {creating ? "생성 중" : "워크스페이스 생성"}
              </button>
            </form>
          </section>

          <section style={{ padding: 22 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 12 }}>
              초대 코드로 참여
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                onJoin();
              }}
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
            >
              <input
                value={joinCode}
                onChange={(event) => onJoinCodeChange(event.target.value)}
                placeholder="초대 코드 입력"
                autoComplete="off"
                spellCheck={false}
                style={fieldStyle}
              />
              <div style={{
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.06)",
                background: "transparent",
                fontSize: 12,
                color: "var(--text-3)",
                lineHeight: 1.7,
              }}>
                초대 코드를 입력하면 해당 워크스페이스에 바로 참여할 수 있어요.
                참여 후에는 그 안의 프로젝트를 함께 확인하고 작업할 수 있습니다.
              </div>
              <button
                type="submit"
                disabled={joining}
                style={primaryButtonStyle(joining)}
              >
                {joining ? "참여 중" : "참여하기"}
              </button>
            </form>
          </section>
        </div>

        {error && (
          <div style={{
            padding: "0 22px 20px",
            color: "#dc2626",
            fontSize: 12,
            fontWeight: 600,
          }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

const fieldStyle = {
  width: "100%",
  padding: "11px 13px",
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.12)",
  background: "transparent",
  color: "var(--text-1)",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};

function primaryButtonStyle(disabled) {
  return {
    padding: "11px 16px",
    borderRadius: 12,
    border: "none",
    background: "var(--text-1)",
    color: "var(--bg)",
    fontSize: 13,
    fontWeight: 700,
    cursor: disabled ? "progress" : "pointer",
    fontFamily: "inherit",
    opacity: disabled ? 0.72 : 1,
  };
}
