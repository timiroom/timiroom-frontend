"use client";

import { useState } from "react";
import { MOCK_PROJECTS, STATUS_META, MEMBER_COLORS } from "@/lib/projectData";

/* ── 정합성 스코어 미니 링 ── */
function ScoreMini({ score, color }) {
  const r = 20, circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width="52" height="52" viewBox="0 0 52 52">
      <circle cx="26" cy="26" r={r} fill="none" stroke="var(--db-bg-elevated)" strokeWidth="4"/>
      <circle
        cx="26" cy="26" r={r} fill="none"
        stroke={color} strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        strokeDashoffset={circ * 0.25}
        style={{ filter:`drop-shadow(0 0 4px ${color})` }}
      />
      <text x="26" y="30" textAnchor="middle" fontSize="11" fontWeight="800" fill={color}>
        {score}
      </text>
    </svg>
  );
}

/* ── 멤버 아바타 그룹 ── */
function MemberAvatars({ members }) {
  const show = members.slice(0, 3);
  const rest  = members.length - show.length;
  return (
    <div style={{ display:"flex", alignItems:"center" }}>
      {show.map((m, i) => (
        <div key={m+i} style={{
          width: 24, height: 24, borderRadius: "50%",
          background: MEMBER_COLORS[m] ?? "#555",
          border: "2px solid var(--db-bg-surface)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: 800, color: "white",
          marginLeft: i === 0 ? 0 : -6, zIndex: show.length - i,
          position: "relative",
        }}>{m}</div>
      ))}
      {rest > 0 && (
        <div style={{
          width: 24, height: 24, borderRadius: "50%",
          background: "var(--db-bg-elevated)",
          border: "2px solid var(--db-bg-surface)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, color: "var(--db-text-muted)", marginLeft: -6,
        }}>+{rest}</div>
      )}
    </div>
  );
}

