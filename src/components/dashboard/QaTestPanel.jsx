"use client";

import { useEffect, useState } from "react";
import { fetchQaScenarios, createQaScenario, generateQaScenarios, runQaScenario, deleteQaScenario } from "@/lib/qaScenarioApi";
import { useToast } from "@/context/ToastContext";
import { confirmDialog } from "@/lib/feedback";
import { ActionButton, AiErrorNotice, AiWorking, Badge, EmptyState, Icon, LoadingState, PanelHeader } from "@/components/ui";
import { AiRequestError } from "@/lib/aiErrors.mjs";

/** 프로젝트의 기능 목록을 정규화한다 — featureList가 문자열/객체 배열이거나 PRD의 coreFeatures일 수 있다. */
function projectFeatures(project) {
  const list = project?.featureList;
  const detailed = project?.prdDocument?.coreFeatures;
  const source = Array.isArray(list) && list.length && typeof list[0] === "object"
    ? list : Array.isArray(detailed) && detailed.length ? detailed : Array.isArray(list) ? list : [];
  return source.filter(Boolean).map((item, index) => {
    const feature = typeof item === "string" ? { name: item } : item;
    return { id: `feature-${index}`, name: feature.name || feature.title || `기능 ${index + 1}` };
  });
}

const TYPE_LABEL = { NORMAL: "정상", EXCEPTION: "예외", BOUNDARY: "경계" };

const VERDICT = {
  PASS: { label: "통과", tone: "success" },
  FAIL: { label: "실패", tone: "danger" },
  INCONCLUSIVE: { label: "판단 불가", tone: "warning" },
};

const EMPTY_FORM = { featureName: "", type: "NORMAL", title: "", given: "", when: "", then: "" };

