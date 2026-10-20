"use client";

import { useCallback, useEffect, useState } from "react";
import { ActionButton, Badge, EmptyState, Icon, LoadingState, PanelHeader, PanelToolbar } from "@/components/ui";
import { navigateDashboard } from "@/lib/dashboardUrl";
import {
  createProjectIssue,
  fetchProjectIssues,
  fetchProjectRepositories,
} from "@/lib/githubApi";

const FILTERS = [
  { key: "open", label: "진행 중" },
  { key: "closed", label: "완료" },
  { key: "all", label: "전체" },
];

function dateLabel(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

/** 프로젝트에 연결된 모든 레포의 GitHub 이슈를 모아 보고, PM은 여기서 바로 만든다. */
export function GithubIssuesPanel({ project, canManage }) {
  const [issues, setIssues] = useState([]);
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("open");
  const [composerOpen, setComposerOpen] = useState(false);
  const [repoId, setRepoId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [labels, setLabels] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!project?.id) return;
    setLoading(true);
    setError("");
    try {
      const [nextIssues, nextRepos] = await Promise.all([
        fetchProjectIssues(project.id),
        fetchProjectRepositories(project.id),
      ]);
      setIssues(nextIssues);
      setRepos(nextRepos);
      setRepoId((current) => nextRepos.some((repo) => String(repo.id) === String(current))
        ? current : String(nextRepos[0]?.id ?? ""));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "이슈 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [project?.id]);

  useEffect(() => { load(); }, [load]);

  async function createIssue() {
    if (!repoId || !title.trim()) return;
    setCreating(true);
    setError("");
    try {
      const created = await createProjectIssue(project.id, {
        repoId: Number(repoId),
        title: title.trim(),
        body: body.trim(),
        labels: labels.split(",").map((label) => label.trim()).filter(Boolean),
      });
      setIssues((current) => [created, ...current]);
      setFilter("open");
      setTitle("");
      setBody("");
      setLabels("");
      setComposerOpen(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "이슈 생성에 실패했습니다.");
    } finally {
      setCreating(false);
    }
  }

  const openCount = issues.filter((issue) => issue.state !== "closed").length;
  const closedCount = issues.length - openCount;
  const counts = { open: openCount, closed: closedCount, all: issues.length };
  const visible = issues.filter((issue) => filter === "all" || (filter === "closed" ? issue.state === "closed" : issue.state !== "closed"));
  const hasRepos = repos.length > 0;

  let content;
  if (loading) {
    content = <LoadingState label="이슈를 불러오는 중…" />;
  } else if (error && issues.length === 0) {
    content = (
      <EmptyState icon="warning" title="이슈를 불러오지 못했습니다" description={error}>
        <ActionButton onClick={load}><Icon name="refresh" size={13} /> 다시 시도</ActionButton>
      </EmptyState>
    );
  } else if (!hasRepos) {
    content = (
      <EmptyState icon="link" title="연결된 GitHub 레포가 없습니다" description="레포를 연결하면 그 레포의 이슈를 여기서 모아 보고, 기능 명세의 작업을 이슈로 만들 수 있습니다.">
        <ActionButton variant="primary" onClick={() => navigateDashboard({ projectId: project.id, view: "settings", tab: "repositories" })}>레포 연결하기</ActionButton>
      </EmptyState>
    );
  } else if (issues.length === 0) {
    content = (
      <EmptyState icon="flag" title="아직 이슈가 없습니다" description={`연결된 레포 ${repos.length}개에 이슈가 없습니다. ${canManage ? "여기서 이슈를 만들면 GitHub에도 바로 생깁니다." : "PM이 이슈를 만들면 여기에 나타납니다."}`}>
        {canManage && <ActionButton variant="primary" onClick={() => setComposerOpen(true)}><Icon name="plus" size={13} /> 이슈 만들기</ActionButton>}
      </EmptyState>
    );
  } else if (visible.length === 0) {
    content = (
      <EmptyState compact icon={filter === "open" ? "check" : "flag"} title={filter === "open" ? "진행 중인 이슈가 없습니다" : "완료된 이슈가 없습니다"} description={filter === "open" ? "열려 있는 이슈를 모두 처리했습니다." : "이슈를 닫으면 여기에 모입니다."}>
        <ActionButton onClick={() => setFilter("all")}>전체 보기</ActionButton>
      </EmptyState>
    );
  } else {
    content = (
      <div className="gh-list">
        {visible.map((issue) => (
          <a key={`${issue.repoId}-${issue.number}`} className={`gh-row${issue.state === "closed" ? " is-closed" : ""}`} href={issue.htmlUrl} target="_blank" rel="noreferrer">
            <Icon name={issue.state === "closed" ? "check" : "flag"} size={15} strokeWidth={1.8} className="gh-row__icon" />
            <span className="gh-row__body">
              <span className="gh-row__title">{issue.title}</span>
              <span className="gh-row__meta">
                {issue.repoFullName} #{issue.number} · {issue.authorLogin || "작성자 정보 없음"} · {dateLabel(issue.createdAt)}
              </span>
              {(issue.labels || []).length > 0 && (
                <span className="gh-row__labels">{issue.labels.map((label) => <Badge key={label}>{label}</Badge>)}</span>
              )}
            </span>
            <Badge tone={issue.state === "closed" ? "neutral" : "success"}>{issue.state === "closed" ? "완료" : "진행 중"}</Badge>
          </a>
        ))}
      </div>
    );
  }

  return (
    <div className="gh-panel">
      <PanelHeader project={project} label="이슈 전체">
        <ActionButton variant="ghost" iconOnly title="새로고침" aria-label="새로고침" disabled={loading} onClick={load}><Icon name="refresh" size={14} /></ActionButton>
        {canManage && hasRepos && (
          <ActionButton variant={composerOpen ? "secondary" : "primary"} onClick={() => setComposerOpen((open) => !open)}>
            {composerOpen ? "취소" : <><Icon name="plus" size={13} /> 이슈 만들기</>}
          </ActionButton>
        )}
      </PanelHeader>

      {hasRepos && issues.length > 0 && (
        <PanelToolbar>
          <div className="gh-filter" role="tablist" aria-label="이슈 상태">
            {FILTERS.map((item) => (
              <button key={item.key} type="button" role="tab" aria-selected={filter === item.key} className={`gh-filter__item${filter === item.key ? " is-active" : ""}`} onClick={() => setFilter(item.key)}>
                {item.label} <span>{counts[item.key]}</span>
              </button>
            ))}
          </div>
        </PanelToolbar>
      )}

      <div className="gh-body">
        <div className="gh-body__inner">
          {composerOpen && (
            <div className="gh-composer">
              <select className="ui-input" style={{ width: "100%" }} value={repoId} onChange={(event) => setRepoId(event.target.value)} aria-label="레포">
                {repos.map((repo) => <option key={repo.id} value={repo.id}>{repo.fullName}</option>)}
              </select>
              <input className="ui-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="이슈 제목" aria-label="이슈 제목" />
              <textarea className="ui-input" value={body} onChange={(event) => setBody(event.target.value)} placeholder="설명 (선택)" rows={5} aria-label="이슈 설명" />
              <input className="ui-input" value={labels} onChange={(event) => setLabels(event.target.value)} placeholder="라벨, 쉼표로 구분 (선택)" aria-label="라벨" />
              <div className="gh-composer__actions">
                <ActionButton onClick={() => setComposerOpen(false)}>취소</ActionButton>
                <ActionButton variant="primary" disabled={creating || !repoId || !title.trim()} onClick={createIssue}>{creating ? "만드는 중…" : "GitHub 이슈 만들기"}</ActionButton>
              </div>
            </div>
          )}
          {error && issues.length > 0 && <div className="gh-error" role="alert">{error}</div>}
          {content}
        </div>
      </div>
    </div>
  );
}
