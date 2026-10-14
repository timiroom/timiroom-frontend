"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Spinner } from "@/components/dashboard/mypage/teamWorkspace/PanelPrimitives";
import { buildInviteLink, getDefaultTransferTarget } from "@/components/dashboard/mypage/teamWorkspace/helpers";
import { GithubConnectionSection } from "@/components/dashboard/workspace/GithubConnectionSection";
import { ActionButton, Avatar, Badge, SettingsEmpty, SettingsHeader, SettingsItem, SettingsRow, SettingsSection } from "@/components/ui";
import {
  deleteTeam,
  leaveTeam,
  regenerateTeamInviteCode,
  removeTeamMember,
  transferTeamOwnership,
  updateTeam,
  updateTeamIcon,
  updateTeamMemberRole,
  uploadWorkspaceIcon,
} from "@/lib/teamApi";
import { fetchTeamGithubInstallations } from "@/lib/githubApi";
import { useToast } from "@/context/ToastContext";
import { confirmDialog } from "@/lib/feedback";

const ROLE_LABEL = { OWNER: "소유자", MEMBER: "멤버", GUEST: "게스트" };

export const WORKSPACE_PAGES = {
  general: "일반",
  members: "멤버·초대",
  github: "GitHub 연동",
  manage: "이전·삭제",
};

/**
 * 설정 > 워크스페이스의 한 페이지(page: general | members | github | manage).
 * 데이터는 SettingsView가 불러와 넘기고, 바꾼 뒤에는 onReloadWorkspace로 다시 받는다.
 * 삭제하거나 나가면 onWorkspaceGone으로 알려 대시보드로 돌아가게 한다.
 */