export function QaTestPanel({ project }) {
  const { showToast } = useToast();
  const [filter, setFilter] = useState("all");
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  // AI 생성·실행 실패는 3초 만에 사라지는 토스트 대신 패널 안에 안내 카드로 남긴다(키 설정 바로가기·다시 시도)
  const [aiFailure, setAiFailure] = useState(null);
  const [runningId, setRunningId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const features = projectFeatures(project);
  const visible = scenarios.filter(s => filter === "all" || s.featureName === filter);

  useEffect(() => {
    let cancelled = false;
    if (!project?.id) return undefined;
    setLoading(true);
    fetchQaScenarios(project.id)
      .then(data => { if (!cancelled) setScenarios(data); })
      .catch(error => { if (!cancelled) showToast("error", error instanceof Error ? error.message : "QA 시나리오를 불러오지 못했습니다"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  async function handleGenerate() {
    if (filter === "all") {
      showToast("error", "AI로 생성할 대상 기능을 먼저 선택해 주세요.");
      document.querySelector("[aria-label=\"QA 대상 기능\"]")?.focus();
      return;
    }
    setGenerating(true);
    setAiFailure(null);
    try {
      const created = await generateQaScenarios(project.id, filter);
      setScenarios(current => [...current, ...created]);
      showToast("success", `${created.length}개의 시나리오를 생성했어요.`);
    } catch (error) {
      if (error instanceof AiRequestError) setAiFailure({ error, retry: handleGenerate });
      else showToast("error", error instanceof Error ? error.message : "AI 시나리오 생성에 실패했습니다");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCreate() {
    if (!form.title.trim() || !form.then.trim()) {
      showToast("error", "제목과 예상 결과(then)는 필수예요.");
      return;
    }
    setSaving(true);
    try {
      const created = await createQaScenario(project.id, form);
      setScenarios(current => [...current, created]);
      setForm(EMPTY_FORM);
      setShowAddForm(false);
      showToast("success", "시나리오를 추가했어요.");
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "시나리오 추가에 실패했습니다");
    } finally {
      setSaving(false);
    }
  }

  async function handleRun(scenarioId) {
    setRunningId(scenarioId);
    setAiFailure(null);
    try {
      const updated = await runQaScenario(project.id, scenarioId);
      setScenarios(current => current.map(s => (s.id === scenarioId ? updated : s)));
    } catch (error) {
      if (error instanceof AiRequestError) setAiFailure({ error, retry: () => handleRun(scenarioId) });
      else showToast("error", error instanceof Error ? error.message : "시나리오 실행에 실패했습니다");
    } finally {
      setRunningId(null);
    }
  }

  async function handleDelete(scenarioId) {
    if (!await confirmDialog("이 시나리오를 삭제할까요?", { danger: true })) return;
    setDeletingId(scenarioId);
    try {
      await deleteQaScenario(project.id, scenarioId);
      setScenarios(current => current.filter(s => s.id !== scenarioId));
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "시나리오 삭제에 실패했습니다");
    } finally {
      setDeletingId(null);
    }
  }

  const fieldStyle = "ui-input qa-input";
  return (
    <div className="qa-panel">
      <PanelHeader project={project} label="QA 테스트">
        <Badge>{scenarios.length}개 시나리오</Badge>
        <select className={fieldStyle} aria-label="QA 대상 기능" value={filter} onChange={e=>setFilter(e.target.value)}>
          <option value="all">전체 기능</option>
          {features.map(f=><option key={f.id} value={f.name}>{f.name}</option>)}
        </select>
        <ActionButton onClick={() => setShowAddForm(v => !v)}>
          {showAddForm ? "취소" : <><Icon name="plus" size={12} /> 직접 추가</>}
        </ActionButton>
        <ActionButton variant="primary" onClick={handleGenerate} disabled={generating}
          title={filter === "all" ? "대상 기능을 먼저 고르세요" : "선택한 기능의 시나리오를 AI가 만듭니다"}>
          <Icon name="zap" size={12} /> {generating ? "생성 중…" : "AI로 생성"}
        </ActionButton>
      </PanelHeader>

      <div className="qa-body">
        <p className="qa-intro">
          AI가 기능 명세를 근거로 만들었거나 직접 작성한 시나리오입니다. &ldquo;실행&rdquo;을 누르면 AI가 현재 API·DB 명세와
          (연결된 레포가 있다면) 관련 코드를 근거로 통과 여부를 판단합니다. 실제로 코드를 실행하지는 않습니다.
        </p>

        {aiFailure && !generating && (
          <div className="qa-gap">
            <AiErrorNotice error={aiFailure.error} onRetry={aiFailure.retry} />
          </div>
        )}

        {generating && (
          <div className="qa-gap">
            <AiWorking label={`'${filter}' 시나리오를 만들고 있습니다`} hint="정상·예외·경계 경우를 나눠 만듭니다. 보통 30초~1분 걸립니다." />
          </div>
        )}

        {showAddForm && (
          <div className="qa-form">
            <div className="qa-form__row">
              <label className="qa-label">
                대상 기능
                <select className={fieldStyle} value={form.featureName} onChange={e=>setForm(f=>({...f, featureName:e.target.value}))}>
                  <option value="">선택 안 함</option>
                  {features.map(f=><option key={f.id} value={f.name}>{f.name}</option>)}
                </select>
              </label>
              <label className="qa-label">
                유형
                <select className={fieldStyle} value={form.type} onChange={e=>setForm(f=>({...f, type:e.target.value}))}>
                  <option value="NORMAL">정상</option>
                  <option value="EXCEPTION">예외</option>
                  <option value="BOUNDARY">경계</option>
                </select>
              </label>
            </div>
            <input className={fieldStyle} placeholder="제목" value={form.title} onChange={e=>setForm(f=>({...f, title:e.target.value}))} />
            <input className={fieldStyle} placeholder="사전 조건 (given)" value={form.given} onChange={e=>setForm(f=>({...f, given:e.target.value}))} />
            <input className={fieldStyle} placeholder="수행 절차 (when)" value={form.when} onChange={e=>setForm(f=>({...f, when:e.target.value}))} />
            <input className={fieldStyle} placeholder="예상 결과 (then)" value={form.then} onChange={e=>setForm(f=>({...f, then:e.target.value}))} />
            <div><ActionButton variant="primary" onClick={handleCreate} disabled={saving}>{saving ? "추가 중…" : "추가"}</ActionButton></div>
          </div>
        )}

        {loading ? (
          <LoadingState label="QA 시나리오를 불러오는 중…" />
        ) : !features.length && !scenarios.length ? (
          <EmptyState icon="checklist" title="기능 명세가 필요합니다" description="기능 명세서를 먼저 만들면 기능별로 AI 시나리오를 생성할 수 있습니다." />
        ) : !visible.length ? (
          <EmptyState icon="checklist" title="아직 시나리오가 없습니다" description="위에서 대상 기능을 고르고 'AI로 생성'을 누르거나, 직접 추가해 보세요." />
        ) : (
          <div className="qa-list">
            {visible.map(scenario => {
              const verdict = scenario.verdict ? VERDICT[scenario.verdict] : null;
              const running = runningId === scenario.id;
              return (
                <article key={scenario.id} className="qa-card">
                  <div className="qa-card__meta">
                    <Badge>{TYPE_LABEL[scenario.type] || scenario.type}</Badge>
                    <span>{scenario.source === "AI" ? "AI 생성" : "직접 작성"}</span>
                    <span className="qa-card__end">
                      {verdict ? <Badge tone={verdict.tone}>{verdict.label}</Badge> : <Badge>미실행</Badge>}
                      <ActionButton size="sm" iconOnly variant="danger" onClick={() => handleDelete(scenario.id)} disabled={deletingId === scenario.id}
                        title="시나리오 삭제" aria-label="시나리오 삭제"><Icon name="trash" size={12} /></ActionButton>
                    </span>
                  </div>
                  <h2 className="qa-card__title">{scenario.title}</h2>
                  <dl className="qa-steps">
                    <dt>대상 기능</dt><dd>{scenario.featureName || "—"}</dd>
                    <dt>사전 조건</dt><dd>{scenario.given || "—"}</dd>
                    <dt>수행 절차</dt><dd>{scenario.when || "—"}</dd>
                    <dt>예상 결과</dt><dd>{scenario.then}</dd>
                    <dt>실행 결과</dt>
                    <dd>
                      {running ? (
                        <AiWorking compact label="AI가 판정하고 있습니다" hint="명세와 관련 코드를 근거로 통과 여부를 따집니다. 보통 30초~1분 걸립니다." />
                      ) : scenario.verdict ? (
                        <div className="qa-result">
                          <span>{scenario.reasoning}</span>
                          {scenario.evidence?.length > 0 && (
                            <ul>{scenario.evidence.map((item, i) => <li key={i}>{item}</li>)}</ul>
                          )}
                        </div>
                      ) : (
                        <span className="qa-muted">아직 실행하지 않았습니다.</span>
                      )}
                    </dd>
                  </dl>
                  <div className="qa-card__actions">
                    <ActionButton size="sm" variant={scenario.verdict ? "secondary" : "primary"} onClick={() => handleRun(scenario.id)} disabled={running || runningId !== null}>
                      <Icon name="play" size={11} /> {running ? "판정 중…" : scenario.verdict ? "다시 실행" : "실행"}
                    </ActionButton>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
