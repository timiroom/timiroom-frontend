"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { rememberAuthReturnTo } from "@/lib/authConfig";
import { getActiveTeamId, getMyTeams, getPreferredTeam, getTeamWorkspace, setActiveTeamId } from "@/lib/teamApi";
import { fetchProjects } from "@/lib/projectApi";
import { buildDashboardUrl } from "@/lib/dashboardUrl";
import { ActionButton, Avatar, SettingsHeader, SettingsLayout, SettingsNav } from "@/components/ui";
import { Spinner } from "@/components/dashboard/mypage/teamWorkspace/PanelPrimitives";
import { AiToolConnectionsPanel } from "@/components/dashboard/mypage/AiToolConnectionsPanel";
import { WorkspaceSwitcher } from "@/components/dashboard/WorkspaceSwitcher";
import { ProfileSettings } from "./ProfileSettings";
import { UsageSettings } from "./UsageSettings";
import { BillingSettings } from "./BillingSettings";
import { AiKeySettings } from "./AiKeySettings";
import { WorkspaceSettings, WORKSPACE_PAGES } from "./WorkspaceSettings";

const INTEGRATION_ENABLED = process.env.NEXT_PUBLIC_INTEGRATION_ENABLED === "true";
const WORKSPACE_ICONS = { general: "wrench", members: "users", github: "box", manage: "warning" };

function teamIdOf(team) {
  return team?.teamId ?? team?.id ?? null;
}

/**
 * /settings — 내 계정과 워크스페이스 설정. 주소가 곧 페이지다.
 *   /settings/profile, /settings/usage, /settings/billing, /settings/ai-keys, /settings/connections
 *   /settings/workspace/{general|members|github|manage}
 * 프로젝트 설정은 범위가 다르므로 여기 두지 않고 대시보드의 프로젝트 안(설정 탭)에 둔다.
 * 예전 주소 /settings/project/{id}/{tab}은 그 탭으로 넘긴다.
 */