export function WorkspaceSettings({
  page,
  workspaceId,
  workspaceDetail,
  workspaceLoading,
  currentUserId,
  onReloadWorkspace,
  onReloadWorkspaces,
  onWorkspaceGone,
}) {
  const { showToast } = useToast();
  const [githubInstallations, setGithubInstallations] = useState([]);
  const [githubInstallationsLoading, setGithubInstallationsLoading] = useState(false);
  const [teamNameDraft, setTeamNameDraft] = useState("");
  const [teamDescriptionDraft, setTeamDescriptionDraft] = useState("");
  const [transferTargetId, setTransferTargetId] = useState("");
  const [savingTeam, setSavingTeam] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState(null);
  const [changingRoleMemberId, setChangingRoleMemberId] = useState(null);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const iconFileRef = useRef(null);

  const workspaceSummary = workspaceDetail?.team ?? null;
  const teamMembers = useMemo(() => workspaceDetail?.members ?? [], [workspaceDetail?.members]);
  const viewerRole = workspaceDetail?.viewerRole ?? workspaceSummary?.viewerRole ?? "";
  const isOwner = viewerRole === "OWNER";

  useEffect(() => {
    setTeamNameDraft(workspaceSummary?.teamName ?? workspaceSummary?.name ?? "");
    setTeamDescriptionDraft(workspaceSummary?.description ?? "");
    setTransferTargetId(getDefaultTransferTarget(teamMembers));
  }, [workspaceSummary?.teamName, workspaceSummary?.name, workspaceSummary?.description, teamMembers]);

  useEffect(() => {
    if (page !== "github" || !workspaceId) return undefined;
    let cancelled = false;
    setGithubInstallationsLoading(true);
    fetchTeamGithubInstallations(workspaceId)
      .then(data => { if (!cancelled) setGithubInstallations(data); })
      .catch(() => { if (!cancelled) setGithubInstallations([]); })
      .finally(() => { if (!cancelled) setGithubInstallationsLoading(false); });
    return () => { cancelled = true; };
  }, [page, workspaceId]);

  async function reloadAll() {
    await onReloadWorkspaces?.();
    await onReloadWorkspace?.();
  }

  async function handleCopy(text, label) {
    try {
      await navigator.clipboard.writeText(text);
      showToast("success", `${label}를 복사했어요.`);
    } catch {
      showToast("error", `${label}를 복사하지 못했어요.`);
    }
  }

  async function handleSaveTeam() {
    if (!workspaceId || !isOwner) return;
    setSavingTeam(true);
    try {
      await updateTeam(workspaceId, { teamName: teamNameDraft.trim(), description: teamDescriptionDraft.trim() });
      await reloadAll();
      showToast("success", "워크스페이스 정보를 저장했어요.");
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "워크스페이스 저장에 실패했습니다.");
    } finally {
      setSavingTeam(false);
    }
  }

  async function handleIconChange(e) {
    const file = e.target.files?.[0];
    if (!file || !workspaceId) return;
    setUploadingIcon(true);
    try {
      const url = await uploadWorkspaceIcon(file);
      await updateTeamIcon(workspaceId, url);
      await reloadAll();
      showToast("success", "워크스페이스 아이콘을 저장했어요.");
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "아이콘 업로드에 실패했습니다.");
    } finally {
      setUploadingIcon(false);
      if (iconFileRef.current) iconFileRef.current.value = "";
    }
  }

  async function handleRegenerateInviteCode() {
    if (!workspaceId || !isOwner) return;
    const ok = await confirmDialog("초대 코드를 새로 발급할까요? 지금까지 보낸 초대 코드와 링크는 더 이상 쓸 수 없습니다.", { confirmLabel: "재발급" });
    if (!ok) return;
    setRegenerating(true);
    try {
      await regenerateTeamInviteCode(workspaceId);
      await reloadAll();
      showToast("success", "초대 코드를 새로 발급했어요.");
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "초대 코드 재발급에 실패했습니다.");
    } finally {
      setRegenerating(false);
    }
  }

  async function handleTransferOwnership() {
    if (!workspaceId || !isOwner) return;
    if (!transferTargetId) {
      showToast("error", "소유자 권한을 넘길 멤버를 선택해 주세요.");
      return;
    }
    const target = teamMembers.find((member) => String(member.memberId) === String(transferTargetId));
    const ok = await confirmDialog(
      `${target?.memberName || target?.email || "선택한 멤버"}에게 소유자 권한을 넘길까요? 넘긴 뒤에는 나는 멤버가 되어 이름 변경, 멤버 관리, 워크스페이스 삭제를 할 수 없습니다.`,
      { confirmLabel: "소유자 이전", danger: true },
    );
    if (!ok) return;
    setTransferring(true);
    try {
      await transferTeamOwnership(workspaceId, Number(transferTargetId));
      await reloadAll();
      showToast("success", "소유자 권한을 이전했어요.");
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "소유자 권한 이전에 실패했습니다.");
    } finally {
      setTransferring(false);
    }
  }

  async function handleRemoveMember(memberId) {
    if (!workspaceId || !isOwner) return;
    const target = teamMembers.find((member) => member.memberId === memberId);
    const ok = await confirmDialog(
      `${target?.memberName || target?.email || "이 멤버"}을(를) 워크스페이스에서 제거할까요? 다시 참여하려면 초대 코드가 필요합니다.`,
      { confirmLabel: "제거", danger: true },
    );
    if (!ok) return;
    setRemovingMemberId(memberId);
    try {
      await removeTeamMember(workspaceId, memberId);
      await reloadAll();
      showToast("success", "멤버를 제거했어요.");
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "멤버 제거에 실패했습니다.");
    } finally {
      setRemovingMemberId(null);
    }
  }

  async function handleRoleChange(memberId, newRole) {
    if (!workspaceId || !isOwner) return;
    setChangingRoleMemberId(memberId);
    try {
      await updateTeamMemberRole(workspaceId, memberId, newRole);
      await reloadAll();
      showToast("success", "역할을 변경했어요.");
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "역할 변경에 실패했습니다.");
    } finally {
      setChangingRoleMemberId(null);
    }
  }

  async function handleLeaveTeam() {
    if (!workspaceId) return;
    const ok = await confirmDialog("이 워크스페이스에서 나갈까요? 다시 참여하려면 초대 코드가 필요합니다.", { confirmLabel: "나가기", danger: true });
    if (!ok) return;
    setLeaving(true);
    try {
      await leaveTeam(workspaceId);
      showToast("success", "워크스페이스에서 나왔어요.");
      onWorkspaceGone?.();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "워크스페이스 나가기에 실패했습니다.");
      setLeaving(false);
    }
  }

  async function handleDeleteTeam() {
    if (!workspaceId || !isOwner) return;
    const ok = await confirmDialog(
      `${workspaceSummary?.teamName ?? "이 워크스페이스"}를 삭제할까요? 멤버 연결과 이 워크스페이스의 프로젝트 데이터가 모두 지워지며 되돌릴 수 없습니다.`,
      { confirmLabel: "영구 삭제", danger: true },
    );
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteTeam(workspaceId);
      showToast("success", "워크스페이스를 삭제했어요.");
      onWorkspaceGone?.();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "워크스페이스 삭제에 실패했습니다.");
      setDeleting(false);
    }
  }

  if (!workspaceId) {
    return <SettingsEmpty>속한 워크스페이스가 없습니다. 대시보드에서 새로 만들거나 초대 코드로 참여해 주세요.</SettingsEmpty>;
  }
  if (workspaceLoading && !workspaceSummary) return <Spinner />;

  const workspaceName = workspaceSummary?.teamName ?? workspaceSummary?.name ?? "워크스페이스";
  const iconUrl = workspaceSummary?.iconUrl;
  const inviteCode = workspaceSummary?.inviteCode ?? "";
  const inviteLink = buildInviteLink(inviteCode);
  const generalDirty = teamNameDraft.trim() !== (workspaceSummary?.teamName ?? "").trim()
    || teamDescriptionDraft.trim() !== (workspaceSummary?.description ?? "").trim();
  const transferCandidates = teamMembers.filter((member) => member.teamRole !== "OWNER");

  const header = (
    <SettingsHeader
      leading={<Avatar name={workspaceName} src={iconUrl} size={40} square />}
      title={page === "manage" && !isOwner ? "나가기" : WORKSPACE_PAGES[page]}
      meta={<>
        <span>{workspaceName}</span>
        <span aria-hidden="true">·</span>
        <span>내 역할 {ROLE_LABEL[viewerRole] ?? "멤버"}</span>
      </>}
    />
  );

  if (page === "general") return (
    <>
      {header}
      <SettingsSection
        description={isOwner ? "워크스페이스 이름과 설명은 멤버 모두에게 보입니다." : "이름과 설명은 소유자만 바꿀 수 있습니다."}
        footer={isOwner && <>
          <span>{generalDirty ? "저장하지 않은 변경이 있습니다." : "변경 사항 없음"}</span>
          <ActionButton variant="primary" disabled={!generalDirty || savingTeam || !teamNameDraft.trim()} onClick={handleSaveTeam}>
            {savingTeam ? "저장 중…" : "저장"}
          </ActionButton>
        </>}
      >
        <SettingsRow label="아이콘" description={isOwner ? "정사각형 이미지를 권장합니다. JPG, PNG, WebP" : null}>
          <Avatar name={workspaceName} src={iconUrl} size={36} square />
          {isOwner && (
            <>
              <input ref={iconFileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleIconChange} style={{ display: "none" }} />
              <ActionButton disabled={uploadingIcon} onClick={() => iconFileRef.current?.click()}>
                {uploadingIcon ? "올리는 중…" : "이미지 변경"}
              </ActionButton>
            </>
          )}
        </SettingsRow>
        <SettingsRow label="이름">
          {isOwner
            ? <input className="ui-input" value={teamNameDraft} maxLength={50} onChange={(e) => setTeamNameDraft(e.target.value)} placeholder="워크스페이스 이름" aria-label="워크스페이스 이름" />
            : <span style={{ fontSize: 13, color: "var(--text-1)" }}>{workspaceName}</span>}
        </SettingsRow>
        <SettingsRow label="설명" stacked>
          {isOwner
            ? <textarea className="ui-input" value={teamDescriptionDraft} rows={3} onChange={(e) => setTeamDescriptionDraft(e.target.value)} placeholder="팀이 무엇을 하는지 한두 문장으로 적어 주세요." aria-label="워크스페이스 설명" />
            : <span style={{ fontSize: 13, color: "var(--text-2)" }}>{workspaceSummary?.description?.trim() || "설명이 없습니다."}</span>}
        </SettingsRow>
      </SettingsSection>
    </>
  );

  if (page === "members") return (
    <>
      {header}
      <SettingsSection title="초대" description="코드나 링크를 받은 사람은 멤버로 참여합니다. 재발급하면 이전 코드와 링크는 쓸 수 없습니다.">
        {inviteCode ? (
          <>
            <SettingsRow label="초대 코드">
              <span className="ui-code">{inviteCode}</span>
              <ActionButton onClick={() => handleCopy(inviteCode, "초대 코드")}>복사</ActionButton>
              {isOwner && <ActionButton disabled={regenerating} onClick={handleRegenerateInviteCode}>{regenerating ? "발급 중…" : "재발급"}</ActionButton>}
            </SettingsRow>
            <SettingsRow label="초대 링크">
              <input className="ui-input ui-input--mono" readOnly value={inviteLink} aria-label="초대 링크" onFocus={(e) => e.target.select()} style={{ flex: "1 1 220px", width: "auto" }} />
              <ActionButton onClick={() => handleCopy(inviteLink, "초대 링크")}>복사</ActionButton>
            </SettingsRow>
          </>
        ) : (
          <SettingsEmpty>{isOwner ? "사용할 수 있는 초대 코드가 없습니다. 재발급해 주세요." : "초대 코드는 소유자만 확인할 수 있습니다."}</SettingsEmpty>
        )}
      </SettingsSection>

      <SettingsSection title={`멤버 ${teamMembers.length}명`} description="소유자는 이름·초대 코드·멤버를 관리합니다. 게스트는 프로젝트를 만들 수 없습니다.">
        {teamMembers.length === 0 ? <SettingsEmpty>멤버가 없습니다.</SettingsEmpty> : teamMembers.map((member) => {
          const isSelf = String(member.memberId) === String(currentUserId);
          const manageable = isOwner && !isSelf && member.teamRole !== "OWNER";
          const name = member.memberName || member.email || "이름 없음";
          return (
            <SettingsItem
              key={member.memberId}
              leading={<Avatar name={name} />}
              title={<>{name}{isSelf && <Badge>나</Badge>}</>}
              subtitle={member.email}
              trailing={manageable ? (
                <>
                  <select className="ui-input" value={member.teamRole} disabled={changingRoleMemberId === member.memberId} onChange={(e) => handleRoleChange(member.memberId, e.target.value)} aria-label={`${name} 역할`}>
                    <option value="MEMBER">멤버</option>
                    <option value="GUEST">게스트</option>
                  </select>
                  <ActionButton variant="ghost" disabled={removingMemberId === member.memberId} onClick={() => handleRemoveMember(member.memberId)}>
                    {removingMemberId === member.memberId ? "제거 중…" : "제거"}
                  </ActionButton>
                </>
              ) : <Badge>{ROLE_LABEL[member.teamRole] ?? "멤버"}</Badge>}
            />
          );
        })}
      </SettingsSection>
    </>
  );

  if (page === "github") return (
    <>
      {header}
      <GithubConnectionSection
        title="연결된 GitHub 계정"
        teamId={workspaceId}
        isOwner={isOwner}
        installations={githubInstallations}
        installationsLoading={githubInstallationsLoading}
        onInstallationsChange={setGithubInstallations}
      />
    </>
  );

  return (
    <>
      {header}
      {isOwner ? (
        <SettingsSection tone="danger" description="되돌리기 어려운 작업입니다. 실행 전에 한 번 더 확인합니다.">
          <SettingsRow label="소유자 이전" description="다른 멤버에게 소유자 권한을 넘깁니다. 넘긴 뒤 나는 멤버가 됩니다.">
            {transferCandidates.length === 0 ? (
              <span style={{ fontSize: 12, color: "var(--text-3)" }}>넘길 수 있는 멤버가 없습니다.</span>
            ) : (
              <>
                <select className="ui-input" value={transferTargetId} onChange={(e) => setTransferTargetId(e.target.value)} aria-label="소유자로 넘길 멤버">
                  {transferCandidates.map((member) => (
                    <option key={member.memberId} value={String(member.memberId)}>{member.memberName || member.email}</option>
                  ))}
                </select>
                <ActionButton variant="danger" disabled={transferring || !transferTargetId} onClick={handleTransferOwnership}>
                  {transferring ? "이전 중…" : "소유자 이전"}
                </ActionButton>
              </>
            )}
          </SettingsRow>
          <SettingsRow label="워크스페이스 삭제" description="멤버 연결과 이 워크스페이스의 프로젝트 데이터가 모두 지워지며 되돌릴 수 없습니다.">
            <ActionButton variant="danger" disabled={deleting} onClick={handleDeleteTeam}>{deleting ? "삭제 중…" : "워크스페이스 삭제"}</ActionButton>
          </SettingsRow>
        </SettingsSection>
      ) : (
        <SettingsSection tone="danger">
          <SettingsRow label="워크스페이스 나가기" description="나가면 이 워크스페이스의 프로젝트에 접근할 수 없습니다. 다시 참여하려면 초대 코드가 필요합니다.">
            <ActionButton variant="danger" disabled={leaving} onClick={handleLeaveTeam}>{leaving ? "나가는 중…" : "나가기"}</ActionButton>
          </SettingsRow>
        </SettingsSection>
      )}
    </>
  );
}
