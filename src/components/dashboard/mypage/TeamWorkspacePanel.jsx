"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getActiveTeamId,
  getPreferredTeam,
  getTeamWorkspace,
  setActiveTeamId as persistActiveTeamId,
} from "@/lib/teamApi";
import { Card, SectionTitle } from "@/components/dashboard/mypage/teamWorkspace/PanelPrimitives";
import { WorkspaceSnapshotCard } from "@/components/dashboard/mypage/teamWorkspace/WorkspaceSnapshotCard";
import { TeamListCard } from "@/components/dashboard/mypage/teamWorkspace/TeamListCard";
import { EmptyState, Spinner } from "@/components/dashboard/mypage/teamWorkspace/PanelPrimitives";
import { getTeamId } from "@/components/dashboard/mypage/teamWorkspace/helpers";
import { useToast } from "@/context/ToastContext";

/**
 * 마이페이지의 "내 워크스페이스": 속한 워크스페이스 목록과 고른 워크스페이스의 요약만 보여 준다.
 * 이름 변경, 멤버 관리, 삭제 같은 관리는 대시보드의 워크스페이스 관리 화면 한 곳에서 한다.
 */
export function TeamWorkspacePanel({ teams = [], loading = false }) {
  const { showToast } = useToast();
  const [selectedTeamId, setSelectedTeamId] = useState(() => getActiveTeamId());
  const [activeTeamId, setActiveTeamIdState] = useState(() => getActiveTeamId());
  const [workspace, setWorkspace] = useState(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [copiedTeamId, setCopiedTeamId] = useState(null);
  const [workspaceError, setWorkspaceError] = useState("");

  const selectedTeam = useMemo(
    () => teams.find((team) => getTeamId(team) === selectedTeamId) ?? null,
    [teams, selectedTeamId]
  );

  function applyActiveTeamId(teamId) {
    persistActiveTeamId(teamId);
    setActiveTeamIdState(teamId ?? null);
  }

  useEffect(() => {
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
  }, [teams, selectedTeamId, activeTeamId]);

  useEffect(() => {
    if (selectedTeamId == null) {
      setWorkspace(null);
      setWorkspaceError("");
      return;
    }

    let cancelled = false;
    setWorkspaceLoading(true);
    setWorkspaceError("");
    getTeamWorkspace(selectedTeamId)
      .then((data) => { if (!cancelled) setWorkspace(data); })
      .catch((error) => {
        if (cancelled) return;
        setWorkspace(null);
        setWorkspaceError(error instanceof Error ? error.message : "워크스페이스 정보를 불러오지 못했습니다.");
      })
      .finally(() => { if (!cancelled) setWorkspaceLoading(false); });

    return () => {
      cancelled = true;
    };
  }, [selectedTeamId]);

  const viewerRole = workspace?.viewerRole ?? selectedTeam?.viewerRole ?? "";
  const isOwner = viewerRole === "OWNER";
  const workspaceSummary = workspace?.team ?? selectedTeam;
  const teamMembers = workspace?.members ?? [];

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
            icon="users"
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
