"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { confirmDialog } from "@/lib/feedback";
import { uploadUserAvatar, updateMemberGithubLogin, updateMemberName } from "@/lib/teamApi";
import { ActionButton, Avatar, Badge, SettingsHeader, SettingsRow, SettingsSection } from "@/components/ui";

/** 설정 > 내 계정 > 프로필. 이름·사진·GitHub 계정을 바꾸고 로그아웃한다. */
export function ProfileSettings() {
  const { user, logout, refreshUser } = useAuth();
  const { showToast } = useToast();
  const avatarInputRef = useRef(null);
  const [nameDraft, setNameDraft] = useState("");
  const [githubDraft, setGithubDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => { setNameDraft(user?.name ?? ""); }, [user?.name]);
  useEffect(() => { setGithubDraft(user?.githubLogin ?? ""); }, [user?.githubLogin]);

  const email = user?.email ?? "";
  const provider = /gmail|google/i.test(email) ? "Google" : "GitHub";
  const githubNormalized = githubDraft.trim().replace(/^@/, "");
  const nameChanged = nameDraft.trim() !== (user?.name ?? "");
  const githubChanged = githubNormalized !== (user?.githubLogin ?? "");
  const dirty = nameChanged || githubChanged;

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      await uploadUserAvatar(file);
      await refreshUser();
      showToast("success", "프로필 사진을 저장했어요.");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "업로드에 실패했습니다.");
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }

  async function handleSave() {
    if (!nameDraft.trim()) return;
    setSaving(true);
    try {
      if (nameChanged) await updateMemberName(nameDraft.trim());
      if (githubChanged) await updateMemberGithubLogin(githubNormalized);
      await refreshUser();
      showToast("success", "프로필을 저장했어요.");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    const ok = await confirmDialog("로그아웃할까요?", { confirmLabel: "로그아웃" });
    if (ok) await logout();
  }

  return (
    <>
      <SettingsHeader title="프로필" meta={<span>다른 멤버에게 보이는 이름과 사진입니다.</span>} />

      <SettingsSection
        footer={<>
          <span>{dirty ? "저장하지 않은 변경이 있습니다." : "변경 사항 없음"}</span>
          <ActionButton variant="primary" disabled={!dirty || saving || !nameDraft.trim()} onClick={handleSave}>
            {saving ? "저장 중…" : "저장"}
          </ActionButton>
        </>}
      >
        <SettingsRow label="사진" description="JPG, PNG, WebP">
          <Avatar name={user?.name || email} src={user?.avatarUrl} size={40} />
          <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarChange} style={{ display: "none" }} />
          <ActionButton disabled={uploadingAvatar} onClick={() => avatarInputRef.current?.click()}>
            {uploadingAvatar ? "올리는 중…" : "사진 변경"}
          </ActionButton>
        </SettingsRow>
        <SettingsRow label="이름">
          <input className="ui-input" value={nameDraft} maxLength={30} onChange={(e) => setNameDraft(e.target.value)} aria-label="이름" />
        </SettingsRow>
        <SettingsRow label="GitHub 계정" description="기능 작업을 GitHub 이슈로 만들 때 담당자로 지정됩니다.">
          <input className="ui-input" value={githubDraft} onChange={(e) => setGithubDraft(e.target.value)} placeholder="github-username" aria-label="GitHub 사용자명" />
        </SettingsRow>
        <SettingsRow label="이메일" description="로그인한 계정의 이메일이라 여기서 바꿀 수 없습니다.">
          <span style={{ fontSize: 13, color: "var(--text-1)" }}>{email || "—"}</span>
          <Badge>{provider} 로그인</Badge>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="세션">
        <SettingsRow label="로그아웃" description="이 브라우저에서 로그아웃하고 첫 화면으로 돌아갑니다.">
          <ActionButton onClick={handleLogout}>로그아웃</ActionButton>
        </SettingsRow>
      </SettingsSection>
    </>
  );
}
