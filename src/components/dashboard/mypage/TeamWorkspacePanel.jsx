"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  createTeam,
  deleteTeam,
  getActiveTeamId,
  getPreferredTeam,
  getTeamWorkspace,
  joinTeamByInviteCode,
  leaveTeam,
  regenerateTeamInviteCode,
  removeTeamMember,
  setActiveTeamId as persistActiveTeamId,
  transferTeamOwnership,
  updateTeam,
} from "@/lib/teamApi";
import { Card, SectionTitle } from "@/components/dashboard/mypage/teamWorkspace/PanelPrimitives";
import { WorkspaceSnapshotCard } from "@/components/dashboard/mypage/teamWorkspace/WorkspaceSnapshotCard";
import { TeamListCard } from "@/components/dashboard/mypage/teamWorkspace/TeamListCard";
import { EmptyState, Spinner } from "@/components/dashboard/mypage/teamWorkspace/PanelPrimitives";
import { getDefaultTransferTarget, getTeamId } from "@/components/dashboard/mypage/teamWorkspace/helpers";

function FeedbackBanner({ feedback }) {
  if (!feedback) return null;

  return (
    <Card style={{
      marginBottom: 16,
      borderColor: feedback.type === "error" ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.18)",
      background: feedback.type === "error" ? "rgba(239,68,68,0.04)" : "rgba(16,185,129,0.04)",
    }}>
      <div style={{
        fontSize: 13,
        fontWeight: 600,
        color: feedback.type === "error" ? "#dc2626" : "#059669",
      }}>
        {feedback.message}
      </div>
    </Card>
  );
}

