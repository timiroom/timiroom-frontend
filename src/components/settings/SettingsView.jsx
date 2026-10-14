"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { rememberAuthReturnTo } from "@/lib/authConfig";
import { getActiveTeamId, getMyTeams, getPreferredTeam, getTeamWorkspace, setActiveTeamId } from "@/lib/teamApi";
import { fetchProjects, fetchProjectsByTeam } from "@/lib/projectApi";
import { ActionButton, SettingsHeader, SettingsLayout, SettingsNav } from "@/components/ui";
import { Spinner } from "@/components/dashboard/mypage/teamWorkspace/PanelPrimitives";
import { AiToolConnectionsPanel } from "@/components/dashboard/mypage/AiToolConnectionsPanel";
import { WorkspaceSwitcher } from "@/components/dashboard/WorkspaceSwitcher";
import { ProfileSettings } from "./ProfileSettings";
import { WorkspaceSettings, WORKSPACE_PAGES } from "./WorkspaceSettings";
import { ProjectSettings, PROJECT_PAGES } from "./ProjectSettings";

const INTEGRATION_ENABLED = process.env.NEXT_PUBLIC_INTEGRATION_ENABLED === "true";

function teamIdOf(team) {
  return team?.teamId ?? team?.id ?? null;
}

/**
 * /settings 전체. 주소가 곧 페이지다.
 *   /settings/profile, /settings/connections
 *   /settings/workspace/{general|members|github|manage}
 *   /settings/project/{id}/{general|repositories|members|delete}
 * 워크스페이스·프로젝트 설정은 대시보드에서 고른 현재 워크스페이스 기준이다.
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
  const [projects, setProjects] = useState([]);
  const [allProjects, setAllProjects] = useState([]);

  // 잘못된 주소나 /settings 자체는 프로필로 보낸다.
  const route = useMemo(() => {
    if (area === "connections" && INTEGRATION_ENABLED) return { key: "connections" };
    if (area === "workspace") {
      const page = WORKSPACE_PAGES[first] ? first : "general";
      return { key: `workspace:${page}`, page };
    }
    if (area === "project" && /^[1-9][0-9]*$/.test(first ?? "")) {
      const page = PROJECT_PAGES[second] ? second : "general";
      return { key: `project:${first}:${page}`, projectId: first, page };
    }
    return { key: "profile" };
  }, [area, first, second]);

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

  const loadWorkspace = useCallback(async (teamId = activeTeamId) => {
    if (teamId == null) { setWorkspaceDetail(null); return; }
    setWorkspaceLoading(true);
    try {
      setWorkspaceDetail(await getTeamWorkspace(teamId));
    } catch {
      setWorkspaceDetail(null);
    } finally {
      setWorkspaceLoading(false);
    }
  }, [activeTeamId]);

  const loadProjects = useCallback(async (teamId = activeTeamId) => {
    if (teamId == null) { setProjects([]); return; }
    try {
      const list = await fetchProjectsByTeam(teamId);
      setProjects(Array.isArray(list) ? list : []);
    } catch {
      setProjects([]);
    }
  }, [activeTeamId]);

  useEffect(() => { if (user) loadTeams(); }, [user, loadTeams]);
  useEffect(() => {
    if (!user || activeTeamId == null) return;
    loadWorkspace(activeTeamId);
    loadProjects(activeTeamId);
  }, [user, activeTeamId, loadWorkspace, loadProjects]);
  useEffect(() => {
    if (!user || route.key !== "connections") return;
    fetchProjects().then(setAllProjects).catch(() => setAllProjects([]));
  }, [user, route.key]);

  function handleSelectWorkspace(teamId) {
    setActiveTeamId(teamId);
    setActiveTeamIdState(teamId);
    // 다른 워크스페이스의 프로젝트 설정을 보고 있었다면 워크스페이스 설정으로 옮긴다.
    if (route.projectId) router.push("/settings/workspace/general");
  }

  const backToDashboard = useCallback(() => router.push("/dashboard"), [router]);

  if (authLoading || !user) {
    return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}><Spinner /></div>;
  }

  const workspaceItems = Object.entries(WORKSPACE_PAGES).map(([page, label]) => ({
    key: `workspace:${page}`,
    label: page === "manage" && workspaceDetail?.viewerRole && workspaceDetail.viewerRole !== "OWNER" ? "나가기" : label,
    href: `/settings/workspace/${page}`,
    danger: page === "manage",
  }));
  const projectItems = projects.flatMap((project) => {
    const open = String(project.id) === String(route.projectId);
    const item = { key: `project:${project.id}`, label: project.name, href: `/settings/project/${project.id}/general` };
    if (!open) return [item];
    return [item, ...Object.entries(PROJECT_PAGES).map(([page, label]) => ({
      key: `project:${project.id}:${page}`, label, href: `/settings/project/${project.id}/${page}`, depth: 1, danger: page === "delete",
    }))];
  });

  const nav = (
    <SettingsNav
      active={route.key}
      groups={[
        {
          label: "내 계정",
          items: [
            { key: "profile", label: "프로필", href: "/settings/profile" },
            ...(INTEGRATION_ENABLED ? [{ key: "connections", label: "연결된 도구", href: "/settings/connections" }] : []),
          ],
        },
        {
          label: "워크스페이스",
          top: <div className="ui-set-nav__switch"><WorkspaceSwitcher workspaces={teams} activeId={activeTeamId} onSelect={handleSelectWorkspace} loading={teamsLoading} /></div>,
          items: teams.length ? workspaceItems : [],
        },
        ...(projectItems.length ? [{ label: "프로젝트", items: projectItems }] : []),
      ]}
    />
  );

  let content;
  if (route.key === "profile") content = <ProfileSettings />;
  else if (route.key === "connections") content = <><SettingsHeader title="연결된 도구" meta={<span>Codex·Claude Code 같은 AI 도구와 Slack을 연결합니다.</span>} /><AiToolConnectionsPanel projects={allProjects} /></>;
  else if (route.page && route.key.startsWith("workspace:")) {
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
  } else {
    content = (
      <ProjectSettings
        key={route.projectId}
        projectId={route.projectId}
        page={route.page}
        onProjectGone={backToDashboard}
        onProjectChanged={() => loadProjects(activeTeamId)}
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
      <div style={{ flex: 1, overflowY: "auto" }}>
        <SettingsLayout nav={nav}>{content}</SettingsLayout>
      </div>
    </div>
  );
}
