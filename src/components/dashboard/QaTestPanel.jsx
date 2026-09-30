"use client";

import { useEffect, useState } from "react";
import { fetchQaScenarios, createQaScenario, generateQaScenarios, runQaScenario, deleteQaScenario } from "@/lib/qaScenarioApi";
import { useToast } from "@/context/ToastContext";

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

const VERDICT_STYLE = {
  PASS: { label: "통과", bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.3)", color: "#059669" },
  FAIL: { label: "실패", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.3)", color: "#dc2626" },
  INCONCLUSIVE: { label: "판단 불가", bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.3)", color: "#b45309" },
};

const EMPTY_FORM = { featureName: "", type: "NORMAL", title: "", given: "", when: "", then: "" };

export function QaTestPanel({ project }) {
  const { showToast } = useToast();
  const [filter, setFilter] = useState("all");
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
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
      return;
    }
    setGenerating(true);
    try {
      const created = await generateQaScenarios(project.id, filter);
      setScenarios(current => [...current, ...created]);
      showToast("success", `${created.length}개의 시나리오를 생성했어요.`);
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "AI 시나리오 생성에 실패했습니다");
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
    try {
      const updated = await runQaScenario(project.id, scenarioId);
      setScenarios(current => current.map(s => (s.id === scenarioId ? updated : s)));
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "시나리오 실행에 실패했습니다");
    } finally {
      setRunningId(null);
    }
  }

  async function handleDelete(scenarioId) {
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

  return (
    <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", overflow:"hidden", background:"var(--surface)", color:"var(--text-1)" }}>
      <div style={{
        height: 52, flexShrink: 0, borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", padding: "0 24px", gap: 10,
        background: "var(--surface)",
      }}>
        {project && (
          <>
            <div style={{
              width: 22, height: 22, borderRadius: 6,
              background: `${project.color || "var(--text-1)"}22`,
              border: `1px solid ${project.color || "var(--text-1)"}44`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 900, color: project.color || "#6b6960",
            }}>{(project.name || "P").charAt(0).toUpperCase()}</div>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)" }}>{project.name}</span>
            <span style={{ fontSize: 13, color: "var(--text-3)" }}>›</span>
          </>
        )}
        <span style={{
          fontSize: 13, fontWeight: 500, color: "#fbbf24",
          padding: "2px 8px", borderRadius: 6,
          background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)",
        }}>QA 테스트</span>
        <span style={{ fontSize: 11, color: "var(--text-3)", padding: "2px 8px", borderRadius: 10, background: "rgba(0,0,0,0.05)" }}>{scenarios.length}개 시나리오</span>
        <div style={{ flex: 1 }} />
        <label style={{ fontSize:12, display:"flex", alignItems:"center", gap:8, color:"var(--text-3)" }}>
          대상 기능
          <select aria-label="QA 대상 기능" value={filter} onChange={e=>setFilter(e.target.value)} style={{ padding:"6px 10px", border:"1px solid var(--border)", borderRadius:8, background:"var(--surface)", color:"var(--text-1)", fontSize:12, fontFamily:"inherit" }}>
            <option value="all">전체 기능</option>
            {features.map(f=><option key={f.id} value={f.name}>{f.name}</option>)}
          </select>
        </label>
        <button
          type="button" onClick={handleGenerate} disabled={generating || filter === "all"}
          style={{ padding:"6px 12px", borderRadius:8, border:"1px solid var(--border)", background:"var(--text-1)", color:"var(--bg)", fontSize:12, fontWeight:700, cursor: generating || filter === "all" ? "not-allowed" : "pointer", opacity: generating || filter === "all" ? 0.5 : 1, fontFamily:"inherit" }}
        >{generating ? "생성 중…" : "AI로 생성"}</button>
        <button
          type="button" onClick={() => setShowAddForm(v => !v)}
          style={{ padding:"6px 12px", borderRadius:8, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text-1)", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}
        >{showAddForm ? "취소" : "+ 직접 추가"}</button>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:32 }}>
        <p style={{ color:"var(--text-3)", fontSize:13, lineHeight:1.7, margin:"0 0 24px" }}>
          AI가 기능 명세를 근거로 생성했거나 직접 작성한 시나리오입니다. &ldquo;실행&rdquo;을 누르면 AI가 현재 API/DB 명세와
          (연결된 레포가 있다면) 관련 코드를 근거로 통과 여부를 판단합니다 — 실제로 코드를 실행하지는 않습니다.
        </p>

        {showAddForm && (
          <div style={{ border:"1px solid var(--border)", borderRadius:12, padding:20, marginBottom:20, display:"grid", gap:10 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 140px", gap:10 }}>
              <label style={{ display:"grid", gap:4, fontSize:12, color:"var(--text-3)" }}>
                대상 기능
                <select value={form.featureName} onChange={e=>setForm(f=>({...f, featureName:e.target.value}))} style={{ padding:"8px 10px", border:"1px solid var(--border)", borderRadius:8, background:"var(--surface)", color:"var(--text-1)", fontFamily:"inherit" }}>
                  <option value="">선택 안 함</option>
                  {features.map(f=><option key={f.id} value={f.name}>{f.name}</option>)}
                </select>
              </label>
              <label style={{ display:"grid", gap:4, fontSize:12, color:"var(--text-3)" }}>
                유형
                <select value={form.type} onChange={e=>setForm(f=>({...f, type:e.target.value}))} style={{ padding:"8px 10px", border:"1px solid var(--border)", borderRadius:8, background:"var(--surface)", color:"var(--text-1)", fontFamily:"inherit" }}>
                  <option value="NORMAL">정상</option>
                  <option value="EXCEPTION">예외</option>
                  <option value="BOUNDARY">경계</option>
                </select>
              </label>
            </div>
            <input placeholder="제목" value={form.title} onChange={e=>setForm(f=>({...f, title:e.target.value}))}
              style={{ padding:"8px 10px", border:"1px solid var(--border)", borderRadius:8, background:"var(--surface)", color:"var(--text-1)", fontFamily:"inherit", fontSize:13 }} />
            <input placeholder="사전 조건 (given)" value={form.given} onChange={e=>setForm(f=>({...f, given:e.target.value}))}
              style={{ padding:"8px 10px", border:"1px solid var(--border)", borderRadius:8, background:"var(--surface)", color:"var(--text-1)", fontFamily:"inherit", fontSize:13 }} />
            <input placeholder="수행 절차 (when)" value={form.when} onChange={e=>setForm(f=>({...f, when:e.target.value}))}
              style={{ padding:"8px 10px", border:"1px solid var(--border)", borderRadius:8, background:"var(--surface)", color:"var(--text-1)", fontFamily:"inherit", fontSize:13 }} />
            <input placeholder="예상 결과 (then)" value={form.then} onChange={e=>setForm(f=>({...f, then:e.target.value}))}
              style={{ padding:"8px 10px", border:"1px solid var(--border)", borderRadius:8, background:"var(--surface)", color:"var(--text-1)", fontFamily:"inherit", fontSize:13 }} />
            <div>
              <button type="button" onClick={handleCreate} disabled={saving}
                style={{ padding:"8px 16px", borderRadius:8, border:"none", background:"var(--text-1)", color:"var(--bg)", fontSize:13, fontWeight:700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, fontFamily:"inherit" }}
              >{saving ? "추가 중…" : "추가"}</button>
            </div>
          </div>
        )}

        {loading ? (
          <p style={{ color:"var(--text-3)", fontSize:13 }}>불러오는 중…</p>
        ) : !features.length && !scenarios.length ? (
          <p style={{ padding:32, border:"1px dashed var(--border)", borderRadius:12 }}>기능 명세서를 먼저 작성하면 기능별로 AI 시나리오를 생성할 수 있습니다.</p>
        ) : !visible.length ? (
          <p style={{ padding:32, border:"1px dashed var(--border)", borderRadius:12 }}>아직 시나리오가 없습니다. 대상 기능을 선택하고 &ldquo;AI로 생성&rdquo;하거나 직접 추가해 보세요.</p>
        ) : (
          <div style={{ display:"grid", gap:16 }}>
            {visible.map(scenario => {
              const verdict = scenario.verdict ? VERDICT_STYLE[scenario.verdict] : null;
              const running = runningId === scenario.id;
              return (
                <article key={scenario.id} style={{ border:"1px solid var(--border)", borderRadius:12, padding:22 }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center", fontSize:12, color:"var(--text-3)", flexWrap:"wrap" }}>
                    <span>{TYPE_LABEL[scenario.type] || scenario.type}</span>
                    <span>{scenario.source === "AI" ? "AI 생성" : "직접 작성"}</span>
                    <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
                      {verdict ? (
                        <span style={{ background:verdict.bg, color:verdict.color, border:`1px solid ${verdict.border}`, borderRadius:6, padding:"4px 8px", fontWeight:700 }}>{verdict.label}</span>
                      ) : (
                        <span style={{ background:"#fff7ed", color:"#9a3412", borderRadius:6, padding:"4px 8px" }}>미실행</span>
                      )}
                      <button type="button" onClick={() => handleDelete(scenario.id)} disabled={deletingId === scenario.id}
                        style={{ border:"none", background:"transparent", color:"var(--text-3)", cursor:"pointer", fontSize:14, lineHeight:1, padding:2 }}
                        aria-label="시나리오 삭제"
                      >×</button>
                    </div>
                  </div>
                  <h2 style={{ fontSize:16, margin:"14px 0" }}>{scenario.title}</h2>
                  <dl style={{ margin:0, display:"grid", gridTemplateColumns:"110px minmax(0,1fr)", gap:"12px 16px", fontSize:13, lineHeight:1.7, overflowWrap:"anywhere" }}>
                    <dt>대상 기능</dt><dd style={{ margin:0 }}>{scenario.featureName || "—"}</dd>
                    <dt>사전 조건</dt><dd style={{ margin:0 }}>{scenario.given || "—"}</dd>
                    <dt>수행 절차</dt><dd style={{ margin:0 }}>{scenario.when || "—"}</dd>
                    <dt>예상 결과</dt><dd style={{ margin:0 }}>{scenario.then}</dd>
                    <dt>실행 결과</dt>
                    <dd style={{ margin:0 }}>
                      {scenario.verdict ? (
                        <div style={{ display:"grid", gap:6 }}>
                          <span style={{ color:"var(--text-1)" }}>{scenario.reasoning}</span>
                          {scenario.evidence?.length > 0 && (
                            <ul style={{ margin:0, paddingLeft:18, color:"var(--text-3)" }}>
                              {scenario.evidence.map((item, i) => <li key={i}>{item}</li>)}
                            </ul>
                          )}
                        </div>
                      ) : (
                        <span style={{ color:"var(--text-3)" }}>미실행 — 아래 버튼으로 AI 판정을 받아 보세요</span>
                      )}
                    </dd>
                  </dl>
                  <div style={{ marginTop:14 }}>
                    <button type="button" onClick={() => handleRun(scenario.id)} disabled={running}
                      style={{ padding:"7px 14px", borderRadius:8, border:"1px solid var(--border)", background: running ? "var(--surface)" : "var(--text-1)", color: running ? "var(--text-3)" : "var(--bg)", fontSize:12, fontWeight:700, cursor: running ? "not-allowed" : "pointer", fontFamily:"inherit" }}
                    >{running ? "AI 판단 중…" : scenario.verdict ? "다시 실행" : "실행"}</button>
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