/* ── 프로젝트 카드 ── */
function ProjectCard({ project, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const meta = STATUS_META[project.status];

  return (
    <div
      onClick={() => onSelect(project)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "var(--db-bg-surface)",
        border: `1px solid ${hovered ? project.color + "55" : "var(--db-border)"}`,
        borderRadius: "var(--db-radius-lg)",
        padding: "22px 24px",
        cursor: "pointer",
        transition: "var(--db-transition-slow)",
        transform: hovered ? "translateY(-4px)" : "none",
        boxShadow: hovered
          ? `0 16px 40px rgba(0,0,0,.4), 0 0 0 1px ${project.color}33`
          : "0 2px 8px rgba(0,0,0,.2)",
        display: "flex", flexDirection: "column", gap: 16,
        position: "relative", overflow: "hidden",
      }}
    >
      {/* 상단 색 줄 */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${project.color}, ${project.color}88)`,
        opacity: hovered ? 1 : 0.5,
        transition: "opacity .3s",
      }}/>

      {/* 헤더 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 100,
              background: meta.bg, color: meta.color,
              display: "flex", alignItems: "center", gap: 4,
            }}>
              {project.status === "running" && (
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: meta.color, display: "inline-block", animation: "db-pulse 1.5s infinite" }}/>
              )}
              {meta.label}
            </span>
            <span style={{ fontSize: 11, color: "var(--db-text-muted)" }}>{project.lastActivity}</span>
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: "var(--db-text-primary)", letterSpacing: "-.02em", marginBottom: 4 }}>
            {project.name}
          </div>
          <div style={{ fontSize: 12, color: "var(--db-text-muted)", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {project.description}
          </div>
        </div>
        <ScoreMini score={project.score} color={project.color}/>
      </div>

      {/* 진행 바 */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--db-text-muted)", marginBottom: 5 }}>
          <span>파이프라인 진행률</span>
          <span style={{ color: "var(--db-text-secondary)", fontWeight: 600 }}>{project.progress}%</span>
        </div>
        <div style={{ height: 4, background: "var(--db-bg-elevated)", borderRadius: 100, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${project.progress}%`,
            background: `linear-gradient(90deg, ${project.color}, ${project.color}99)`,
            borderRadius: 100,
            boxShadow: `0 0 6px ${project.color}`,
            transition: "width .8s ease",
          }}/>
        </div>
      </div>

      {/* 태그 */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        {project.tags.map(tag => (
          <span key={tag} style={{
            fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 100,
            background: "var(--db-bg-elevated)", color: "var(--db-text-muted)",
            border: "1px solid var(--db-border)",
          }}>{tag}</span>
        ))}
      </div>

      {/* 푸터 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: "1px solid var(--db-border)" }}>
        <MemberAvatars members={project.members}/>
        <div style={{ display: "flex", gap: 14 }}>
          {[
            { icon: "📋", val: project.prdCount,  tip: "요구사항" },
            { icon: "📄", val: project.specCount, tip: "명세서"   },
            { icon: "⚠️", val: project.issueCount, tip: "이슈"    },
          ].map(s => (
            <div key={s.tip} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--db-text-muted)" }}>
              <span>{s.icon}</span>
              <span style={{ fontWeight: 600 }}>{s.val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── 새 프로젝트 카드 ── */
function NewProjectCard({ onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: `1.5px dashed ${hovered ? "var(--db-purple-400)" : "var(--db-border-mid)"}`,
        borderRadius: "var(--db-radius-lg)",
        padding: "22px 24px", cursor: "pointer",
        transition: "var(--db-transition)",
        background: hovered ? "rgba(124,58,237,.06)" : "transparent",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 12, minHeight: 220,
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: hovered ? "rgba(124,58,237,.2)" : "var(--db-bg-elevated)",
        border: `1px solid ${hovered ? "var(--db-purple-400)" : "var(--db-border)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, transition: "var(--db-transition)",
        boxShadow: hovered ? "var(--db-glow-sm)" : "none",
      }}>+</div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: hovered ? "var(--db-purple-300)" : "var(--db-text-secondary)", marginBottom: 4 }}>
          새 프로젝트
        </div>
        <div style={{ fontSize: 12, color: "var(--db-text-muted)" }}>
          PRD를 입력하면 자동으로 시작돼요
        </div>
      </div>
    </div>
  );
}

/* ── ProjectsListPage (exported) ── */
export function ProjectsListPage({ onSelectProject, onCreateProject }) {
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState("all"); // all | running | done | draft | paused
  const [sortBy, setSortBy]   = useState("recent"); // recent | score | name

  const filtered = MOCK_PROJECTS
    .filter(p => filter === "all" || p.status === filter)
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.description.includes(search))
    .sort((a, b) => {
      if (sortBy === "score")  return b.score - a.score;
      if (sortBy === "name")   return a.name.localeCompare(b.name);
      return 0; // recent = 원래 순서
    });

  const FILTERS = [
    { id: "all",     label: "전체",    count: MOCK_PROJECTS.length },
    { id: "running", label: "진행 중", count: MOCK_PROJECTS.filter(p=>p.status==="running").length },
    { id: "done",    label: "완료",    count: MOCK_PROJECTS.filter(p=>p.status==="done").length },
    { id: "draft",   label: "초안",    count: MOCK_PROJECTS.filter(p=>p.status==="draft").length },
    { id: "paused",  label: "정지",    count: MOCK_PROJECTS.filter(p=>p.status==="paused").length },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* 페이지 헤더 */}
      <div style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-.03em", marginBottom: 6 }}>
            내 프로젝트
          </div>
          <div style={{ fontSize: 14, color: "var(--db-text-muted)" }}>
            총 {MOCK_PROJECTS.length}개 프로젝트 · 진행 중 {MOCK_PROJECTS.filter(p=>p.status==="running").length}개
          </div>
        </div>
        <button style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 20px", borderRadius: "var(--db-radius)",
          background: "var(--db-grad-purple)", color: "white",
          border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer",
          boxShadow: "var(--db-glow-md)", transition: "var(--db-transition)",
        }}
        onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
        onMouseLeave={e => e.currentTarget.style.transform = ""}
        >
          + 새 프로젝트
        </button>
      </div>

      {/* 요약 스탯 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
        {[
          { icon: "📁", label: "전체 프로젝트", value: MOCK_PROJECTS.length,                               color: "var(--db-purple-300)" },
          { icon: "⚡", label: "평균 정합성",   value: `${Math.round(MOCK_PROJECTS.reduce((a,p)=>a+p.score,0)/MOCK_PROJECTS.length)}%`, color: "var(--db-blue)"    },
          { icon: "📄", label: "총 생성 명세서", value: MOCK_PROJECTS.reduce((a,p)=>a+p.specCount,0),       color: "var(--db-green)"   },
          { icon: "⚠️", label: "전체 이슈",     value: MOCK_PROJECTS.reduce((a,p)=>a+p.issueCount,0),       color: "var(--db-orange)"  },
        ].map(s => (
          <div key={s.label} style={{
            background: "var(--db-bg-surface)", border: "1px solid var(--db-border)",
            borderRadius: "var(--db-radius)", padding: "14px 18px",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <span style={{ fontSize: 20 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "var(--db-text-muted)" }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 필터 & 검색 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 12 }}>
        {/* 상태 필터 탭 */}
        <div style={{ display: "flex", gap: 6 }}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "6px 14px", borderRadius: 100, fontSize: 12, fontWeight: 600,
              border: `1px solid ${filter===f.id ? "var(--db-purple-400)" : "var(--db-border)"}`,
              background: filter===f.id ? "rgba(139,92,246,.18)" : "var(--db-bg-surface)",
              color: filter===f.id ? "var(--db-purple-300)" : "var(--db-text-muted)",
              cursor: "pointer", transition: "var(--db-transition)",
            }}>
              {f.label}
              <span style={{
                background: filter===f.id ? "rgba(139,92,246,.3)" : "var(--db-bg-elevated)",
                borderRadius: 100, padding: "0 5px", fontSize: 10, fontWeight: 700,
                color: filter===f.id ? "var(--db-purple-200)" : "var(--db-text-muted)",
              }}>{f.count}</span>
            </button>
          ))}
        </div>

        {/* 검색 + 정렬 */}
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "var(--db-bg-surface)", border: "1px solid var(--db-border)",
            borderRadius: "var(--db-radius-sm)", padding: "7px 14px",
          }}>
            <span style={{ color: "var(--db-text-muted)" }}>🔍</span>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="프로젝트 검색..."
              style={{
                background: "none", border: "none", outline: "none",
                color: "var(--db-text-primary)", fontSize: 13, width: 160,
              }}
            />
          </div>
          <select
            value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{
              background: "var(--db-bg-surface)", border: "1px solid var(--db-border)",
              borderRadius: "var(--db-radius-sm)", padding: "7px 12px",
              color: "var(--db-text-secondary)", fontSize: 12, cursor: "pointer",
            }}
          >
            <option value="recent">최근 순</option>
            <option value="score">스코어 순</option>
            <option value="name">이름 순</option>
          </select>
        </div>
      </div>

      {/* 카드 그리드 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {filtered.map(p => (
          <ProjectCard key={p.id} project={p} onSelect={onSelectProject}/>
        ))}
        <NewProjectCard onClick={onCreateProject} />
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--db-text-muted)" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 14 }}>검색 결과가 없습니다</div>
        </div>
      )}
    </div>
  );
}
