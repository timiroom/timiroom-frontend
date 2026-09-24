"use client";

import { useState } from "react";
import { projectFeatures, featureScenarios } from "@/lib/qaScenarios";

export function ProjectKnowledgeGraph({ project }) {
  const features = projectFeatures(project);
  const [selected, setSelected] = useState(null);
  const feature = features.find(f=>f.id === selected);
  const height = Math.max(240, features.length * 100 + 40);
  return (
    <div style={{ flex:1, minWidth:0, overflowY:"auto", padding:32, background:"var(--surface)", color:"var(--text-1)" }}>
      <div style={{ fontSize:12, color:"var(--text-3)" }}>{project?.name}</div>
      <h1 style={{ fontSize:24 }}>지식그래프</h1>
      <p style={{ fontSize:13, color:"var(--text-3)", lineHeight:1.7 }}>프로젝트 → 기능 → 예상 QA 테스트의 연결 관계입니다. 기능을 선택하면 근거가 되는 요구사항을 확인할 수 있습니다.</p>
      {!features.length ? <p>기능 명세서를 작성하면 프로젝트의 연결 관계가 표시됩니다.</p> : <>
        <div style={{ overflowX:"auto", border:"1px solid var(--border)", borderRadius:12 }}>
          <svg role="img" aria-label={`${project?.name} 기능과 QA 연결 그래프`} viewBox={`0 0 880 ${height}`} style={{ width:"100%", minWidth:680, display:"block" }}>
            {features.map((f,i)=>{
              const y = i * 100 + 60;
              return <g key={f.id}>
                <path d={`M210 ${height/2} C270 ${height/2},270 ${y},330 ${y}`} fill="none" stroke="#d2d0c9" strokeWidth="1.5" />
                <path d={`M550 ${y} H650`} stroke="#d2d0c9" strokeWidth="1.5" />
                <g role="button" tabIndex={0} aria-label={`${f.name} 요구사항 보기`} onClick={()=>setSelected(f.id)} onKeyDown={e=>{ if(e.key === "Enter" || e.key === " ") {e.preventDefault();setSelected(f.id);} }} style={{ cursor:"pointer" }}>
                  <rect x="330" y={y-24} width="220" height="48" rx="10" fill={selected===f.id?"#e9e8e3":"#f7f6f3"} stroke="#aaa89f" />
                  <title>{f.name}</title><text x="440" y={y+5} textAnchor="middle" fontSize="13" fill="#33322e">{f.name.length>19?f.name.slice(0,18)+"…":f.name}</text>
                </g>
                <rect x="650" y={y-24} width="190" height="48" rx="10" fill="#fff7ed" stroke="#fed7aa" />
                <text x="745" y={y+5} textAnchor="middle" fontSize="13" fill="#9a3412">예상 테스트 {featureScenarios(f,i).length}개</text>
              </g>;
            })}
            <rect x="20" y={height/2-30} width="190" height="60" rx="12" fill="#6b6960" />
            <text x="115" y={height/2+5} textAnchor="middle" fill="white" fontSize="14">프로젝트 기능 명세</text>
          </svg>
        </div>
        <section aria-live="polite" style={{ marginTop:20, padding:20, border:"1px solid var(--border)", borderRadius:12 }}>
          <h2 style={{ fontSize:16 }}>{feature ? feature.name : "기능을 선택해 주세요"}</h2>
          {feature && <><p style={{ fontSize:13 }}>{feature.description}</p>{feature.requirements.length ? <ul>{feature.requirements.map((r,i)=><li key={i} style={{ fontSize:13, lineHeight:1.8 }}>{r}</li>)}</ul> : <p style={{ fontSize:13, color:"var(--text-3)" }}>상세 요구사항이 아직 없습니다.</p>}</>}
        </section>
      </>}
    </div>
  );
}