function CreateWorkspaceCard({ createName, createDescription, creating, onCreateNameChange, onCreateDescriptionChange, onSubmit }) {
  return (
    <Card style={{ marginBottom: 16 }}>
      <SectionTitle subtitle="소유자가 직접 이름과 설명을 입력해서 새 협업 공간을 만들 수 있어요.">
        새 워크스페이스 만들기
      </SectionTitle>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        style={{ display: "flex", flexDirection: "column", gap: 10 }}
      >
        <input
          value={createName}
          onChange={(event) => onCreateNameChange(event.target.value)}
          placeholder="워크스페이스 이름"
          style={{
            width: "100%",
            padding: "10px 13px",
            borderRadius: "var(--db-radius-sm)",
            border: "1px solid var(--border-2)",
            background: "var(--bg)",
            color: "var(--text-1)",
            fontSize: 13,
            fontFamily: "inherit",
            outline: "none",
          }}
        />
        <textarea
          value={createDescription}
          onChange={(event) => onCreateDescriptionChange(event.target.value)}
          placeholder="워크스페이스 설명"
          rows={2}
          style={{
            width: "100%",
            padding: "10px 13px",
            borderRadius: "var(--db-radius-sm)",
            border: "1px solid var(--border-2)",
            background: "var(--bg)",
            color: "var(--text-1)",
            fontSize: 13,
            fontFamily: "inherit",
            outline: "none",
            resize: "vertical",
            minHeight: 74,
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="submit"
            disabled={creating}
            style={{
              padding: "10px 16px",
              borderRadius: "var(--db-radius-sm)",
              border: "none",
              background: "var(--text-1)",
              color: "var(--bg)",
              fontSize: 13,
              fontWeight: 700,
              cursor: creating ? "progress" : "pointer",
              fontFamily: "inherit",
              opacity: creating ? 0.75 : 1,
            }}
          >
            {creating ? "생성 중" : "워크스페이스 생성"}
          </button>
        </div>
      </form>
    </Card>
  );
}

function JoinWorkspaceCard({ joinCode, joining, onJoinCodeChange, onSubmit }) {
  return (
    <Card style={{ marginBottom: 16 }}>
      <SectionTitle subtitle="관리자에게 받은 초대 코드를 입력하면 바로 협업 공간에 들어갈 수 있어요.">
        초대 코드로 참여
      </SectionTitle>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}
      >
        <input
          value={joinCode}
          onChange={(event) => onJoinCodeChange(event.target.value)}
          placeholder="초대 코드 입력"
          autoComplete="off"
          spellCheck={false}
          style={{
            flex: "1 1 220px",
            padding: "10px 13px",
            borderRadius: "var(--db-radius-sm)",
            border: "1px solid var(--border-2)",
            background: "var(--bg)",
            color: "var(--text-1)",
            fontSize: 13,
            fontFamily: "inherit",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={joining}
          style={{
            padding: "10px 16px",
            borderRadius: "var(--db-radius-sm)",
            border: "none",
            background: "var(--text-1)",
            color: "var(--bg)",
            fontSize: 13,
            fontWeight: 700,
            cursor: joining ? "progress" : "pointer",
            fontFamily: "inherit",
            opacity: joining ? 0.75 : 1,
          }}
        >
          {joining ? "참여 중" : "워크스페이스 참여"}
        </button>
      </form>
    </Card>
  );
}

export function TeamWorkspacePanel({ teams = [], loading = false, onTeamsChanged }) {
  const { user } = useAuth();
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState(() => getActiveTeamId());
  const [activeTeamId, setActiveTeamIdState] = useState(() => getActiveTeamId());
  const [workspace, setWorkspace] = useState(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [savingTeam, setSavingTeam] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState(null);
  const [teamNameDraft, setTeamNameDraft] = useState("");
  const [teamDescriptionDraft, setTeamDescriptionDraft] = useState("");
  const [transferTargetId, setTransferTargetId] = useState("");
  const [copiedTeamId, setCopiedTeamId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [workspaceError, setWorkspaceError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const selectedTeam = useMemo(
    () => teams.find((team) => getTeamId(team) === selectedTeamId) ?? null,
    [teams, selectedTeamId]
  );

  function applyActiveTeamId(teamId) {
    persistActiveTeamId(teamId);
    setActiveTeamIdState(teamId ?? null);
  }

  useEffect(() => {
    if (creating || joining || leaving || deleting) {
      return;
    }

    if (!teams.length) {
      setSelectedTeamId(null);
      setWorkspace(null);
      if (activeTeamId != null) {
        applyActiveTeamId(null);
      }
      return;
    }

    const preferred = getPreferredTeam(teams);
    const preferredId = getTeamId(preferred);
    const currentExists = selectedTeamId != null && teams.some((team) => getTeamId(team) === selectedTeamId);
    const activeExists = activeTeamId != null && teams.some((team) => getTeamId(team) === activeTeamId);

    if (!activeExists && preferredId !== activeTeamId) {
      setActiveTeamIdState(preferredId);
    }

    if (!currentExists && preferredId != null && preferredId !== selectedTeamId) {
      setSelectedTeamId(preferredId);
    }
  }, [teams, selectedTeamId, activeTeamId, creating, joining, leaving, deleting]);

  useEffect(() => {
    if (selectedTeamId == null) {
      setWorkspace(null);
      setWorkspaceError("");
      return;
    }

    let cancelled = false;

    async function loadWorkspace() {
      setWorkspaceLoading(true);
      setWorkspaceError("");
      try {
        const data = await getTeamWorkspace(selectedTeamId);
        if (cancelled) return;
        setWorkspace(data);
        setTeamNameDraft(data?.team?.teamName ?? "");
        setTeamDescriptionDraft(data?.team?.description ?? "");
        setTransferTargetId(getDefaultTransferTarget(data?.members ?? []));
      } catch (error) {
        if (!cancelled) {
          setWorkspace(null);
          setWorkspaceError(error instanceof Error ? error.message : "워크스페이스 정보를 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setWorkspaceLoading(false);
        }
      }
    }

    loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, [selectedTeamId]);

  useEffect(() => {
    setConfirmDelete(false);
  }, [selectedTeamId]);

  const viewerRole = workspace?.viewerRole ?? selectedTeam?.viewerRole ?? "";
  const isOwner = viewerRole === "OWNER";
  const selfId = user?.id;
  const workspaceSummary = workspace?.team ?? selectedTeam;
  const teamMembers = workspace?.members ?? [];

  async function refreshTeams() {
    return await onTeamsChanged?.();
  }

  async function reloadWorkspace(teamId = selectedTeamId) {
    if (teamId == null) return;

    setWorkspaceLoading(true);
    setWorkspaceError("");
    try {
      const data = await getTeamWorkspace(teamId);
      setWorkspace(data);
      setTeamNameDraft(data?.team?.teamName ?? "");
      setTeamDescriptionDraft(data?.team?.description ?? "");
      setTransferTargetId(getDefaultTransferTarget(data?.members ?? []));
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "워크스페이스 정보를 불러오지 못했습니다.");
    } finally {
      setWorkspaceLoading(false);
    }
  }

  async function handleCreateTeam() {
    const teamName = createName.trim();
    if (!teamName) {
      setFeedback({ type: "error", message: "워크스페이스 이름을 입력해 주세요." });
      return;
    }

    setCreating(true);
    setFeedback(null);
    try {
      const created = await createTeam(teamName, createDescription.trim());
      const teamId = created.teamId ?? created.id;
      applyActiveTeamId(teamId);
      setSelectedTeamId(teamId);
      setCreateName("");
      setCreateDescription("");
      setFeedback({ type: "success", message: "새 워크스페이스를 만들었어요." });
      await refreshTeams();
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "워크스페이스 생성 실패" });
    } finally {
      setCreating(false);
    }
  }

  async function handleJoinTeam() {
    const normalized = joinCode.trim().toUpperCase();
    if (!normalized) {
      setFeedback({ type: "error", message: "초대 코드를 입력해 주세요." });
      return;
    }

    setJoining(true);
    setFeedback(null);
    try {
      const joined = await joinTeamByInviteCode(normalized);
      if (joined?.teamId != null) {
        applyActiveTeamId(joined.teamId);
        setSelectedTeamId(joined.teamId);
      }
      setJoinCode("");
      setFeedback({ type: "success", message: "초대 코드로 워크스페이스에 참여했어요." });
      await refreshTeams();
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "워크스페이스 참여 실패" });
    } finally {
      setJoining(false);
    }
  }

  async function handleCopy(inviteCode, teamId) {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopiedTeamId(teamId);
      window.setTimeout(() => {
        setCopiedTeamId((current) => (current === teamId ? null : current));
      }, 1200);
    } catch {
      setFeedback({ type: "error", message: "초대 코드를 복사하지 못했습니다." });
    }
  }

  async function handleSaveTeam() {
    if (!selectedTeamId || !isOwner) return;

    setSavingTeam(true);
    setFeedback(null);
    try {
      await updateTeam(selectedTeamId, {
        teamName: teamNameDraft,
        description: teamDescriptionDraft,
      });
      setFeedback({ type: "success", message: "워크스페이스 정보를 저장했어요." });
      await refreshTeams();
      await reloadWorkspace(selectedTeamId);
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "워크스페이스 저장 실패" });
    } finally {
      setSavingTeam(false);
    }
  }

  async function handleRegenerateInviteCode() {
    if (!selectedTeamId || !isOwner) return;

    setRegenerating(true);
    setFeedback(null);
    try {
      await regenerateTeamInviteCode(selectedTeamId);
      setFeedback({ type: "success", message: "초대 코드를 새로 발급했어요." });
      await refreshTeams();
      await reloadWorkspace(selectedTeamId);
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "초대 코드 재발급 실패" });
    } finally {
      setRegenerating(false);
    }
  }

  async function handleTransferOwnership() {
    if (!selectedTeamId || !isOwner) return;
    if (!transferTargetId) {
      setFeedback({ type: "error", message: "권한을 넘길 멤버를 선택해 주세요." });
      return;
    }

    setTransferring(true);
    setFeedback(null);
    try {
      await transferTeamOwnership(selectedTeamId, Number(transferTargetId));
      setFeedback({ type: "success", message: "소유자 권한을 이전했어요." });
      await refreshTeams();
      await reloadWorkspace(selectedTeamId);
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "소유자 권한 이전 실패" });
    } finally {
      setTransferring(false);
    }
  }

  async function handleRemoveMember(memberId) {
    if (!selectedTeamId || !isOwner) return;

    setRemovingMemberId(memberId);
    setFeedback(null);
    try {
      await removeTeamMember(selectedTeamId, memberId);
      setFeedback({ type: "success", message: "멤버를 제거했어요." });
      await refreshTeams();
      await reloadWorkspace(selectedTeamId);
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "멤버 제거 실패" });
    } finally {
      setRemovingMemberId(null);
    }
  }

  async function handleLeaveTeam() {
    if (!selectedTeamId) return;

    setLeaving(true);
    setFeedback(null);
    try {
      await leaveTeam(selectedTeamId);
      setFeedback({ type: "success", message: "워크스페이스에서 나왔어요." });
      const nextTeams = (await refreshTeams()) ?? [];
      const nextTeam = getPreferredTeam(nextTeams);
      const nextTeamId = getTeamId(nextTeam);
      applyActiveTeamId(nextTeamId);
      setSelectedTeamId(nextTeamId);
      setWorkspace(null);
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "워크스페이스 나가기 실패" });
    } finally {
      setLeaving(false);
    }
  }

  async function handleDeleteTeam() {
    if (!selectedTeamId || !isOwner) return;

    setDeleting(true);
    setFeedback(null);
    try {
      await deleteTeam(selectedTeamId);
      const nextTeams = (await refreshTeams()) ?? [];
      const nextTeam = getPreferredTeam(nextTeams);
      const nextTeamId = getTeamId(nextTeam);
      applyActiveTeamId(nextTeamId);
      setSelectedTeamId(nextTeamId);
      setWorkspace(null);
      setConfirmDelete(false);
      setFeedback({ type: "success", message: "워크스페이스를 삭제했어요." });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "워크스페이스 삭제 실패" });
    } finally {
      setDeleting(false);
    }
  }

  function handleSetActiveWorkspace(teamId) {
    applyActiveTeamId(teamId);
    setFeedback({ type: "success", message: "현재 작업공간을 변경했어요." });
  }

  return (
    <>
      <CreateWorkspaceCard
        createName={createName}
        createDescription={createDescription}
        creating={creating}
        onCreateNameChange={setCreateName}
        onCreateDescriptionChange={setCreateDescription}
        onSubmit={handleCreateTeam}
      />

      <JoinWorkspaceCard
        joinCode={joinCode}
        joining={joining}
        onJoinCodeChange={setJoinCode}
        onSubmit={handleJoinTeam}
      />

      <FeedbackBanner feedback={feedback} />

      <Card>
        <SectionTitle subtitle="내가 속한 워크스페이스 목록이에요.">
          내 워크스페이스
        </SectionTitle>

        {loading ? (
          <Spinner />
        ) : teams.length === 0 ? (
          <EmptyState
            icon="👥"
            title="아직 속한 워크스페이스가 없습니다"
            desc="새 워크스페이스를 만들거나 초대 코드를 입력해 참여해 보세요."
          />
        ) : (
          <div className="team-workspace-grid" style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.15fr)",
            gap: 16,
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {teams.map((team) => {
                const teamId = getTeamId(team);
                return (
                  <TeamListCard
                    key={teamId}
                    team={team}
                    active={activeTeamId === teamId}
                    selected={selectedTeamId === teamId}
                    copiedTeamId={copiedTeamId}
                    onCopy={handleCopy}
                    onSelect={setSelectedTeamId}
                  />
                );
              })}
            </div>

            <div style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--db-radius-lg)",
              padding: 20,
              background: "var(--bg)",
              minWidth: 0,
            }}>
              <WorkspaceSnapshotCard
                workspaceLoading={workspaceLoading}
                workspaceError={workspaceError}
                workspaceSummary={workspaceSummary}
                isOwner={isOwner}
                isActiveWorkspace={activeTeamId === getTeamId(workspaceSummary)}
                teamMembers={teamMembers}
                copiedTeamId={copiedTeamId}
                onCopy={handleCopy}
                onSetActiveWorkspace={handleSetActiveWorkspace}
              />
            </div>
          </div>
        )}
      </Card>

      <style>{`
        @keyframes team-spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 720px) {
          .team-workspace-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
      `}</style>
    </>
  );
}
