"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { WorkspaceDetailPanel } from "@/components/dashboard/mypage/teamWorkspace/WorkspaceDetailPanel";
import { EmptyState, Spinner } from "@/components/dashboard/mypage/teamWorkspace/PanelPrimitives";
import { getDefaultTransferTarget, getTeamId } from "@/components/dashboard/mypage/teamWorkspace/helpers";
import { GithubConnectionSection } from "@/components/dashboard/workspace/GithubConnectionSection";
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
import { fetchProjectsByTeam } from "@/lib/projectApi";
import { fetchTeamGithubInstallations } from "@/lib/githubApi";

const C = {
  bg: "var(--bg)",
  topbar: "var(--surface)",
  border: "var(--border)",
  text: "#1a1916",
  muted: "var(--text-3)",
  subtle: "var(--text-2)",
  accent: "#6b6960",
};

const STATUS_META = {
  active:    { label: "진행 중", color: "#6b55dc", bg: "rgba(107,85,220,0.1)" },
  running:   { label: "생성 중", color: "#6b55dc", bg: "rgba(107,85,220,0.1)" },
  draft:     { label: "초안",    color: "#a8a69f", bg: "rgba(168,166,159,0.12)" },
  completed: { label: "완료",    color: "#10B981", bg: "rgba(16,185,129,0.1)"  },
  paused:    { label: "정지",    color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
  archived:  { label: "보관",    color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
};

function ProjectItem({ project, onClick }) {
  const [hovered, setHovered] = useState(false);
  const meta = STATUS_META[project.status] ?? STATUS_META.draft;
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "10px 14px",
        background: hovered ? "var(--bg)" : "transparent",
        border: `1px solid ${hovered ? "var(--border-2)" : C.border}`,
        borderRadius: 10,
        cursor: "pointer", transition: "all 0.15s",
        marginBottom: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: project.color ?? meta.color }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {project.name}
          </div>
          {project.description && (
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {project.description}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: meta.bg, color: meta.color }}>
          {meta.label}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>
    </div>
  );
}

function FeedbackBanner({ feedback }) {
  if (!feedback) return null;

  return (
    <div style={{
      marginBottom: 16,
      padding: "12px 14px",
      borderRadius: 12,
      border: `1px solid ${feedback.type === "error" ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.18)"}`,
      background: "var(--surface)",
      color: feedback.type === "error" ? "#dc2626" : "#059669",
      fontSize: 12,
      fontWeight: 700,
    }}>
      {feedback.message}
    </div>
  );
}

function QuickJumpButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 12px",
        borderRadius: 999,
        border: `1px solid ${active ? "rgba(26,25,22,0.16)" : "rgba(0,0,0,0.08)"}`,
        background: active ? "transparent" : "var(--surface)",
        color: active ? "var(--text-1)" : "var(--text-2)",
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "inherit",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

