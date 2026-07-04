"use client";

import { useState } from "react";
import { EmptyState, Spinner } from "./PanelPrimitives";
import { MemberRow } from "./MemberRow";
import { buildInviteLink, getTeamId } from "./helpers";

function ActionButton({ children, onClick, disabled = false, danger = false, outlined = false }) {
  const background = danger
    ? disabled ? "rgba(239,68,68,0.5)" : "#ef4444"
    : outlined ? "var(--surface)" : "var(--text-1)";
  const color = danger ? "white" : outlined ? "var(--text-2)" : "var(--bg)";
  const border = outlined ? "1px solid var(--border-2)" : "none";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "9px 14px",
        borderRadius: "var(--db-radius-sm)",
        border,
        background,
        color,
        fontSize: 12,
        fontWeight: 700,
        cursor: disabled ? "progress" : "pointer",
        fontFamily: "inherit",
        opacity: disabled ? 0.75 : 1,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function sectionWrapperStyle(isHighlighted) {
  return {
    borderRadius: "var(--db-radius)",
    boxShadow: isHighlighted ? "0 0 0 2px rgba(107,105,96,0.18), 0 16px 34px rgba(26,25,22,0.08)" : "none",
    transition: "box-shadow 0.18s ease",
  };
}

function InviteCodeCard({
  inviteCode,
  isOwner,
  copiedTeamId,
  teamId,
  regenerating,
  onCopy,
  onRegenerateInviteCode,
}) {
  const [linkCopied, setLinkCopied] = useState(false);
  const inviteLink = buildInviteLink(inviteCode);
  const cardBackground = "var(--surface)";

  async function handleCopyInviteLink() {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 1200);
    } catch {
      setLinkCopied(false);
    }
  }

  return (
    <div style={{
      padding: 14,
      borderRadius: "var(--db-radius)",
      border: "1px solid var(--border)",
      background: cardBackground,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", marginBottom: 8 }}>
        초대 코드
      </div>

      {inviteCode ? (
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              color: "var(--text-3)",
              letterSpacing: ".07em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}>
              초대 코드
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <code style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: ".08em",
                padding: "6px 10px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text-1)",
              }}>
                {inviteCode}
              </code>
              <button
                type="button"
                onClick={() => onCopy(inviteCode, teamId)}
                style={{
                  padding: "7px 10px",
                  borderRadius: "var(--db-radius-sm)",
                  border: "1px solid var(--border-2)",
                  background: "var(--surface)",
                  color: "var(--text-2)",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {copiedTeamId === teamId ? "복사됨" : "코드 복사"}
              </button>
              {isOwner && (
                <button
                  type="button"
                  onClick={onRegenerateInviteCode}
                  disabled={regenerating}
                  style={{
                    padding: "7px 10px",
                    borderRadius: "var(--db-radius-sm)",
                    border: "1px solid var(--border-2)",
                    background: "var(--surface)",
                    color: "var(--text-2)",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: regenerating ? "progress" : "pointer",
                    fontFamily: "inherit",
                    opacity: regenerating ? 0.7 : 1,
                  }}
                >
                  {regenerating ? "재발급 중" : "코드 재발급"}
                </button>
              )}
            </div>
          </div>

          <div>
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              color: "var(--text-3)",
              letterSpacing: ".07em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}>
              초대 링크
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <a
                href={inviteLink}
                target="_blank"
                rel="noreferrer"
                style={{
                  flex: "1 1 240px",
                  minWidth: 0,
                  padding: "7px 10px",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text-2)",
                  fontSize: 12,
                  lineHeight: 1.5,
                  textDecoration: "none",
                  wordBreak: "break-all",
                }}
              >
                {inviteLink}
              </a>
              <button
                type="button"
                onClick={handleCopyInviteLink}
                style={{
                  padding: "7px 10px",
                  borderRadius: "var(--db-radius-sm)",
                  border: "1px solid var(--border-2)",
                  background: "var(--surface)",
                  color: "var(--text-2)",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {linkCopied ? "복사됨" : "링크 복사"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.6 }}>
          {isOwner
            ? "아직 사용할 수 있는 초대 코드가 없습니다. 새로고침하거나 재발급해 주세요."
            : "초대 코드는 소유자만 확인하고 재발급할 수 있어요."}
        </div>
      )}
    </div>
  );
}

function OwnerSettingsCard({
  teamNameDraft,
  teamDescriptionDraft,
  savingTeam,
  deleting,
  confirmDelete,
  onTeamNameChange,
  onTeamDescriptionChange,
  onSaveTeam,
  onConfirmDelete,
  onCancelDelete,
  onDeleteTeam,
}) {
  const cardBackground = "var(--surface)";
  const fieldBackground = "transparent";

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{
        padding: 14,
        borderRadius: "var(--db-radius)",
        border: "1px solid var(--border)",
        background: cardBackground,
        display: "grid",
        gap: 10,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)" }}>
          워크스페이스 설정
        </div>
        <input
          value={teamNameDraft}
          onChange={(event) => onTeamNameChange(event.target.value)}
          placeholder="워크스페이스 이름"
          style={{
            width: "100%",
            padding: "10px 13px",
            borderRadius: "var(--db-radius-sm)",
            border: "1px solid var(--border-2)",
            background: fieldBackground,
            color: "var(--text-1)",
            fontSize: 13,
            fontFamily: "inherit",
            outline: "none",
          }}
        />
        <textarea
          value={teamDescriptionDraft}
          onChange={(event) => onTeamDescriptionChange(event.target.value)}
          rows={3}
          placeholder="워크스페이스 설명"
          style={{
            width: "100%",
            padding: "10px 13px",
            borderRadius: "var(--db-radius-sm)",
            border: "1px solid var(--border-2)",
            background: fieldBackground,
            color: "var(--text-1)",
            fontSize: 13,
            fontFamily: "inherit",
            outline: "none",
            resize: "vertical",
            minHeight: 90,
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <ActionButton onClick={onSaveTeam} disabled={savingTeam}>
            {savingTeam ? "저장 중" : "저장"}
          </ActionButton>
        </div>
      </div>

      <div style={{
        padding: 14,
        borderRadius: "var(--db-radius)",
        border: "1px solid rgba(239,68,68,0.2)",
        background: "var(--surface)",
        display: "grid",
        gap: 10,
      }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", marginBottom: 4 }}>
            워크스페이스 삭제
          </div>
          <div style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.6 }}>
            팀, 멤버 연결, 이 워크스페이스에 속한 프로젝트 데이터까지 함께 정리됩니다.
          </div>
        </div>

        {!confirmDelete ? (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onConfirmDelete}
              style={{
                padding: "9px 14px",
                borderRadius: "var(--db-radius-sm)",
                border: "1px solid rgba(239,68,68,0.24)",
                background: "rgba(239,68,68,0.08)",
                color: "#dc2626",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              삭제하기
            </button>
          </div>
        ) : (
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}>
            <div style={{ fontSize: 11, color: "var(--text-2)", fontWeight: 600 }}>
              정말 이 워크스페이스를 삭제할까요?
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <ActionButton onClick={onCancelDelete} disabled={deleting} outlined>
                취소
              </ActionButton>
              <ActionButton onClick={onDeleteTeam} disabled={deleting} danger>
                {deleting ? "삭제 중" : "정말 삭제"}
              </ActionButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MemberActionsCard({
  leaving,
  onLeaveTeam,
}) {
  const cardBackground = "var(--surface)";

  return (
    <div style={{
      padding: 14,
      borderRadius: "var(--db-radius)",
      border: "1px solid var(--border)",
      background: cardBackground,
      display: "flex",
      justifyContent: "space-between",
      gap: 12,
      alignItems: "center",
      flexWrap: "wrap",
    }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-1)", marginBottom: 4 }}>
          워크스페이스 나가기
        </div>
        <div style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.5 }}>
          소유자는 먼저 권한을 이전해야 나갈 수 있어요.
        </div>
      </div>
      <button
        type="button"
        onClick={onLeaveTeam}
        disabled={leaving}
        style={{
          padding: "9px 14px",
          borderRadius: "var(--db-radius-sm)",
          border: "1px solid rgba(239,68,68,0.24)",
          background: "rgba(239,68,68,0.06)",
          color: "#dc2626",
          fontSize: 12,
          fontWeight: 700,
          cursor: leaving ? "progress" : "pointer",
          fontFamily: "inherit",
          opacity: leaving ? 0.75 : 1,
        }}
      >
        {leaving ? "나가는 중" : "나가기"}
      </button>
    </div>
  );
}

function MembersCard({
  isOwner,
  selfId,
  teamMembers,
  transferTargetId,
  transferring,
  removingMemberId,
  changingRoleMemberId,
  onTransferTargetChange,
  onTransferOwnership,
  onRemoveMember,
  onRoleChange,
}) {
  const transferableMembers = teamMembers.filter((member) => member.teamRole !== "OWNER");
  const cardBackground = "var(--surface)";
  const fieldBackground = "transparent";
  const memberBackground = "transparent";

  return (
    <div style={{
      padding: 14,
      borderRadius: "var(--db-radius)",
      border: "1px solid var(--border)",
      background: cardBackground,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", marginBottom: 8 }}>
        권한 및 멤버 관리
      </div>
      <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.6, marginBottom: 10 }}>
        소유자 이전, 멤버·게스트 역할 변경, 강퇴는 여기에서 관리할 수 있어요.
      </div>

      {isOwner && transferableMembers.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto",
          gap: 10,
          alignItems: "center",
          marginBottom: 12,
        }}>
          <select
            value={transferTargetId}
            onChange={(event) => onTransferTargetChange(event.target.value)}
            style={{
              width: "100%",
              padding: "10px 13px",
              borderRadius: "var(--db-radius-sm)",
              border: "1px solid var(--border-2)",
              background: fieldBackground,
              color: "var(--text-1)",
              fontSize: 13,
              fontFamily: "inherit",
              outline: "none",
            }}
          >
            <option value="">소유자로 넘길 멤버 선택</option>
            {transferableMembers.map((member) => (
              <option key={member.memberId} value={member.memberId}>
                {member.memberName}
              </option>
            ))}
          </select>
          <ActionButton onClick={onTransferOwnership} disabled={transferring}>
            {transferring ? "이전 중" : "소유자 이전"}
          </ActionButton>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {teamMembers.map((member) => (
          <MemberRow
            key={member.memberId}
            member={member}
            isSelf={Number(selfId) === Number(member.memberId)}
            canRemove={isOwner}
            canChangeRole={isOwner}
            onRemove={onRemoveMember}
            onRoleChange={onRoleChange}
            removing={removingMemberId === member.memberId}
            changingRole={changingRoleMemberId === member.memberId}
            background={memberBackground}
          />
        ))}
      </div>
    </div>
  );
}

export function WorkspaceDetailPanel({
  workspaceLoading,
  workspaceError,
  workspaceSummary,
  isOwner,
  isActiveWorkspace,
  selfId,
  teamMembers,
  teamNameDraft,
  teamDescriptionDraft,
  transferTargetId,
  copiedTeamId,
  confirmDelete,
  savingTeam,
  regenerating,
  transferring,
  leaving,
  deleting,
  removingMemberId,
  changingRoleMemberId,
  variant = "default",
  hideSummary = false,
  hideSetActiveWorkspace = false,
  sectionRefs = {},
  highlightSection = null,
  onTeamNameChange,
  onTeamDescriptionChange,
  onTransferTargetChange,
  onCopy,
  onSaveTeam,
  onRegenerateInviteCode,
  onTransferOwnership,
  onRemoveMember,
  onRoleChange,
  onLeaveTeam,
  onConfirmDelete,
  onCancelDelete,
  onDeleteTeam,
  onSetActiveWorkspace,
}) {
  if (workspaceLoading) {
    return <Spinner />;
  }

  if (workspaceError) {
    return (
      <EmptyState
        icon="⚠️"
        title="워크스페이스 정보를 불러오지 못했습니다"
        desc={workspaceError}
      />
    );
  }

  if (!workspaceSummary) {
    return (
      <EmptyState
        icon="👆"
        title="워크스페이스를 선택해 주세요"
        desc="왼쪽 목록에서 팀을 클릭하면 해당 워크스페이스의 초대 코드와 멤버를 관리할 수 있어요."
      />
    );
  }

  const teamId = getTeamId(workspaceSummary);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {!hideSummary && (
        <div
          ref={sectionRefs?.overview}
          style={sectionWrapperStyle(highlightSection === "overview")}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-1)" }}>
              {workspaceSummary.teamName ?? workspaceSummary.name ?? "워크스페이스"}
            </div>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 999,
              background: isOwner ? "rgba(26,25,22,0.1)" : "rgba(59,130,246,0.08)",
              color: isOwner ? "var(--text-1)" : "#2563EB",
            }}>
              {isOwner ? "소유자" : "멤버"}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 6, lineHeight: 1.6 }}>
            {workspaceSummary.description || "설명이 없습니다."}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        <div
          ref={sectionRefs?.invite}
          style={sectionWrapperStyle(highlightSection === "invite")}
        >
          <InviteCodeCard
            inviteCode={workspaceSummary.inviteCode}
            isOwner={isOwner}
            copiedTeamId={copiedTeamId}
            teamId={teamId}
            regenerating={regenerating}
            onCopy={onCopy}
            onRegenerateInviteCode={onRegenerateInviteCode}
            variant={variant}
          />
        </div>

        <div
          ref={sectionRefs?.settings}
          style={sectionWrapperStyle(highlightSection === "settings")}
        >
          {isOwner ? (
            <OwnerSettingsCard
              teamNameDraft={teamNameDraft}
              teamDescriptionDraft={teamDescriptionDraft}
              savingTeam={savingTeam}
              deleting={deleting}
              confirmDelete={confirmDelete}
              onTeamNameChange={onTeamNameChange}
              onTeamDescriptionChange={onTeamDescriptionChange}
              onSaveTeam={onSaveTeam}
              onConfirmDelete={onConfirmDelete}
              onCancelDelete={onCancelDelete}
              onDeleteTeam={onDeleteTeam}
              variant={variant}
            />
          ) : (
            <MemberActionsCard
              leaving={leaving}
              onLeaveTeam={onLeaveTeam}
              variant={variant}
            />
          )}
        </div>
      </div>

      <div
        ref={sectionRefs?.members}
        style={sectionWrapperStyle(highlightSection === "members")}
      >
        <MembersCard
          isOwner={isOwner}
          selfId={selfId}
          teamMembers={teamMembers}
          transferTargetId={transferTargetId}
          transferring={transferring}
          removingMemberId={removingMemberId}
          changingRoleMemberId={changingRoleMemberId}
          onTransferTargetChange={onTransferTargetChange}
          onTransferOwnership={onTransferOwnership}
          onRemoveMember={onRemoveMember}
          onRoleChange={onRoleChange}
          variant={variant}
        />
      </div>

      {!hideSetActiveWorkspace && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() => onSetActiveWorkspace(teamId)}
            disabled={isActiveWorkspace}
            style={{
              padding: "9px 14px",
              borderRadius: "var(--db-radius-sm)",
              border: "1px solid var(--border-2)",
              background: isActiveWorkspace ? "var(--border)" : "var(--surface)",
              color: isActiveWorkspace ? "var(--text-3)" : "var(--text-2)",
              fontSize: 12,
              fontWeight: 700,
              cursor: isActiveWorkspace ? "default" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {isActiveWorkspace ? "현재 작업공간" : "현재 작업공간으로 설정"}
          </button>
        </div>
      )}
    </div>
  );
}
