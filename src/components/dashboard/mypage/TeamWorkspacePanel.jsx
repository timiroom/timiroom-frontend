"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  deleteTeam,
  getActiveTeamId,
  getPreferredTeam,
  getTeamWorkspace,
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
import { useToast } from "@/context/ToastContext";


export function TeamWorkspacePanel({ teams = [], loading = false, onTeamsChanged }) {
  const { user } = useAuth();
  const { showToast } = useToast();
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
    if (leaving || deleting) {
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
  }, [teams, selectedTeamId, activeTeamId, leaving, deleting]);

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

  async function handleCopy(inviteCode, teamId) {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopiedTeamId(teamId);
      window.setTimeout(() => {
        setCopiedTeamId((current) => (current === teamId ? null : current));
      }, 1200);
    } catch {
      showToast("error", "초대 코드를 복사하지 못했습니다.");
    }
  }

  async function handleSaveTeam() {
    if (!selectedTeamId || !isOwner) return;

    setSavingTeam(true);
    try {
      await updateTeam(selectedTeamId, {
        teamName: teamNameDraft,
        description: teamDescriptionDraft,
      });
      showToast("success", "워크스페이스 정보를 저장했어요.");
      await refreshTeams();
      await reloadWorkspace(selectedTeamId);
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "워크스페이스 저장 실패");
    } finally {
      setSavingTeam(false);
    }
  }

  async function handleRegenerateInviteCode() {
    if (!selectedTeamId || !isOwner) return;

    setRegenerating(true);
    try {
      await regenerateTeamInviteCode(selectedTeamId);
      showToast("success", "초대 코드를 새로 발급했어요.");
      await refreshTeams();
      await reloadWorkspace(selectedTeamId);
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "초대 코드 재발급 실패");
    } finally {
      setRegenerating(false);
    }
  }

  async function handleTransferOwnership() {
    if (!selectedTeamId || !isOwner) return;
    if (!transferTargetId) {
      showToast("error", "권한을 넘길 멤버를 선택해 주세요.");
      return;
    }

    setTransferring(true);
    try {
      await transferTeamOwnership(selectedTeamId, Number(transferTargetId));
      showToast("success", "소유자 권한을 이전했어요.");
      await refreshTeams();
      await reloadWorkspace(selectedTeamId);
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "소유자 권한 이전 실패");
    } finally {
      setTransferring(false);
    }
  }

  async function handleRemoveMember(memberId) {
    if (!selectedTeamId || !isOwner) return;

    setRemovingMemberId(memberId);
    try {
      await removeTeamMember(selectedTeamId, memberId);
      showToast("success", "멤버를 제거했어요.");
      await refreshTeams();
      await reloadWorkspace(selectedTeamId);
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "멤버 제거 실패");
    } finally {
      setRemovingMemberId(null);
    }
  }

  async function handleLeaveTeam() {
    if (!selectedTeamId) return;

    setLeaving(true);
    try {
      await leaveTeam(selectedTeamId);
      showToast("success", "워크스페이스에서 나왔어요.");
      const nextTeams = (await refreshTeams()) ?? [];
      const nextTeam = getPreferredTeam(nextTeams);
      const nextTeamId = getTeamId(nextTeam);
      applyActiveTeamId(nextTeamId);
      setSelectedTeamId(nextTeamId);
      setWorkspace(null);
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "워크스페이스 나가기 실패");
    } finally {
      setLeaving(false);
    }
  }

  async function handleDeleteTeam() {
    if (!selectedTeamId || !isOwner) return;

    setDeleting(true);
    try {
      await deleteTeam(selectedTeamId);
      const nextTeams = (await refreshTeams()) ?? [];
      const nextTeam = getPreferredTeam(nextTeams);
      const nextTeamId = getTeamId(nextTeam);
      applyActiveTeamId(nextTeamId);
      setSelectedTeamId(nextTeamId);
      setWorkspace(null);
      setConfirmDelete(false);
      showToast("success", "워크스페이스를 삭제했어요.");
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "워크스페이스 삭제 실패");
    } finally {
      setDeleting(false);
    }
  }

  function handleSetActiveWorkspace(teamId) {
    applyActiveTeamId(teamId);
    showToast("success", "현재 작업공간을 변경했어요.");
  }

  return (
    <>
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