export function WorkspaceManagementView({
  activeWorkspaceId,
  workspaceDetail,
  workspaceLoading,
  currentUserId,
  onOpenComposer,
  focusedSection = "overview",
  onReloadWorkspace,
  onReloadWorkspaces,
  onBack,
}) {
  const router = useRouter();
  const [workspaceProjects, setWorkspaceProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [githubInstallations, setGithubInstallations] = useState([]);
  const [githubInstallationsLoading, setGithubInstallationsLoading] = useState(false);
  const [teamNameDraft, setTeamNameDraft] = useState("");
  const [teamDescriptionDraft, setTeamDescriptionDraft] = useState("");
  const [transferTargetId, setTransferTargetId] = useState("");
  const [copiedTeamId, setCopiedTeamId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [savingTeam, setSavingTeam] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState(null);
  const [changingRoleMemberId, setChangingRoleMemberId] = useState(null);
  const [activeSection, setActiveSection] = useState(focusedSection || "overview");
  const [highlightedSection, setHighlightedSection] = useState(null);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [iconHovered, setIconHovered] = useState(false);
  const overviewRef = useRef(null);
  const projectsRef = useRef(null);
  const githubRef = useRef(null);
  const inviteRef = useRef(null);
  const settingsRef = useRef(null);
  const membersRef = useRef(null);
  const highlightTimeoutRef = useRef(null);
  const iconFileRef = useRef(null);

  const workspaceSummary = workspaceDetail?.team ?? null;
  const teamMembers = useMemo(() => workspaceDetail?.members ?? [], [workspaceDetail?.members]);
  const viewerRole = workspaceDetail?.viewerRole ?? workspaceSummary?.viewerRole ?? "";
  const isOwner = viewerRole === "OWNER";

  useEffect(() => {
    setTeamNameDraft(workspaceSummary?.teamName ?? workspaceSummary?.name ?? "");
    setTeamDescriptionDraft(workspaceSummary?.description ?? "");
    setTransferTargetId(getDefaultTransferTarget(teamMembers));
    setConfirmDelete(false);
  }, [workspaceSummary?.teamName, workspaceSummary?.name, workspaceSummary?.description, teamMembers]);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!activeWorkspaceId) {
      setWorkspaceProjects([]);
      return;
    }
    let cancelled = false;
    setProjectsLoading(true);
    fetchProjectsByTeam(activeWorkspaceId)
      .then(data => { if (!cancelled) setWorkspaceProjects(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setWorkspaceProjects([]); })
      .finally(() => { if (!cancelled) setProjectsLoading(false); });
    return () => { cancelled = true; };
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (!activeWorkspaceId) {
      setGithubInstallations([]);
      return;
    }
    let cancelled = false;
    setGithubInstallationsLoading(true);
    fetchTeamGithubInstallations(activeWorkspaceId)
      .then(data => { if (!cancelled) setGithubInstallations(data); })
      .catch(() => { if (!cancelled) setGithubInstallations([]); })
      .finally(() => { if (!cancelled) setGithubInstallationsLoading(false); });
    return () => { cancelled = true; };
  }, [activeWorkspaceId]);

  function focusSection(sectionKey) {
    const sectionMap = {
      overview: overviewRef,
      projects: projectsRef,
      github: githubRef,
      invite: inviteRef,
      settings: settingsRef,
      members: membersRef,
    };
    const targetRef = sectionMap[sectionKey];
    if (!targetRef?.current) return;

    setActiveSection(sectionKey);
    setHighlightedSection(sectionKey);
    targetRef.current.scrollIntoView({ behavior: "smooth", block: "start" });

    if (highlightTimeoutRef.current) {
      window.clearTimeout(highlightTimeoutRef.current);
    }
    highlightTimeoutRef.current = window.setTimeout(() => {
      setHighlightedSection((current) => (current === sectionKey ? null : current));
    }, 1600);
  }

  useEffect(() => {
    if (!focusedSection || focusedSection === "overview" || workspaceLoading || !workspaceSummary) return;
    focusSection(focusedSection);
  }, [focusedSection, workspaceLoading, workspaceSummary, activeWorkspaceId]);

  async function reloadCurrentWorkspace(teamId = activeWorkspaceId) {
    if (teamId == null) return;
    await onReloadWorkspace?.(teamId);
  }

  async function refreshWorkspaceList(targetWorkspaceId = activeWorkspaceId) {
    return await onReloadWorkspaces?.(targetWorkspaceId);
  }

  async function handleCopy(inviteCode, teamId) {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopiedTeamId(teamId);
      setFeedback({ type: "success", message: "초대 코드를 복사했어요." });
      window.setTimeout(() => {
        setCopiedTeamId((current) => (current === teamId ? null : current));
      }, 1200);
    } catch {
      setFeedback({ type: "error", message: "초대 코드를 복사하지 못했어요." });
    }
  }

  async function handleSaveTeam() {
    if (!activeWorkspaceId || !isOwner) return;

    setSavingTeam(true);
    setFeedback(null);
    try {
      await updateTeam(activeWorkspaceId, {
        teamName: teamNameDraft.trim(),
        description: teamDescriptionDraft.trim(),
      });
      await refreshWorkspaceList(activeWorkspaceId);
      await reloadCurrentWorkspace(activeWorkspaceId);
      setFeedback({ type: "success", message: "워크스페이스 정보를 저장했어요." });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "워크스페이스 저장에 실패했습니다." });
    } finally {
      setSavingTeam(false);
    }
  }

  async function handleIconChange(e) {
    const file = e.target.files?.[0];
    if (!file || !activeWorkspaceId) return;
    setUploadingIcon(true);
    setFeedback(null);
    try {
      const url = await uploadWorkspaceIcon(file);
      await updateTeamIcon(activeWorkspaceId, url);
      await refreshWorkspaceList(activeWorkspaceId);
      await reloadCurrentWorkspace(activeWorkspaceId);
      setFeedback({ type: "success", message: "워크스페이스 아이콘을 저장했어요." });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "아이콘 업로드에 실패했습니다." });
    } finally {
      setUploadingIcon(false);
      if (iconFileRef.current) iconFileRef.current.value = "";
    }
  }

  async function handleRegenerateInviteCode() {
    if (!activeWorkspaceId || !isOwner) return;

    setRegenerating(true);
    setFeedback(null);
    try {
      await regenerateTeamInviteCode(activeWorkspaceId);
      await refreshWorkspaceList(activeWorkspaceId);
      await reloadCurrentWorkspace(activeWorkspaceId);
      setFeedback({ type: "success", message: "초대 코드를 새로 발급했어요." });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "초대 코드 재발급에 실패했습니다." });
    } finally {
      setRegenerating(false);
    }
  }

  async function handleTransferOwnership() {
    if (!activeWorkspaceId || !isOwner) return;
    if (!transferTargetId) {
      setFeedback({ type: "error", message: "소유자 권한을 넘길 멤버를 선택해 주세요." });
      return;
    }

    setTransferring(true);
    setFeedback(null);
    try {
      await transferTeamOwnership(activeWorkspaceId, Number(transferTargetId));
      await refreshWorkspaceList(activeWorkspaceId);
      await reloadCurrentWorkspace(activeWorkspaceId);
      setFeedback({ type: "success", message: "소유자 권한을 이전했어요." });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "소유자 권한 이전에 실패했습니다." });
    } finally {
      setTransferring(false);
    }
  }

  async function handleRemoveMember(memberId) {
    if (!activeWorkspaceId || !isOwner) return;

    setRemovingMemberId(memberId);
    setFeedback(null);
    try {
      await removeTeamMember(activeWorkspaceId, memberId);
      await refreshWorkspaceList(activeWorkspaceId);
      await reloadCurrentWorkspace(activeWorkspaceId);
      setFeedback({ type: "success", message: "멤버를 제거했어요." });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "멤버 제거에 실패했습니다." });
    } finally {
      setRemovingMemberId(null);
    }
  }

  async function handleRoleChange(memberId, newRole) {
    if (!activeWorkspaceId || !isOwner) return;

    setChangingRoleMemberId(memberId);
    setFeedback(null);
    try {
      await updateTeamMemberRole(activeWorkspaceId, memberId, newRole);
      await refreshWorkspaceList(activeWorkspaceId);
      await reloadCurrentWorkspace(activeWorkspaceId);
      setFeedback({ type: "success", message: "역할을 변경했어요." });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "역할 변경에 실패했습니다." });
    } finally {
      setChangingRoleMemberId(null);
    }
  }

  async function handleLeaveTeam() {
    if (!activeWorkspaceId) return;

    setLeaving(true);
    setFeedback(null);
    try {
      await leaveTeam(activeWorkspaceId);
      await refreshWorkspaceList(activeWorkspaceId);
      setFeedback({ type: "success", message: "워크스페이스에서 나왔어요." });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "워크스페이스 나가기에 실패했습니다." });
    } finally {
      setLeaving(false);
    }
  }

  async function handleDeleteTeam() {
    if (!activeWorkspaceId || !isOwner) return;

    setDeleting(true);
    setFeedback(null);
    try {
      await deleteTeam(activeWorkspaceId);
      await refreshWorkspaceList(activeWorkspaceId);
      setConfirmDelete(false);
      setFeedback({ type: "success", message: "워크스페이스를 삭제했어요." });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "워크스페이스 삭제에 실패했습니다." });
    } finally {
      setDeleting(false);
    }
  }

  if (activeWorkspaceId == null) {
    return (
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: C.bg,
      }}>
        <div style={{
          height: 52,
          width: "100%",
          flexShrink: 0,
          borderBottom: `1px solid ${C.border}`,
          background: C.topbar,
          display: "flex",
          alignItems: "center",
          padding: "0 28px",
          gap: 10,
        }}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                background: "none", border: "none", cursor: "pointer",
                color: C.muted, fontSize: 12, fontWeight: 600,
                padding: "4px 6px 4px 0", fontFamily: "inherit",
                transition: "color 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = C.text; }}
              onMouseLeave={e => { e.currentTarget.style.color = C.muted; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
          )}
          <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>워크스페이스 관리</span>
        </div>

        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 28,
        }}>
          <div style={{
            width: "min(520px, 100%)",
            padding: "28px 28px 30px",
            borderRadius: 16,
            border: `1px solid ${C.border}`,
            background: "var(--surface)",
            textAlign: "center",
          }}>
            <EmptyState
              icon="👥"
              title="관리할 워크스페이스가 없습니다"
              desc="새 워크스페이스를 만들거나 초대 코드로 참여하면 여기에서 이름, 설명, 초대 코드, 멤버 권한을 관리할 수 있어요."
            />
            <button
              type="button"
              onClick={onOpenComposer}
            style={{
                marginTop: 18,
                padding: "10px 16px",
                borderRadius: 10,
                border: `1px solid ${C.border}`,
                background: "var(--surface)",
                color: C.subtle,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              워크스페이스 추가 또는 참여
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (workspaceLoading && !workspaceSummary) {
    return (
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: C.bg,
      }}>
        <div style={{
          height: 52,
          width: "100%",
          flexShrink: 0,
          borderBottom: `1px solid ${C.border}`,
          background: C.topbar,
          display: "flex",
          alignItems: "center",
          padding: "0 28px",
          gap: 10,
        }}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                background: "none", border: "none", cursor: "pointer",
                color: C.muted, fontSize: 12, fontWeight: 600,
                padding: "4px 6px 4px 0", fontFamily: "inherit",
                transition: "color 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = C.text; }}
              onMouseLeave={e => { e.currentTarget.style.color = C.muted; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
          )}
          <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>워크스페이스 관리</span>
        </div>
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Spinner />
        </div>
      </div>
    );
  }

  const memberCount = teamMembers.length;
  const sectionLinks = isOwner
    ? [
        { key: "projects", label: "프로젝트" },
        { key: "github", label: "GitHub 연동" },
        { key: "invite", label: "초대 코드" },
        { key: "settings", label: "기본 정보" },
        { key: "members", label: "권한·멤버" },
      ]
    : [
        { key: "projects", label: "프로젝트" },
        { key: "github", label: "GitHub 연동" },
        { key: "invite", label: "초대 코드" },
        { key: "settings", label: "내 워크스페이스" },
        { key: "members", label: "멤버" },
      ];

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      background: C.bg,
      overflow: "hidden",
    }}>
      <div style={{
        height: 52,
        flexShrink: 0,
        borderBottom: `1px solid ${C.border}`,
        background: C.topbar,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 28px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                background: "none", border: "none", cursor: "pointer",
                color: C.muted, fontSize: 12, fontWeight: 600,
                padding: "4px 6px 4px 0", fontFamily: "inherit",
                transition: "color 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = C.text; }}
              onMouseLeave={e => { e.currentTarget.style.color = C.muted; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
          )}
          <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
            {workspaceSummary?.teamName ?? workspaceSummary?.name ?? "워크스페이스"}
          </span>
          <span style={{ fontSize: 13, color: C.muted }}>›</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: C.accent }}>
            워크스페이스 관리
          </span>
        </div>

        <button
          type="button"
          onClick={() => focusSection("invite")}
          style={{
            padding: "7px 12px",
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            background: "var(--surface)",
            color: C.subtle,
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          초대 코드
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px 32px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div
            ref={overviewRef}
            style={{
              marginBottom: 22,
              borderRadius: 18,
              boxShadow: highlightedSection === "overview" ? "0 0 0 2px rgba(107,105,96,0.18), 0 20px 40px rgba(26,25,22,0.08)" : "none",
              transition: "box-shadow 0.18s ease",
            }}
          >
            <input
              ref={iconFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ display: "none" }}
              onChange={handleIconChange}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 4 }}>
              <button
                type="button"
                title={isOwner ? "아이콘 변경 (클릭)" : "워크스페이스 아이콘"}
                onClick={() => isOwner && iconFileRef.current?.click()}
                disabled={uploadingIcon}
                onMouseEnter={() => isOwner && setIconHovered(true)}
                onMouseLeave={() => setIconHovered(false)}
                style={{
                  width: 56, height: 56, borderRadius: 16,
                  border: isOwner ? "1.5px dashed rgba(26,25,22,0.2)" : "1.5px solid rgba(26,25,22,0.1)",
                  background: workspaceSummary?.iconUrl ? "none" : "rgba(26,25,22,0.04)",
                  cursor: isOwner && !uploadingIcon ? "pointer" : "default",
                  position: "relative", overflow: "hidden", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: 0,
                }}
              >
                {uploadingIcon ? (
                  <svg style={{ animation: "ws-icon-spin 0.9s linear infinite", color: C.accent }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
                  </svg>
                ) : workspaceSummary?.iconUrl ? (
                  <img src={workspaceSummary.iconUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                ) : (
                  <span style={{ fontSize: 22, fontWeight: 900, color: C.text, letterSpacing: "-.03em" }}>
                    {(workspaceSummary?.teamName ?? workspaceSummary?.name ?? "W").charAt(0).toUpperCase()}
                  </span>
                )}
                {iconHovered && !uploadingIcon && (
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "rgba(0,0,0,0.45)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    borderRadius: 16,
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  </div>
                )}
              </button>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: "-.03em" }}>
                  워크스페이스 설정
                </div>
                {isOwner && (
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
                    아이콘을 클릭해 이미지를 업로드할 수 있어요
                  </div>
                )}
              </div>
            </div>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              marginTop: 10,
            }}>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: 999,
                background: viewerRole === "OWNER" ? "rgba(26,25,22,0.1)" : viewerRole === "GUEST" ? "rgba(245,158,11,0.1)" : "rgba(59,130,246,0.08)",
                color: viewerRole === "OWNER" ? C.text : viewerRole === "GUEST" ? "#B45309" : "#2563EB",
              }}>
                {viewerRole === "OWNER" ? "소유자" : viewerRole === "GUEST" ? "게스트" : "멤버"}
              </span>
              <span style={{ fontSize: 12, color: C.subtle }}>
                멤버 {memberCount}명
              </span>
            </div>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginTop: 10 }}>
              {workspaceSummary?.description?.trim() || "워크스페이스 설명이 아직 없습니다."}
            </div>
          </div>
          <style>{`@keyframes ws-icon-spin { to { transform: rotate(360deg); } }`}</style>

          {/* 워크스페이스 프로젝트 목록 */}
          <div
            ref={projectsRef}
            style={{
              marginBottom: 20,
              padding: "16px 18px",
              borderRadius: 14,
              border: `1px solid ${C.border}`,
              background: "var(--surface)",
              boxShadow: highlightedSection === "projects" ? "0 0 0 2px rgba(107,105,96,0.18)" : "none",
              transition: "box-shadow 0.18s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>프로젝트</span>
              {!projectsLoading && (
                <span style={{ fontSize: 11, color: C.muted }}>{workspaceProjects.length}개</span>
              )}
            </div>
            {projectsLoading ? (
              <Spinner />
            ) : workspaceProjects.length === 0 ? (
              <div style={{ fontSize: 12, color: C.muted, padding: "8px 0" }}>
                이 워크스페이스에 프로젝트가 없습니다
              </div>
            ) : (
              workspaceProjects.map(project => (
                <ProjectItem
                  key={project.id}
                  project={project}
                  onClick={() => router.push(`/project/${project.id}`)}
                />
              ))
            )}
          </div>

          <GithubConnectionSection
            sectionRef={githubRef}
            highlighted={highlightedSection === "github"}
            teamId={activeWorkspaceId}
            isOwner={isOwner}
            installations={githubInstallations}
            installationsLoading={githubInstallationsLoading}
            onInstallationsChange={setGithubInstallations}
          />

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 16,
          }}>
            {sectionLinks.map((section) => (
              <QuickJumpButton
                key={section.key}
                active={activeSection === section.key}
                onClick={() => focusSection(section.key)}
              >
                {section.label}
              </QuickJumpButton>
            ))}
          </div>

          <div style={{
            marginBottom: 16,
            padding: "14px 16px",
            borderRadius: 12,
            border: `1px solid ${C.border}`,
            background: "var(--surface)",
          }}>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              color: C.muted,
              letterSpacing: ".07em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}>
              안내
            </div>
            <div style={{
              fontSize: 12,
              color: C.subtle,
              lineHeight: 1.7,
            }}>
              권한 체계는 소유자 / 멤버 / 게스트 세 단계예요. 소유자만 이름·설명 수정, 초대 코드 재발급, 소유자 이전, 멤버 강퇴, 역할 변경을 할 수 있어요. 게스트는 프로젝트 생성이 제한돼요.
            </div>
          </div>

          <FeedbackBanner feedback={feedback} />

          <div style={{
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            background: "var(--surface)",
            padding: 20,
          }}>
            <WorkspaceDetailPanel
              workspaceLoading={workspaceLoading}
              workspaceError=""
              workspaceSummary={workspaceSummary}
              isOwner={isOwner}
              isActiveWorkspace={activeWorkspaceId === getTeamId(workspaceSummary)}
              selfId={currentUserId}
              teamMembers={teamMembers}
              teamNameDraft={teamNameDraft}
              teamDescriptionDraft={teamDescriptionDraft}
              transferTargetId={transferTargetId}
              copiedTeamId={copiedTeamId}
              confirmDelete={confirmDelete}
              savingTeam={savingTeam}
              regenerating={regenerating}
              transferring={transferring}
              leaving={leaving}
              deleting={deleting}
              removingMemberId={removingMemberId}
              variant="dashboard"
              hideSummary
              hideSetActiveWorkspace
              sectionRefs={{
                invite: inviteRef,
                settings: settingsRef,
                members: membersRef,
              }}
              highlightSection={highlightedSection}
              onTeamNameChange={setTeamNameDraft}
              onTeamDescriptionChange={setTeamDescriptionDraft}
              onTransferTargetChange={setTransferTargetId}
              onCopy={handleCopy}
              onSaveTeam={handleSaveTeam}
              onRegenerateInviteCode={handleRegenerateInviteCode}
              onTransferOwnership={handleTransferOwnership}
              onRemoveMember={handleRemoveMember}
              onRoleChange={handleRoleChange}
              changingRoleMemberId={changingRoleMemberId}
              onLeaveTeam={handleLeaveTeam}
              onConfirmDelete={() => setConfirmDelete(true)}
              onCancelDelete={() => setConfirmDelete(false)}
              onDeleteTeam={handleDeleteTeam}
              onSetActiveWorkspace={() => {}}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
