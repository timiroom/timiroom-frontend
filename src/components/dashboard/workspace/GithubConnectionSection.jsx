"use client";

import { useEffect, useState } from "react";
import { ActionButton, Avatar, Badge, SettingsEmpty, SettingsItem, SettingsSection } from "@/components/ui";
import { Spinner } from "@/components/dashboard/mypage/teamWorkspace/PanelPrimitives";
import {
  GITHUB_APP_INSTALL_URL,
  linkTeamGithubInstallation,
  syncTeamGithubInstallations,
  unlinkTeamGithubInstallation,
} from "@/lib/githubApi";
import { useToast } from "@/context/ToastContext";
import { confirmDialog } from "@/lib/feedback";

function accountTypeLabel(accountType) {
  if (accountType === "Organization") return "조직";
  if (accountType === "User") return "개인";
  return accountType ?? "";
}

/**
 * 워크스페이스 ↔ GitHub App 설치 연결 관리 섹션.
 * installations는 팀 스코프로 이미 연결된 목록을 상위(설정 > 워크스페이스)에서 불러와 넘겨준다.
 */
export function GithubConnectionSection({
  title = "GitHub 연동",
  sectionRef,
  highlighted,
  teamId,
  isOwner,
  installations,
  installationsLoading,
  onInstallationsChange,
}) {
  const { showToast } = useToast();
  const [syncing, setSyncing] = useState(false);
  const [unassigned, setUnassigned] = useState([]);
  const [linkingId, setLinkingId] = useState(null);
  const [unlinkingId, setUnlinkingId] = useState(null);

  // 워크스페이스 전환은 리마운트 없이 teamId prop만 바뀐다 — 동기화로 얻은 미할당 목록은 이전 워크스페이스 것이므로 비운다.
  useEffect(() => {
    setUnassigned([]);
  }, [teamId]);

  async function handleSync() {
    if (!teamId) return;
    setSyncing(true);
    try {
      const { connected, unassigned: found } = await syncTeamGithubInstallations(teamId);
      onInstallationsChange(connected);
      setUnassigned(found);
      if (found.length === 0) {
        showToast("success", "새로 연결할 GitHub 설치가 없습니다.");
      }
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "동기화에 실패했습니다.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleLink(installationId) {
    setLinkingId(installationId);
    try {
      const linked = await linkTeamGithubInstallation(teamId, installationId);
      onInstallationsChange([...installations, linked]);
      setUnassigned((prev) => prev.filter((i) => i.installationId !== installationId));
      showToast("success", "GitHub 설치를 연결했어요.");
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "연결에 실패했습니다.");
    } finally {
      setLinkingId(null);
    }
  }

  async function handleUnlink(installationId) {
    const ok = await confirmDialog("이 GitHub 계정 연결을 해제할까요? 이 계정의 레포는 프로젝트에 새로 붙일 수 없게 됩니다.", { confirmLabel: "연결 해제", danger: true });
    if (!ok) return;
    setUnlinkingId(installationId);
    try {
      await unlinkTeamGithubInstallation(teamId, installationId);
      onInstallationsChange(installations.filter((i) => i.installationId !== installationId));
      showToast("success", "GitHub 설치 연결을 해제했어요.");
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "연결 해제에 실패했습니다.");
    } finally {
      setUnlinkingId(null);
    }
  }

  return (
    <SettingsSection
      sectionRef={sectionRef}
      highlighted={highlighted}
      title={title}
      description="GitHub App을 설치한 계정을 연결하면 프로젝트에 레포를 붙이고 이슈·PR을 가져올 수 있습니다."
      actions={isOwner && (
        <>
          <ActionButton href={GITHUB_APP_INSTALL_URL} target="_blank" rel="noopener noreferrer">GitHub App 설치</ActionButton>
          <ActionButton variant="primary" disabled={syncing} onClick={handleSync}>{syncing ? "동기화 중…" : "동기화"}</ActionButton>
        </>
      )}
    >
      {installationsLoading ? (
        <Spinner />
      ) : installations.length === 0 ? (
        <SettingsEmpty>
          연결된 GitHub 계정이 없습니다.
          {isOwner && <><br />GitHub App을 설치한 뒤 동기화하면 여기에 나타납니다.</>}
        </SettingsEmpty>
      ) : (
        installations.map((installation) => (
          <SettingsItem
            key={installation.installationId}
            leading={<Avatar name={installation.accountLogin} square />}
            title={installation.accountLogin}
            subtitle={accountTypeLabel(installation.accountType)}
            trailing={<>
              <Badge tone="success">연결됨</Badge>
              {isOwner && (
                <ActionButton size="sm" disabled={unlinkingId === installation.installationId} onClick={() => handleUnlink(installation.installationId)}>
                  {unlinkingId === installation.installationId ? "해제 중…" : "연결 해제"}
                </ActionButton>
              )}
            </>}
          />
        ))
      )}

      {isOwner && unassigned.map((installation) => (
        <SettingsItem
          key={installation.installationId}
          leading={<Avatar name={installation.accountLogin} square />}
          title={installation.accountLogin}
          subtitle={`${accountTypeLabel(installation.accountType)} · 아직 어느 워크스페이스에도 연결되지 않음`}
          trailing={
            <ActionButton size="sm" variant="primary" disabled={linkingId === installation.installationId} onClick={() => handleLink(installation.installationId)}>
              {linkingId === installation.installationId ? "연결 중…" : "이 워크스페이스에 연결"}
            </ActionButton>
          }
        />
      ))}
    </SettingsSection>
  );
}
