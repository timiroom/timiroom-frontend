"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* ══════════════════════════════════════
   ERD 관계도
   부모 → 자식 방향으로 단계를 나눠 왼쪽에서 오른쪽으로 놓는다. 표마다 PK·FK 컬럼만
   보여 주고, 선은 부모의 PK 줄에서 자식의 FK 줄로 잇는다. 표를 누르면 목록에서 해당
   테이블로 이동한다.
══════════════════════════════════════ */

const W = 232;        // 표 너비
const HEAD = 40;      // 표 머리 높이
const ROW = 24;       // 컬럼 한 줄 높이
const FOOT = 26;      // "외 N개" 줄 높이
const COL_GAP = 104;  // 단계 사이 가로 간격
const ROW_GAP = 20;   // 같은 단계 표 사이 세로 간격
const PAD = 24;       // 바깥 여백
const MAX_ROWS = 8;   // 표마다 보여 줄 핵심 컬럼 수

/** 표 하나에 보여 줄 핵심 컬럼(PK → FK 순). */
function keyColumns(table, roleOf) {
  const cols = table.columns || [];
  const pk = cols.filter(c => roleOf(c) === "pk");
  const fk = cols.filter(c => roleOf(c) === "fk");
  const shown = [...pk, ...fk].slice(0, MAX_ROWS);
  return { shown, hidden: cols.length - shown.length };
}

/** 부모에서 가장 먼 거리로 단계를 정한다. 순환 관계는 이미 방문 중인 표에서 끊는다. */
function computeLevels(names, edges) {
  const parents = new Map(names.map(n => [n, []]));
  edges.forEach(e => {
    if (e.parent !== e.child && parents.has(e.child) && parents.has(e.parent)) parents.get(e.child).push(e.parent);
  });
  const level = new Map();
  const visiting = new Set();
  const visit = (n) => {
    if (level.has(n)) return level.get(n);
    if (visiting.has(n)) return 0;
    visiting.add(n);
    const lv = parents.get(n).reduce((m, p) => Math.max(m, visit(p) + 1), 0);
    visiting.delete(n);
    level.set(n, lv);
    return lv;
  };
  names.forEach(visit);
  return level;
}

function useLayout(tables, edges, roleOf) {
  return useMemo(() => {
    const names = tables.map(t => t.name);
    const byName = new Map(tables.map(t => [t.name, t]));
    const level = computeLevels(names, edges);
    const childCount = new Map(names.map(n => [n, 0]));
    edges.forEach(e => childCount.set(e.parent, (childCount.get(e.parent) || 0) + 1));

    const columns = [];
    names.forEach(n => {
      const lv = level.get(n) || 0;
      (columns[lv] ||= []).push(n);
    });

    const nodes = new Map();
    let height = 0;
    columns.forEach((col, lv) => {
      // 부모 위치의 평균으로 정렬해 선이 덜 엇갈리게 한다. 첫 단계는 자식이 많은 순.
      const order = col.map(n => {
        const ps = edges.filter(e => e.child === n && nodes.has(e.parent)).map(e => nodes.get(e.parent));
        const key = ps.length ? ps.reduce((s, p) => s + p.y + p.h / 2, 0) / ps.length : -(childCount.get(n) || 0);
        return { n, key };
      }).sort((a, b) => a.key - b.key || a.n.localeCompare(b.n));

      let y = PAD;
      order.forEach(({ n }) => {
        const t = byName.get(n);
        const { shown, hidden } = keyColumns(t, roleOf);
        const h = HEAD + shown.length * ROW + (hidden > 0 ? FOOT : 6);
        nodes.set(n, { name: n, table: t, x: PAD + lv * (W + COL_GAP), y, h, shown, hidden });
        y += h + ROW_GAP;
      });
      height = Math.max(height, y - ROW_GAP + PAD);
    });
    const width = PAD * 2 + Math.max(1, columns.length) * W + Math.max(0, columns.length - 1) * COL_GAP;
    return { nodes, width, height };
  }, [tables, edges, roleOf]);
}

/** 컬럼 줄의 세로 중앙. 못 찾으면 표 머리 중앙. */
function rowY(node, columnName) {
  const i = node.shown.findIndex(c => c.name === columnName);
  return i >= 0 ? node.y + HEAD + i * ROW + ROW / 2 : node.y + HEAD / 2;
}

