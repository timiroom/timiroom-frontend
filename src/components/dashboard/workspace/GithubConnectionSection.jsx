"use client";

import { useEffect, useState } from "react";
import { Spinner } from "@/components/dashboard/mypage/teamWorkspace/PanelPrimitives";
import {
  GITHUB_APP_INSTALL_URL,
  linkTeamGithubInstallation,
  syncTeamGithubInstallations,
  unlinkTeamGithubInstallation,
} from "@/lib/githubApi";
import { useToast } from "@/context/ToastContext";

const C = {
  border: "var(--border)",
  text: "#1a1916",
  muted: "var(--text-3)",
  subtle: "var(--text-2)",
};

function ActionButton({ children, onClick, disabled = false, outlined = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "7px 12px",
        borderRadius: 8,
        border: outlined ? "1px solid var(--border-2)" : "none",
        background: outlined ? "var(--surface)" : "var(--text-1)",
        color: outlined ? "var(--text-2)" : "var(--bg)",
        fontSize: 11,
        fontWeight: 700,
        cursor: disabled ? "progress" : "pointer",
        fontFamily: "inherit",
        opacity: disabled ? 0.7 : 1,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function accountTypeLabel(accountType) {
  if (accountType === "Organization") return "조직";
  if (accountType === "User") return "개인";
  return accountType ?? "";
}

function InstalledRow({ installation, isOwner, onUnlink, unlinking }) {
  return (
    <div
      style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "10px 14px",
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        marginBottom: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: "#10B981" }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {installation.accountLogin}
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
            {accountTypeLabel(installation.accountType)}
          </div>
        </div>
      </div>
      {isOwner && (
        <ActionButton outlined disabled={unlinking} onClick={() => onUnlink(installation.installationId)}>
          {unlinking ? "해제 중…" : "연결 해제"}
        </ActionButton>
      )}
    </div>
  );
}

function UnassignedRow({ installation, onLink, linking }) {
  return (
    <div
      style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "10px 14px",
        border: `1px dashed ${C.border}`,
        borderRadius: 10,
        marginBottom: 8,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {installation.accountLogin}
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
          {accountTypeLabel(installation.accountType)}
        </div>
      </div>
      <ActionButton disabled={linking} onClick={() => onLink(installation.installationId)}>
        {linking ? "연결 중…" : "이 워크스페이스에 연결"}
      </ActionButton>
    </div>
  );
}

/**
 * 워크스페이스 ↔ GitHub App 설치 연결 관리 섹션.
 * installations는 팀 스코프로 이미 연결된 목록을 상위(WorkspaceManagementView)에서 불러와 넘겨준다.
 */
export function GithubConnectionSection({
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
    <div
      ref={sectionRef}
      style={{
        marginBottom: 20,
        padding: "16px 18px",
        borderRadius: 14,
        border: `1px solid ${C.border}`,
        background: "var(--surface)",
        boxShadow: highlighted ? "0 0 0 2px rgba(107,105,96,0.18)" : "none",
        transition: "box-shadow 0.18s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>GitHub 연동</span>
          {!installationsLoading && (
            <span style={{ fontSize: 11, color: C.muted }}>{installations.length}개 연결됨</span>
          )}
        </div>
        {isOwner && (
          <div style={{ display: "flex", gap: 8 }}>
            <a
              href={GITHUB_APP_INSTALL_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center",
                padding: "7px 12px",
                borderRadius: 8,
                border: "1px solid var(--border-2)",
                background: "var(--surface)",
                color: C.subtle,
                fontSize: 11,
                fontWeight: 700,
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              GitHub App 설치하기
            </a>
            <ActionButton disabled={syncing} onClick={handleSync}>
              {syncing ? "동기화 중…" : "동기화"}
            </ActionButton>
          </div>
        )}
      </div>

      {installationsLoading ? (
        <Spinner />
      ) : installations.length === 0 ? (
        <div style={{ fontSize: 12, color: C.muted, padding: "8px 0", lineHeight: 1.7 }}>
          연결된 GitHub App 설치가 없습니다.
          {isOwner && (
            <>
              <br />
              GitHub App을 설치한 뒤 동기화하면 이 워크스페이스에 연결할 수 있어요.
            </>
          )}
        </div>
      ) : (
        installations.map((installation) => (
          <InstalledRow
            key={installation.installationId}
            installation={installation}
            isOwner={isOwner}
            onUnlink={handleUnlink}
            unlinking={unlinkingId === installation.installationId}
          />
        ))
      )}

      {isOwner && unassigned.length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px dashed ${C.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 8 }}>
            아직 어느 워크스페이스에도 연결되지 않은 설치 ({unassigned.length}개)
          </div>
          {unassigned.map((installation) => (
            <UnassignedRow
              key={installation.installationId}
              installation={installation}
              onLink={handleLink}
              linking={linkingId === installation.installationId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