export function SettingsView({ section = [] }) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [area, first, second] = section;

  const [teams, setTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [activeTeamId, setActiveTeamIdState] = useState(null);
  const [workspaceDetail, setWorkspaceDetail] = useState(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [allProjects, setAllProjects] = useState([]);

  // 잘못된 주소나 /settings 자체는 프로필로 보낸다.
  const route = useMemo(() => {
    if (area === "connections" && INTEGRATION_ENABLED) return { key: "connections" };
    if (area === "usage" || area === "billing" || area === "ai-keys") return { key: area };
    if (area === "workspace") {
      const page = WORKSPACE_PAGES[first] ? first : "general";
      return { key: `workspace:${page}`, page };
    }
    return { key: "profile" };
  }, [area, first]);

  useEffect(() => {
    if (area === "project" && /^[1-9][0-9]*$/.test(first ?? "")) {
      router.replace(buildDashboardUrl({ projectId: first, view: "settings", tab: second || "general" }));
    }
  }, [area, first, second, router]);

  useEffect(() => {
    if (authLoading || user) return;
    rememberAuthReturnTo(window.location.pathname);
    router.replace("/");
  }, [authLoading, user, router]);

  const loadTeams = useCallback(async () => {
    setTeamsLoading(true);
    try {
      const list = await getMyTeams();
      const nextTeams = Array.isArray(list) ? list : [];
      setTeams(nextTeams);
      setActiveTeamIdState((current) => {
        const stored = current ?? getActiveTeamId();
        if (nextTeams.some((team) => String(teamIdOf(team)) === String(stored))) return stored;
        return teamIdOf(getPreferredTeam(nextTeams));
      });
    } catch {
      setTeams([]);
    } finally {
      setTeamsLoading(false);
    }
  }, []);

  const loadWorkspace = useCallback(async (teamId) => {
    if (teamId == null) { setWorkspaceDetail(null); return; }
    setWorkspaceLoading(true);
    try {
      setWorkspaceDetail(await getTeamWorkspace(teamId));
    } catch {
      setWorkspaceDetail(null);
    } finally {
      setWorkspaceLoading(false);
    }
  }, []);

  useEffect(() => { if (user) loadTeams(); }, [user, loadTeams]);
  useEffect(() => {
    if (user && activeTeamId != null) loadWorkspace(activeTeamId);
  }, [user, activeTeamId, loadWorkspace]);
  useEffect(() => {
    if (!user || route.key !== "connections") return;
    fetchProjects().then(setAllProjects).catch(() => setAllProjects([]));
  }, [user, route.key]);

  function handleSelectWorkspace(teamId) {
    setActiveTeamId(teamId);
    setActiveTeamIdState(teamId);
  }

  const backToDashboard = useCallback(() => router.push("/dashboard"), [router]);

  if (authLoading || !user || area === "project") {
    return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}><Spinner /></div>;
  }

  const isOwner = workspaceDetail?.viewerRole === "OWNER";
  const userName = user?.name || user?.email || "사용자";

  const nav = (
    <SettingsNav
      active={route.key}
      groups={[
        {
          // 내 계정: 그룹 제목 대신 내 사진·이름 카드를 둔다.
          top: (
            <div className="ui-set-nav__me">
              <Avatar name={userName} src={user?.avatarUrl} size={32} />
              <div style={{ minWidth: 0 }}>
                <strong>{userName}</strong>
                {user?.email && <span>{user.email}</span>}
              </div>
            </div>
          ),
          items: [
            { key: "profile", label: "프로필", href: "/settings/profile", icon: "users" },
            { key: "usage", label: "사용량", href: "/settings/usage", icon: "meter" },
            { key: "billing", label: "요금제·결제", href: "/settings/billing", icon: "card" },
            { key: "ai-keys", label: "내 AI 키", href: "/settings/ai-keys", icon: "key" },
            ...(INTEGRATION_ENABLED ? [{ key: "connections", label: "연결된 도구", href: "/settings/connections", icon: "link" }] : []),
          ],
        },
        {
          // 워크스페이스: 그룹 제목 아래 전환 드롭다운, 그 아래 현재 워크스페이스의 설정 메뉴
          label: "워크스페이스",
          top: <div className="ui-set-nav__switch"><WorkspaceSwitcher workspaces={teams} activeId={activeTeamId} onSelect={handleSelectWorkspace} loading={teamsLoading} /></div>,
          items: teams.length ? Object.entries(WORKSPACE_PAGES).map(([page, label]) => ({
            key: `workspace:${page}`,
            label: page === "manage" && workspaceDetail && !isOwner ? "나가기" : label,
            href: `/settings/workspace/${page}`,
            icon: WORKSPACE_ICONS[page],
            danger: page === "manage",
          })) : [],
        },
      ]}
    />
  );

  let content;
  if (route.key === "profile") {
    content = <ProfileSettings />;
  } else if (route.key === "usage") {
    content = <UsageSettings />;
  } else if (route.key === "billing") {
    content = <BillingSettings />;
  } else if (route.key === "ai-keys") {
    content = <AiKeySettings />;
  } else if (route.key === "connections") {
    content = (
      <>
        <SettingsHeader eyebrow="내 계정" title="연결된 도구" meta={<span>Codex·Claude Code 같은 AI 도구와 Slack을 연결합니다.</span>} />
        <AiToolConnectionsPanel projects={allProjects} />
      </>
    );
  } else {
    content = (
      <WorkspaceSettings
        page={route.page}
        workspaceId={activeTeamId}
        workspaceDetail={workspaceDetail}
        workspaceLoading={workspaceLoading || teamsLoading}
        currentUserId={user?.id ?? null}
        onReloadWorkspace={() => loadWorkspace(activeTeamId)}
        onReloadWorkspaces={loadTeams}
        onWorkspaceGone={backToDashboard}
      />
    );
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      <div className="ui-panel-header">
        <div className="ui-panel-header__crumb">
          <ActionButton variant="ghost" size="sm" onClick={backToDashboard}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
            대시보드
          </ActionButton>
          <span className="ui-panel-header__sep" aria-hidden="true">›</span>
          <span>설정</span>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", background: "var(--content-bg)" }}>
        <SettingsLayout nav={nav}>{content}</SettingsLayout>
      </div>
    </div>
  );
}