export function ErdDiagram({ tables, edges, roleOf, onSelect, summary }) {
  const { nodes, width, height } = useLayout(tables, edges, roleOf);
  const [hovered, setHovered] = useState(null);
  const [scale, setScale] = useState(1);
  const [panning, setPanning] = useState(false);
  const wrapRef = useRef(null);
  const dragRef = useRef(null);   // { x, y, left, top, moved }

  /* 빈 곳을 끌어 화면을 옮긴다. 조금이라도 움직였으면 그 뒤의 클릭(표 이동)은 무시한다. */
  function onPointerDown(e) {
    if (e.button !== 0 || e.pointerType === "touch") return;   // 터치는 브라우저 기본 스크롤을 쓴다
    const el = wrapRef.current;
    dragRef.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop, moved: false };
  }
  function onPointerMove(e) {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
    if (!d.moved) { d.moved = true; setPanning(true); wrapRef.current.setPointerCapture?.(e.pointerId); }
    wrapRef.current.scrollLeft = d.left - dx;
    wrapRef.current.scrollTop = d.top - dy;
  }
  function onPointerUp() {
    const d = dragRef.current;
    dragRef.current = null;
    if (d?.moved) {
      setPanning(false);
      // 끌기를 마친 자리의 클릭이 표 이동으로 이어지지 않게 한 번 막는다
      const stop = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
      window.addEventListener("click", stop, { capture: true, once: true });
      setTimeout(() => window.removeEventListener("click", stop, { capture: true }), 0);
    }
  }

  /* Ctrl(⌘)+휠은 확대·축소, 그냥 휠은 평소처럼 스크롤 */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setScale(v => Math.min(1.4, Math.max(0.5, Math.round((v - Math.sign(e.deltaY) * 0.1) * 10) / 10)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // 처음 열 때 화면 너비에 맞추되, 글씨가 읽히도록 80% 아래로는 줄이지 않는다(넘치면 가로로 스크롤).
  useEffect(() => {
    const w = wrapRef.current?.clientWidth || 0;
    if (w && width > w) setScale(Math.max(0.8, Math.floor((w / width) * 20) / 20));
  }, [width]);

  const related = useMemo(() => {
    if (!hovered) return null;
    const s = new Set([hovered]);
    edges.forEach(e => {
      if (e.parent === hovered) s.add(e.child);
      if (e.child === hovered) s.add(e.parent);
    });
    return s;
  }, [hovered, edges]);

  const zoom = (d) => setScale(v => Math.min(1.4, Math.max(0.5, Math.round((v + d) * 10) / 10)));
  // 맞춤은 가로·세로 모두 한 화면에 들어오게 한다
  const fit = () => {
    const w = wrapRef.current?.clientWidth || width;
    const h = wrapRef.current?.clientHeight || height;
    setScale(Math.min(1, Math.max(0.5, Math.floor(Math.min(w / width, h / height) * 20) / 20)));
  };

  return (
    <div className="erd-diagram">
      <div className="erd-diagram__bar">
        <span className="erd-diagram__hint">
          {summary && <strong className="erd-diagram__summary">{summary}</strong>}
          표를 누르면 상세 컬럼으로, 빈 곳을 끌면 화면이 움직입니다
        </span>
        <div className="erd-diagram__zoom" role="group" aria-label="확대·축소">
          <button type="button" onClick={() => zoom(-0.1)} aria-label="축소">−</button>
          <button type="button" onClick={() => setScale(1)} className="erd-diagram__pct">{Math.round(scale * 100)}%</button>
          <button type="button" onClick={() => zoom(0.1)} aria-label="확대">+</button>
          <button type="button" onClick={fit}>맞춤</button>
        </div>
      </div>
      <div
        className={`erd-diagram__canvas${panning ? " is-panning" : ""}`}
        ref={wrapRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div style={{ width: width * scale, height: height * scale }}>
          <div style={{ width, height, position: "relative", transform: `scale(${scale})`, transformOrigin: "0 0" }}>
            <svg width={width} height={height} style={{ position: "absolute", inset: 0, overflow: "visible" }} aria-hidden="true">
              {edges.map((e, i) => {
                const p = nodes.get(e.parent);
                const c = nodes.get(e.child);
                if (!p || !c || p === c) return null;
                const pkName = p.shown.find(col => roleOf(col) === "pk")?.name;
                const x1 = p.x + W, y1 = rowY(p, pkName);
                const x2 = c.x,     y2 = rowY(c, e.columns[0]);
                const mid = x2 <= x1 ? 60 : Math.max(36, (x2 - x1) / 2);
                const d = `M${x1},${y1} C${x1 + mid},${y1} ${x2 - mid},${y2} ${x2},${y2}`;
                const on = related && related.has(e.parent) && related.has(e.child) && (e.parent === hovered || e.child === hovered);
                const dim = related && !on;
                const many = !e.card || /N|M/.test(e.card.split(":")[1] || "N");
                return (
                  <g key={i} className={`erd-edge${on ? " is-on" : ""}${dim ? " is-dim" : ""}`}>
                    <path d={d} fill="none" />
                    {/* 부모 쪽 '하나' 표시 */}
                    <line x1={x1 + 6} y1={y1 - 5} x2={x1 + 6} y2={y1 + 5} />
                    {/* 자식 쪽 '여럿'은 까마귀발, '하나'는 세로선 */}
                    {many ? (
                      <>
                        <line x1={x2 - 9} y1={y2} x2={x2} y2={y2 - 5} />
                        <line x1={x2 - 9} y1={y2} x2={x2} y2={y2 + 5} />
                      </>
                    ) : (
                      <line x1={x2 - 6} y1={y2 - 5} x2={x2 - 6} y2={y2 + 5} />
                    )}
                  </g>
                );
              })}
            </svg>
            {[...nodes.values()].map(n => {
              const dim = related && !related.has(n.name);
              return (
                <button
                  key={n.name}
                  type="button"
                  className={`erd-node${n.name === hovered ? " is-on" : ""}${dim ? " is-dim" : ""}`}
                  style={{ left: n.x, top: n.y, width: W, height: n.h }}
                  onMouseEnter={() => setHovered(n.name)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(n.name)}
                  onBlur={() => setHovered(null)}
                  onClick={() => onSelect?.(n.name)}
                  title={n.table.description || n.name}
                >
                  <span className="erd-node__head">
                    <span className="erd-node__name">{n.name}</span>
                    <span className="erd-node__count">{n.table.columns?.length ?? 0}</span>
                  </span>
                  {n.shown.map(col => {
                    const role = roleOf(col);
                    return (
                      <span key={col.name} className={`erd-node__row is-${role}`}>
                        <span className="erd-node__role">{role === "pk" ? "PK" : "FK"}</span>
                        <span className="erd-node__col">{col.name}</span>
                        <span className="erd-node__type">{String(col.type || "").replace(/\(.*\)/, "")}</span>
                      </span>
                    );
                  })}
                  {n.hidden > 0 && <span className="erd-node__more">외 {n.hidden}개 컬럼</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
