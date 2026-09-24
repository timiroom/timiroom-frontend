"use client";

import { useState } from "react";
import { projectFeatures, featureScenarios } from "@/lib/qaScenarios";

export function QaTestPanel({ project }) {
  const [filter, setFilter] = useState("all");
  const features = projectFeatures(project);
  const scenarios = features.flatMap((feature, index) => featureScenarios(feature, index).map(test => ({ ...test, feature })));
  const visible = scenarios.filter(test => filter === "all" || test.feature.id === filter);
  return (
    <div style={{ flex:1, minWidth:0, overflowY:"auto", background:"var(--surface)", padding:32, color:"var(--text-1)" }}>
      <header style={{ marginBottom:24 }}>
        <div style={{ fontSize:12, color:"var(--text-3)", marginBottom:8 }}>{project?.name}</div>
        <h1 style={{ fontSize:24, margin:"0 0 10px" }}>QA 테스트</h1>
        <p style={{ color:"var(--text-3)", fontSize:13, lineHeight:1.7 }}>기능 명세를 바탕으로 구성한 예상 테스트 시나리오입니다. 테스트 데이터와 성공 조건을 검토한 뒤 실행하세요. 실제 테스트를 실행한 결과가 아닙니다.</p>
        <label style={{ fontSize:13 }}>대상 기능 <select aria-label="QA 대상 기능" value={filter} onChange={e=>setFilter(e.target.value)} style={{ marginLeft:8, padding:"8px 12px", border:"1px solid var(--border)", borderRadius:8, background:"var(--surface)", color:"inherit" }}>
          <option value="all">전체 기능 ({scenarios.length}개 시나리오)</option>
          {features.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
        </select></label>
      </header>
      {!features.length && <p style={{ padding:32, border:"1px dashed var(--border)", borderRadius:12 }}>기능 명세서를 먼저 작성하면 기능별 예상 테스트 시나리오가 표시됩니다.</p>}
      <div style={{ display:"grid", gap:16 }}>
        {visible.map(test=><article key={test.id} style={{ border:"1px solid var(--border)", borderRadius:12, padding:22 }}>
          <div style={{ display:"flex", gap:8, alignItems:"center", fontSize:12, color:"var(--text-3)", flexWrap:"wrap" }}>
            <span>{test.id}</span><span>{test.type}</span><span style={{ marginLeft:"auto", background:"#fff7ed", color:"#9a3412", borderRadius:6, padding:"4px 8px" }}>검토 필요 · 미실행</span>
          </div>
          <h2 style={{ fontSize:16, margin:"14px 0" }}>{test.title}</h2>
          <dl style={{ margin:0, display:"grid", gridTemplateColumns:"110px minmax(0,1fr)", gap:"12px 16px", fontSize:13, lineHeight:1.7, overflowWrap:"anywhere" }}>
            <dt>대상 기능</dt><dd style={{ margin:0 }}>{test.feature.name}</dd>
            <dt>사전 조건</dt><dd style={{ margin:0 }}>{test.given}</dd>
            <dt>수행 절차</dt><dd style={{ margin:0 }}>{test.when}</dd>
            <dt>예상 결과</dt><dd style={{ margin:0 }}>{test.then}</dd>
            <dt>실행 결과</dt><dd style={{ margin:0, color:"var(--text-3)" }}>미실행 — 실제 결과 및 증빙은 테스트 실행 후 기록</dd>
          </dl>
        </article>)}
      </div>
    </div>
  );
}
