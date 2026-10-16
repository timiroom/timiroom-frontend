"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/context/ToastContext";
import { useUsage } from "@/context/UsageContext";
import { confirmDialog } from "@/lib/feedback";
import { PROVIDERS, deleteAiKey, fetchAiKeys, registerAiKey, updateAiKey, verifyAiKey } from "@/lib/aiKeyApi";
import { ActionButton, Badge, EmptyState, LoadingState, SettingsHeader, SettingsRow, SettingsSection } from "@/components/ui";

const EMPTY_FORM = { provider: "OPENAI", model: PROVIDERS.OPENAI.models[0], baseUrl: "", apiKey: "" };

function timeLabel(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/**
 * 설정 > 내 계정 > 내 AI 키. Cursor처럼 제공자별 키를 넣으면 AI 기능을 내 계정 요금으로 쓴다.
 * 한 번에 하나만 쓴다. 키는 서버에 암호화해 두고 끝자리만 보여 준다.
 */
export function AiKeySettings() {
  const { showToast } = useToast();
  const { refresh: refreshUsage } = useUsage();
  const [keys, setKeys] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [modelDrafts, setModelDrafts] = useState({});
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await fetchAiKeys();
      setKeys(data?.keys ?? []);
      setError("");
    } catch (e) {
      setError(e.message);
      setKeys([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const provider = PROVIDERS[form.provider];
  const canSave = form.apiKey.trim() && form.model.trim() && (form.provider !== "CUSTOM" || form.baseUrl.trim());

  function chooseProvider(id) {
    setForm((current) => ({ ...current, provider: id, model: PROVIDERS[id].models[0] ?? "", baseUrl: id === "CUSTOM" ? current.baseUrl : "" }));
  }

  async function handleRegister(event) {
    event.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      await registerAiKey({ provider: form.provider, model: form.model.trim(), apiKey: form.apiKey.trim(),
        baseUrl: form.provider === "CUSTOM" ? form.baseUrl.trim() : undefined });
      setForm({ ...EMPTY_FORM });
      showToast("success", "키를 연결했습니다.");
      await load();
      refreshUsage();
    } catch (e) {
      showToast("error", e.message);
    } finally {
      setSaving(false);
    }
  }

  async function run(id, action, success) {
    setBusyId(id);
    try {
      await action();
      if (success) showToast("success", success);
      await load();
      refreshUsage();
    } catch (e) {
      showToast("error", e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(key) {
    const ok = await confirmDialog(`${PROVIDERS[key.provider]?.label ?? key.provider} 키(${key.keyHint})를 지울까요? 지우면 티미룸 사용 한도로 돌아갑니다.`, { confirmLabel: "지우기", danger: true });
    if (ok) run(key.id, () => deleteAiKey(key.id), "키를 지웠습니다.");
  }

  return (
    <>
      <SettingsHeader eyebrow="내 계정" title="내 AI 키" meta={<span>내 키로 쓰면 사용량 한도에 포함되지 않습니다.</span>} />
      {error && <div className="gh-error" role="alert">{error}</div>}

      <SettingsSection title="연결된 키">
        {keys === null ? <LoadingState /> : keys.length === 0 ? (
          <EmptyState compact icon="key" title="연결된 키가 없습니다" />
        ) : keys.map((key) => {
          const info = PROVIDERS[key.provider] ?? { label: key.provider, models: [] };
          const draft = modelDrafts[key.id];
          const busy = busyId === key.id;
          return (
            <div key={key.id} className="aikey-row">
              <div className="aikey-row__main">
                <div className="aikey-row__title">
                  {info.label}
                  {key.active ? <Badge tone="success">사용 중</Badge> : <Badge>꺼짐</Badge>}
                  {key.lastError && <Badge tone="danger">확인 실패</Badge>}
                </div>
                <div className="aikey-row__meta">
                  <code>{key.keyHint}</code>
                  {key.provider === "CUSTOM" && <> · {key.baseUrl}</>}
                  {key.lastVerifiedAt && <> · {timeLabel(key.lastVerifiedAt)} 확인</>}
                </div>
                {key.lastError && <div className="aikey-row__error">{key.lastError}</div>}
                <div className="aikey-row__model">
                  <label htmlFor={`aikey-model-${key.id}`}>모델</label>
                  <input id={`aikey-model-${key.id}`} className="ui-input" list={`aikey-models-${key.provider}`}
                    value={draft ?? key.model} onChange={(e) => setModelDrafts((d) => ({ ...d, [key.id]: e.target.value }))} />
                  {draft !== undefined && draft.trim() && draft.trim() !== key.model && (
                    <ActionButton size="sm" disabled={busy} onClick={() => run(key.id, async () => {
                      await updateAiKey(key.id, { model: draft.trim() });
                      setModelDrafts((d) => { const next = { ...d }; delete next[key.id]; return next; });
                    }, "모델을 바꿨습니다.")}>모델 저장</ActionButton>
                  )}
                </div>
              </div>
              <div className="aikey-row__actions">
                <ActionButton size="sm" variant={key.active ? "ghost" : "primary"} disabled={busy}
                  onClick={() => run(key.id, () => updateAiKey(key.id, { active: !key.active }), key.active ? "키를 껐습니다." : "이 키를 쓰기 시작합니다.")}>
                  {key.active ? "끄기" : "사용"}
                </ActionButton>
                <ActionButton size="sm" variant="ghost" disabled={busy} onClick={() => run(key.id, () => verifyAiKey(key.id), "연결을 확인했습니다.")}>연결 확인</ActionButton>
                <ActionButton size="sm" variant="ghost" disabled={busy} onClick={() => handleDelete(key)}>지우기</ActionButton>
              </div>
            </div>
          );
        })}
      </SettingsSection>

      <form onSubmit={handleRegister}>
        <SettingsSection title="키 추가"
          footer={<>
            <span>키는 암호화해 저장합니다.</span>
            <ActionButton type="submit" variant="primary" disabled={!canSave || saving}>{saving ? "확인 중…" : "연결"}</ActionButton>
          </>}>
          <SettingsRow label="제공자" stacked>
            <div className="aikey-providers" role="radiogroup" aria-label="AI 제공자">
              {Object.entries(PROVIDERS).map(([id, item]) => (
                <button key={id} type="button" role="radio" aria-checked={form.provider === id}
                  className={`aikey-provider${form.provider === id ? " is-active" : ""}`} onClick={() => chooseProvider(id)}>
                  {item.label}
                </button>
              ))}
            </div>
          </SettingsRow>
          {form.provider === "CUSTOM" && (
            <SettingsRow label="API 주소" description="OpenAI 호환 https 주소">
              <input className="ui-input" value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                placeholder="https://…/v1" aria-label="API 주소" inputMode="url" />
            </SettingsRow>
          )}
          <SettingsRow label="모델">
            <input className="ui-input" list={`aikey-models-${form.provider}`} value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="모델 이름" aria-label="모델" />
          </SettingsRow>
          <SettingsRow label="API 키" description={<>
            {provider.hint}
            {provider.keyUrl && <> · <a href={provider.keyUrl} target="_blank" rel="noopener noreferrer">키 만들기</a></>}
          </>}>
            <input className="ui-input" type="password" autoComplete="off" value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder="키를 붙여 넣으세요" aria-label="API 키" />
          </SettingsRow>
        </SettingsSection>
      </form>

      {Object.entries(PROVIDERS).map(([id, item]) => (
        <datalist key={id} id={`aikey-models-${id}`}>{item.models.map((m) => <option key={m} value={m} />)}</datalist>
      ))}
    </>
  );
}
