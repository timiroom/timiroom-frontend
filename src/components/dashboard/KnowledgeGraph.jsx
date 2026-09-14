"use client";

/**
 * 지식 그래프
 *
 * 기능 · API · DB 테이블이 어떻게 이어져 있는지 보여주고,
 * 하나를 고르면 그것과 엮인 것만 남겨 변경의 영향 범위를 드러낸다.
 *
 * 화면 틀은 기획(민정)을 따른다.
 *   - 배치: 4월 시안(KnowledgeGraph 초안) — 위쪽 필터 칩과 도구 버튼, 격자 바탕 카드,
 *     오른쪽 패널(노드 상세 · 그래프 현황 · 빠른 작업)
 *   - 표시 설정: 수행계획서 "예상 결과물" 그림 — 검색, 연결 없는 노드 토글, 표시 조절
 *   - 영향 범위: 수행계획서 "변경 시 영향 범위를 우선순위를 지정해 단계별로 하이라이트"
 * 안에 담기는 데이터와 계산은 서버가 명세에서 복원한 관계를 그대로 쓴다.
 *
 * 힘기반 배치는 노드가 늘면 가운데로 엉겨붙어 선이 서로를 가린다.
 * 그 덩어리를 피하려고 네 가지를 건다.
 *   1. 도메인 묶음  같은 리소스를 다루는 노드를 한 영역에 모으고 묶음끼리 밀어낸다.
 *   2. 크기로 위계  연결이 많은 노드를 크게 그려 중심이 먼저 보이게 한다.
 *   3. 선택 시 집중  고른 노드에서 두 걸음 안의 것만 남기고 나머지는 물러나게 한다.
 *   4. 라벨은 원 밖  글자 길이가 원 크기를 끌고 다니지 않게 아래에 둔다.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { fetchProjectGraph, toCytoscapeElements } from "@/lib/graphApi";

/**
 * 바탕 — 랜딩·대시보드와 같은 아이보리.
 * 값은 지어내지 않고 디자인 시스템 토큰(styles/theme.css)을 그대로 옮겼다.
 */
const C = {
  bg:      "#f7f6f3",   // --bg
  panel:   "#ffffff",   // --surface
  border:  "#e4e2db",   // --border
  text:    "#1a1916",   // --text-1
  muted:   "#6b6960",   // --text-2
  faint:   "#a8a69f",   // --text-3
  soft:    "#f2f0ea",
};

/**
 * 계층별 색.
 * 디자인 시스템의 상태 색(--db-green/blue/pink)을 그대로 쓴다. 따뜻한 색(--db-orange)은
 * 화면 통틀어 "변경·영향" 하나에만 준다. 그러면 주황이 뜨는 순간 그게 곧 신호가 된다.
 * light는 원 가운데, deep은 테두리 쪽 — 방사형으로 겹쳐 구슬처럼 입체를 준다.
 */
const TYPE_STYLE = {
  feature: { color: "#10b981", light: "#6ee7b7", deep: "#047857", label: "기능" },
  api:     { color: "#3b82f6", light: "#93c5fd", deep: "#1d4ed8", label: "API" },
  table:   { color: "#ec4899", light: "#f9a8d4", deep: "#be185d", label: "테이블" },
  // 코드(PR)는 기획 세 계층과 결이 달라 형태로도 구분한다 — 아래에서 사각형으로 그린다.
  pr:      { color: "#6b6960", light: "#a8a69f", deep: "#3c3a33", label: "PR" },
};

/* 시안의 필터 칩 — 이 그래프에 실제로 있는 계층으로 채운다 */
const FILTERS = [
  { id: "all",     label: "전체" },
  { id: "feature", label: "기능" },
  { id: "api",     label: "API" },
  { id: "table",   label: "테이블" },
  { id: "pr",      label: "PR" },
];

/**
 * 연결 안 됨 — 붉은색으로 경고하지 않는다.
 * 이건 "잘못됐다"가 아니라 "이어질 것이 없다"는 부재다.
 * 밝은 바닥에서 색을 빼면 그냥 사라지므로, 속을 비우고 테두리만 남긴다.
 */
const ORPHAN_STYLE = { color: "#d0cec6", light: "#e4e2db", deep: "#b3b0a5" };

/**
 * 변경 표시 — 전부 같은 호박색 계열이고 진하기로만 갈린다.
 * 계층 색과 뒤엉키지 않게 "따뜻한 테두리 = 손댈 곳" 하나로 묶는다.
 */
const CHANGE_STYLE = {
  ADDED:    { color: "#f59e0b", label: "추가됨" },   // --db-orange
  MODIFIED: { color: "#ea580c", label: "수정됨" },
  REMOVED:  { color: "#9a3412", label: "삭제됨" },
};

/* 확인 필요 — 수정됨과 같은 색을 쓰되 점선으로 형태를 달리한다 */
const IMPACT_COLOR = "#ea580c";

/**
 * 영향 단계.
 *
 * 수행계획서는 영향 범위를 "우선순위를 지정해 단계별로" 보여 달라고 한다.
 * 바로 맞닿은 1단계는 먼저 볼 것이라 진하게, 한 다리 건넌 2단계는 옅게 둔다.
 * 두 걸음에서 멈추는 이유 — 계층이 셋이라 어느 계층에서 출발하든 두 걸음이면
 * 위아래 끝에 닿고, 그 너머는 외래키를 타고 다른 도메인으로 번져 화면 대부분이
 * 영향 범위로 칠해진다. 전부 표시하면 아무것도 고를 수 없다.
 */
const STEP_STYLE = {
  1: { color: IMPACT_COLOR, label: "1단계 · 바로 닿음" },
  2: { color: "#f5b971",    label: "2단계 · 한 다리 건넘" },
};
const MAX_STEP = 2;

/**
 * 그래프가 놓이는 바닥.
 * 시안처럼 밝은 카드 위에 옅은 격자를 깐다. 대시보드의 다른 카드와 같은 결이라
 * 이 화면만 다른 제품처럼 튀지 않는다.
 */
const CANVAS = {
  label:      "#6b6960",
  labelPlate: "#f7f6f3",
  edge:       "#6b6960",
  edgeOpacity: 0.42,
  groupLabel: "#1a1916",
  groupOpacity: 0.3,
  focusRing:  "#1a1916",
  dim:        0.14,
  orphanFill:      0,
  orphanRing:      "#8f8c82",
  orphanRingWidth: 2,
  orphanRingStyle: "dashed",
};

const DEFAULT_DISPLAY = { arrows: false, labels: true, nodeScale: 1, edgeScale: 1 };

export function KnowledgeGraph({ project }) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);

  const [graph, setGraph]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [ready, setReady]     = useState(0);          // 그래프가 새로 그려질 때마다 올라간다

  const [selected, setSelected]     = useState(null);
  const [filter, setFilter]         = useState("all");
  const [query, setQuery]           = useState("");
  const [showOrphanOnly, setShowOrphanOnly] = useState(false);
  const [showImpactOnly, setShowImpactOnly] = useState(false);
  const [display, setDisplay]       = useState(DEFAULT_DISPLAY);
  const [counts, setCounts]         = useState({ nodes: 0, edges: 0 });
  const [notice, setNotice]         = useState("");

  const projectId = project?.id;

  /* ── 데이터 ── */
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    setLoading(true);
    setError("");
    fetchProjectGraph(projectId)
      .then((data) => { if (!cancelled) setGraph(data); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [projectId, reloadKey]);

  /* ── 그래프 렌더 ── */
  useEffect(() => {
    if (!graph || !containerRef.current) return;
    if (!graph.nodes?.length) return;

    let cy;
    let disposed = false;

    (async () => {
      // 브라우저에서만 불러온다 — 두 패키지 모두 CommonJS라 동적 import로는 상호운용이 깨진다.
      const cytoscape = require("cytoscape");
      const fcose = require("cytoscape-fcose");
      if (disposed) return;

      if (!cytoscape.prototype.__fcoseRegistered) {
        cytoscape.use(fcose);
        cytoscape.prototype.__fcoseRegistered = true;
      }

      const elements = toCytoscapeElements(graph);

      cy = cytoscape({
        container: containerRef.current,
        elements,
        wheelSensitivity: 1,
        minZoom: 0.15,
        maxZoom: 3,
        // 확대·이동 중에는 화면을 한 장 떠서 그것만 움직인다 — 끌 때마다 전부 다시 그리면 끊긴다.
        textureOnViewport: true,
        motionBlur: false,
        style: baseStyle(DEFAULT_DISPLAY),
        layout: fcoseLayout(elements.length),
      });

      cy.on("tap", "node", (evt) => {
        const node = evt.target;
        if (node.data("type") === "group") return;   // 묶음은 선택 대상이 아니다
        setSelected(buildSelection(cy, node));
      });

      cy.on("tap", (evt) => {
        if (evt.target === cy) setSelected(null);
      });

      cyRef.current = cy;
      setReady((v) => v + 1);
    })();

    return () => {
      disposed = true;
      if (cy) cy.destroy();
      cyRef.current = null;
    };
  }, [graph]);

  /* ── 표시 설정 (화살표 · 라벨 · 크기 · 두께) ── */
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.style(baseStyle(display)).update();
  }, [display, ready]);

  /* ── 보기 상태를 한 번에 반영 ──
     필터 · 검색 · 걸러 보기 · 선택이 서로 끼어들므로, 매번 처음부터 다시 칠한다.
     조각조각 클래스를 붙였다 떼면 어느 조합에서 흐림이 남는지 추적할 수 없다. */
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    setCounts(applyView(cy, { filter, query, showOrphanOnly, showImpactOnly, selectedId: selected?.id }));
  }, [filter, query, showOrphanOnly, showImpactOnly, selected, ready]);

  /* ── 영향 경로 흐름 — 시안의 "선을 따라 흐르는 점선" ──
     선택했을 때만 돌린다. 평소에도 돌리면 정적인 구조가 계속 움직여 산만하다. */
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !selected) return;
    let tick = 0;
    const id = setInterval(() => {
      tick += 1;
      cy.edges(".flow").style("line-dash-offset", -tick * 1.5);
    }, 50);
    return () => {
      clearInterval(id);
      cy.edges().removeStyle("line-dash-offset");
    };
  }, [selected, ready]);

  const summary = graph?.summary;
  const orphanTotal = summary
    ? summary.orphanFeatures + summary.orphanApis + summary.orphanTables
    : 0;
  const totals = useMemo(() => {
    const nodes = (graph?.nodes || []).filter((n) => n.type !== "group").length;
    return { nodes, edges: (graph?.edges || []).length };
  }, [graph]);

  const flash = useCallback((message) => {
    setNotice(message);
    setTimeout(() => setNotice(""), 2200);
  }, []);

  const reset = useCallback(() => {
    const cy = cyRef.current;
    setSelected(null);
    setFilter("all");
    setQuery("");
    setShowOrphanOnly(false);
    setShowImpactOnly(false);
    if (cy) cy.fit(undefined, 30);
  }, []);

  const rerunLayout = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.layout(fcoseLayout(cy.elements().length)).run();
  }, []);

  const exportPng = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const uri = cy.png({ full: true, scale: 2, bg: C.bg });
    const a = document.createElement("a");
    a.href = uri;
    a.download = `${project?.name || "knowledge-graph"}-지식그래프.png`;
    a.click();
  }, [project?.name]);

  // 시안의 "영향도 시뮬레이션": 고른 노드에서 번짐을 1단계 → 2단계 순서로 다시 보여준다
  const simulateImpact = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    if (!selected) {
      flash("노드를 먼저 선택하세요");
      return;
    }
    const node = cy.getElementById(selected.id);
    const steps = stepsFrom(cy, node);
    cy.elements().addClass("dim");
    cy.nodes('[type="group"]').removeClass("dim");
    node.removeClass("dim");
    [1, 2].forEach((step, i) => {
      setTimeout(() => {
        if (cyRef.current !== cy) return;
        const reached = steps[step] || cy.collection();
        reached.removeClass("dim");
        reached.edgesWith(node.union(steps[step - 1] || cy.collection())).removeClass("dim");
      }, 350 * (i + 1));
    });
    setTimeout(() => {
      if (cyRef.current === cy) setCounts(applyView(cy, { filter, query, showOrphanOnly, showImpactOnly, selectedId: selected.id }));
    }, 350 * 3 + 200);
  }, [selected, filter, query, showOrphanOnly, showImpactOnly, flash]);

  /* ── 화면 ── */
  if (!projectId) {
    return <Empty message="프로젝트를 선택하면 지식 그래프를 볼 수 있습니다" />;
  }

  return (
    <div style={{ flex: 1, display: "flex", gap: 20, height: "100vh", minHeight: 520, padding: 20, background: C.bg, boxSizing: "border-box" }}>
      {/* ── 왼쪽: 도구줄 + 그래프 ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {FILTERS
            .filter((f) => f.id !== "pr" || summary?.prCount > 0)
            .map((f) => (
              <Chip key={f.id} active={filter === f.id} onClick={() => setFilter(f.id)}>
                {f.id !== "all" && <Dot type={f.id} />}
                {f.label}
                {f.id !== "all" && summary && (
                  <span style={{ color: C.faint, fontWeight: 500 }}>{countOf(summary, f.id)}</span>
                )}
              </Chip>
            ))}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <ToolButton onClick={rerunLayout} title="배치를 다시 계산합니다">레이아웃 ⟳</ToolButton>
            <ToolButton onClick={exportPng} title="그래프 전체를 PNG로 저장합니다">내보내기 ↗</ToolButton>
            <ToolButton onClick={reset}>초기화</ToolButton>
          </div>
        </div>

        <div className="db-card" data-testid="kg-canvas" style={{
          flex: 1, position: "relative", overflow: "hidden", padding: 0, minHeight: 0,
          // 시안의 옅은 격자 — 빈 바탕이 평평한 종이처럼 죽지 않게 한다
          backgroundColor: C.panel,
          backgroundImage:
            "linear-gradient(rgba(26,25,22,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(26,25,22,.05) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}>
          <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

          {loading && <Overlay>그래프를 계산하는 중…</Overlay>}
          {error && <Overlay tone="error">{error}</Overlay>}
          {!loading && !error && graph && !graph.nodes?.length && (
            <Overlay>
              아직 명세가 없습니다.<br />
              <span style={{ fontSize: 12, color: C.muted }}>
                파이프라인을 실행하면 기능·API·테이블의 관계가 여기에 그려집니다.
              </span>
            </Overlay>
          )}
          {notice && (
            <div style={{
              position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)",
              padding: "7px 14px", borderRadius: 999, fontSize: 12, background: C.text, color: "#fff",
            }}>{notice}</div>
          )}

          {graph?.nodes?.length > 0 && <Legend summary={summary} stepsShown={!!selected} />}
        </div>
      </div>

      {/* ── 오른쪽 패널: 시안 순서 그대로 (상세 → 현황 → 빠른 작업), 표시 설정을 덧붙인다 ── */}
      <div data-testid="kg-side" style={{ width: 272, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
        {selected ? (
          <DetailPanel selection={selected} onClose={() => setSelected(null)} />
        ) : (
          <div className="db-card" style={{ padding: 20, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🕸️</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: C.text }}>노드를 선택하세요</div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
              그래프에서 노드를 클릭하면 연결 관계와 영향 단계를 확인할 수 있습니다.
            </div>
          </div>
        )}

        <Card title="그래프 현황">
          <StatRow label="노드" value={counts.nodes} total={totals.nodes} />
          <StatRow label="엣지" value={counts.edges} total={totals.edges} />
          {summary && (
            <>
              <StatRow label="도메인" value={(graph?.nodes || []).filter((n) => n.type === "group").length} />
              <StatToggle
                label="연결 안 됨" value={orphanTotal} active={showOrphanOnly} disabled={orphanTotal === 0}
                onClick={() => { setShowOrphanOnly((v) => !v); setShowImpactOnly(false); }}
                hint="다른 계층과 이어지지 않은 항목만 보기"
              />
              <StatToggle
                label="변경 · 영향" value={`${summary.changedCount} · ${summary.impactedCount}`}
                active={showImpactOnly} disabled={summary.changedCount === 0} color={IMPACT_COLOR}
                onClick={() => { setShowImpactOnly((v) => !v); setShowOrphanOnly(false); }}
                hint="직전 버전 대비 바뀐 항목과 확인이 필요한 항목만 보기"
              />
            </>
          )}
        </Card>

        <Card title="빠른 작업">
          <ActionButton icon="🔄" label="그래프 재분석" onClick={() => setReloadKey((k) => k + 1)} />
          <ActionButton icon="📤" label="PNG 내보내기" onClick={exportPng} />
          <ActionButton icon="🔍" label="영향도 시뮬레이션" onClick={simulateImpact} />
        </Card>

        <Card title="표시">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="노드 검색…"
            aria-label="노드 검색"
            style={{
              width: "100%", boxSizing: "border-box", padding: "7px 10px", borderRadius: 8, fontSize: 12,
              border: `1px solid ${C.border}`, background: C.bg, color: C.text, marginBottom: 10,
            }}
          />
          <Switch label="연결 안 됨만" checked={showOrphanOnly}
                  onChange={(v) => { setShowOrphanOnly(v); if (v) setShowImpactOnly(false); }} />
          <Switch label="화살표" checked={display.arrows} onChange={(v) => setDisplay((d) => ({ ...d, arrows: v }))} />
          <Switch label="라벨" checked={display.labels} onChange={(v) => setDisplay((d) => ({ ...d, labels: v }))} />
          <Slider label="노드 크기" value={display.nodeScale} min={0.6} max={1.6} step={0.1}
                  onChange={(v) => setDisplay((d) => ({ ...d, nodeScale: v }))} />
          <Slider label="선 두께" value={display.edgeScale} min={0.5} max={3} step={0.25}
                  onChange={(v) => setDisplay((d) => ({ ...d, edgeScale: v }))} />
        </Card>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   스타일
══════════════════════════════════════ */

function baseStyle({ arrows, labels, nodeScale, edgeScale }) {
  const n = (v) => v * nodeScale;
  const w = (v) => v * edgeScale;
  return [
    {
      selector: "node",
      style: {
        label: "data(label)",
        "text-opacity": labels ? 1 : 0,
        "font-family": "'Pretendard','Noto Sans KR',sans-serif",
        "font-size": 10,
        "font-weight": 500,
        // 라벨을 원 아래에 둔다 — 원 안에 넣으면 글자 길이에 원 크기가 끌려간다
        "text-valign": "bottom",
        "text-halign": "center",
        "text-margin-y": 7,
        "text-wrap": "wrap",
        "text-max-width": 140,
        color: CANVAS.label,
        "text-background-color": CANVAS.labelPlate,
        "text-background-opacity": labels ? 0.78 : 0,
        "text-background-padding": 3,
        "text-background-shape": "roundrectangle",
        shape: "ellipse",
        // 연결이 많을수록 크게 — 무엇이 중심인지 크기로 먼저 읽힌다
        width: `mapData(degree, 0, 8, ${n(20)}, ${n(52)})`,
        height: `mapData(degree, 0, 8, ${n(20)}, ${n(52)})`,
        "border-width": 0,
        "background-fill": "radial-gradient",
        "background-gradient-stop-positions": "0% 62% 100%",
        "transition-property": "opacity, border-width",
        "transition-duration": "160ms",
      },
    },
    ...Object.entries(TYPE_STYLE).map(([type, s]) => ({
      selector: `node[type="${type}"]`,
      style: {
        "background-color": s.color,
        "background-gradient-stop-colors": `${s.light} ${s.color} ${s.deep}`,
      },
    })),
    {
      // 도메인 묶음 — 상자를 그리지 않는다. 배치 계산에만 작용해 같은 도메인끼리 모인다.
      selector: 'node[type="group"]',
      style: {
        // 노드가 쓰는 방사형 채움을 물려받으면 색 정지점 없이 그라디언트를 계산하다 렌더러가 멈춘다
        "background-fill": "solid",
        "background-opacity": 0,
        "border-width": 0,
        shape: "round-rectangle",
        label: "data(label)",
        "text-valign": "top",
        "text-halign": "center",
        "text-margin-y": 2,
        "font-size": 9.5,
        "font-weight": 600,
        "letter-spacing": 2.5,
        "text-transform": "uppercase",
        color: CANVAS.groupLabel,
        "text-opacity": labels ? CANVAS.groupOpacity : 0,
        "text-background-opacity": 0,
        padding: 14,
        width: "label",
        height: "label",
        events: "no",
      },
    },
    {
      // 코드(PR) — 색만 달리하면 "네 번째 계층"처럼 읽히므로 형태를 바꾼다
      selector: 'node[type="pr"]',
      style: {
        shape: "round-rectangle",
        width: `mapData(degree, 0, 8, ${n(26)}, ${n(58)})`,
        height: `mapData(degree, 0, 8, ${n(16)}, ${n(26)})`,
        "font-size": 9.5,
        "text-max-width": 170,
      },
    },
    {
      // 어디에도 이어지지 않은 노드 — 설계 구멍
      selector: 'node[orphan="yes"]',
      style: {
        "background-color": ORPHAN_STYLE.color,
        "background-gradient-stop-colors": `${ORPHAN_STYLE.light} ${ORPHAN_STYLE.color} ${ORPHAN_STYLE.deep}`,
        "background-opacity": CANVAS.orphanFill,
        "border-width": CANVAS.orphanRingWidth,
        "border-color": CANVAS.orphanRing,
        "border-opacity": 1,
        "border-style": CANVAS.orphanRingStyle,
      },
    },
    ...Object.entries(CHANGE_STYLE).map(([kind, s]) => ({
      selector: `node[change="${kind}"]`,
      style: { "border-width": 3.5, "border-color": s.color, "border-opacity": 1 },
    })),
    {
      selector: 'node[change="REMOVED"]',
      style: { "background-opacity": 0.15, "border-style": "dashed" },
    },
    {
      // 스스로 바뀐 건 아니지만 바뀐 것과 이어져 확인이 필요한 노드
      selector: 'node[impacted="yes"]',
      style: { "border-width": 2.5, "border-color": IMPACT_COLOR, "border-opacity": 0.9, "border-style": "dashed" },
    },
    {
      selector: "edge",
      style: {
        width: w(1.1),
        "line-color": CANVAS.edge,
        "line-opacity": CANVAS.edgeOpacity,
        "curve-style": "bezier",
        "control-point-step-size": 30,
        "target-arrow-shape": arrows ? "triangle" : "none",
        "target-arrow-color": CANVAS.edge,
        "arrow-scale": 0.8,
        "transition-property": "opacity, line-color, line-opacity, width",
        "transition-duration": "160ms",
      },
    },
    { selector: 'edge[type="REFERENCES"]', style: { "line-style": "dashed" } },
    {
      // 코드가 명세에 닿는 선 — "지금 누군가 건드리는 중"이라는 임시성을 점선으로
      selector: 'edge[type="CHANGES"]',
      style: { "line-style": "dotted", "line-opacity": 0.45, width: w(1.4) },
    },
    {
      // 변경이 타고 번져 나간 경로
      selector: 'edge[onImpactPath="yes"]',
      style: { width: w(2.4), "line-color": IMPACT_COLOR, "line-opacity": 0.85, "target-arrow-color": IMPACT_COLOR },
    },
    /* ── 보기 상태 ── 뒤에 둘수록 우선한다 */
    { selector: ".dim", style: { opacity: CANVAS.dim } },
    {
      // 검색에 걸린 노드 — 계층 색은 그대로 두고 먹색 고리만 두른다
      selector: "node.match",
      style: { "border-width": 3, "border-color": CANVAS.focusRing, "border-opacity": 1, "border-style": "solid" },
    },
    {
      selector: "node.step1",
      style: { "border-width": 3.5, "border-color": STEP_STYLE[1].color, "border-opacity": 1, "border-style": "solid" },
    },
    {
      selector: "node.step2",
      style: { "border-width": 2.5, "border-color": STEP_STYLE[2].color, "border-opacity": 1, "border-style": "dashed" },
    },
    {
      selector: "node.focus",
      style: { "border-width": 4, "border-color": CANVAS.focusRing, "border-opacity": 1, "border-style": "solid" },
    },
    {
      // 번짐이 지나간 선 — 점선을 흘려 방향 없이 "여기로 번졌다"를 보여준다
      selector: "edge.flow",
      style: {
        width: w(2.2), "line-color": IMPACT_COLOR, "line-opacity": 0.9,
        "line-style": "dashed", "line-dash-pattern": [8, 12],
      },
    },
    {
      selector: "edge.flow2",
      style: {
        width: w(1.6), "line-color": STEP_STYLE[2].color, "line-opacity": 0.9,
        "line-style": "dashed", "line-dash-pattern": [6, 10],
      },
    },
  ];
}

/* ══════════════════════════════════════
   배치
══════════════════════════════════════ */

/**
 * 유기적으로 퍼지되 뭉치지 않게 하는 설정.
 * 묶음을 선으로 그리지 않으므로, 어디까지가 한 도메인인지는 오직 이 배치가 만드는
 * 거리감으로만 전달된다. 묶음 안은 더 당기고 묶음끼리는 더 밀어내야 경계가 읽힌다.
 */
function fcoseLayout(elementCount) {
  const crowded = elementCount > 40;
  return {
    name: "fcose",
    quality: "proof",
    // 같은 명세면 언제 열어도 같은 그림이어야 "저번에 봤던 그 노드"를 눈으로 찾는다
    randomize: false,
    animate: true,
    animationDuration: 700,
    fit: true,
    padding: 60,
    nodeDimensionsIncludeLabels: true,
    nodeRepulsion: (node) => {
      const base = crowded ? 4200 : 2600;
      return base * (1 + Math.min(node.data("degree") || 0, 8) * 0.12);
    },
    // 이어진 것은 가까이 둔다. 떼어놓는 일은 밀어내는 힘이 하고, 선은 짧을수록 읽힌다.
    idealEdgeLength: (edge) => {
      const near = crowded ? 80 : 56;
      return edge.data("type") === "CHANGES" ? near * 0.8 : near;
    },
    edgeElasticity: 0.55,
    nestingFactor: 0.08,
    gravity: 1.4,
    gravityRange: 5.0,
    gravityCompound: 1.6,
    numIter: 3500,
    packComponents: true,
    tile: true,
    tilingPaddingVertical: 14,
    tilingPaddingHorizontal: 14,
  };
}

/* ══════════════════════════════════════
   보기 계산
══════════════════════════════════════ */

/**
 * 고른 노드에서 몇 걸음에 닿는지 센다 (방향 없이, 최대 두 걸음).
 *
 * 선에 방향이 있어도 영향은 방향을 가리지 않는다 — 테이블이 바뀌면 그 테이블을 쓰는
 * API 쪽으로, 즉 선이 그려진 반대 방향으로도 번진다. 서버의 영향 전파와 같은 규칙이다.
 * 도메인 묶음은 부모-자식 관계일 뿐 선이 아니므로 걸음에 치지 않는다.
 */
function stepsFrom(cy, node) {
  const steps = { 0: node };
  let visited = node;
  let frontier = node;
  for (let step = 1; step <= MAX_STEP; step++) {
    const next = frontier.neighborhood().nodes('[type != "group"]').difference(visited);
    if (next.empty()) break;
    steps[step] = next;
    visited = visited.union(next);
    frontier = next;
  }
  return steps;
}

/** 필터 · 검색 · 걸러 보기 · 선택을 한 번에 칠하고, 보이는 노드·선 수를 돌려준다 */
function applyView(cy, { filter, query, showOrphanOnly, showImpactOnly, selectedId }) {
  cy.elements().removeClass("dim focus step1 step2 match flow flow2");
  const groups = cy.nodes('[type="group"]');
  let visible = cy.nodes('[type != "group"]');

  if (filter !== "all") visible = visible.filter((n) => n.data("type") === filter);
  if (showOrphanOnly) visible = visible.filter((n) => n.data("orphan") === "yes");
  if (showImpactOnly) visible = visible.filter((n) => n.data("change") !== "none" || n.data("impacted") === "yes");

  const q = (query || "").trim().toLowerCase();
  if (q) {
    const hits = visible.filter((n) => (n.data("fullLabel") || n.data("label") || "").toLowerCase().includes(q));
    hits.addClass("match");
    visible = hits;
  }

  // 선택은 명시적인 의도라 필터보다 앞선다 — 고른 노드의 두 걸음 안을 전부 보여준다
  const node = selectedId ? cy.getElementById(selectedId) : null;
  if (node && node.nonempty()) {
    const steps = stepsFrom(cy, node);
    const s1 = steps[1] || cy.collection();
    const s2 = steps[2] || cy.collection();
    visible = node.union(s1).union(s2);
    node.addClass("focus");
    s1.addClass("step1");
    s2.addClass("step2");
    node.edgesWith(s1).addClass("flow");
    s1.edgesWith(s2).addClass("flow2");
  }

  const visibleEdges = visible.edgesWith(visible);
  cy.elements().not(visible).not(visibleEdges).not(groups).addClass("dim");
  // 필터로 걸러 볼 때 선은 양 끝이 모두 보일 때만 남긴다
  return { nodes: visible.length, edges: visibleEdges.length };
}

/**
 * 목록에는 방향(사용하는 쪽 / 영향을 주는 쪽)과 단계를 함께 싣는다.
 * 방향은 "누구를 고쳐야 하나", 단계는 "무엇부터 보나"에 답한다.
 */
function buildSelection(cy, node) {
  const upstream   = node.incomers().nodes('[type != "group"][type != "pr"]');
  // 외래키는 양쪽으로 그어지는 경우가 있어(users ↔ orders) 같은 테이블이 두 목록에 겹친다.
  // 한 번만 보이게 "사용하는 쪽"에 두고 여기서는 뺀다 — 겹치면 확인할 개수가 부풀어 보인다.
  const downstream = node.outgoers().nodes('[type != "group"]').difference(upstream);
  const touchedBy  = node.incomers().nodes('[type="pr"]');
  const steps = stepsFrom(cy, node);

  const toItem = (n) => ({
    id: n.id(),
    label: n.data("fullLabel") || n.data("label"),
    type: n.data("type"),
    orphan: n.data("orphan") === "yes",
  });

  return {
    id: node.id(),
    label: node.data("fullLabel") || node.data("label"),
    type: node.data("type"),
    orphan: node.data("orphan") === "yes",
    change: node.data("change") !== "none" ? node.data("change") : null,
    impacted: node.data("impacted") === "yes",
    meta: node.data("meta") || {},
    downstream: downstream.map(toItem),
    upstream: upstream.map(toItem),
    touchedBy: touchedBy.map(toItem),
    step1: (steps[1] || cy.collection()).map(toItem),
    step2: (steps[2] || cy.collection()).map(toItem),
  };
}

function countOf(summary, type) {
  return { feature: summary.featureCount, api: summary.apiCount, table: summary.tableCount, pr: summary.prCount }[type] ?? "";
}

/* ══════════════════════════════════════
   보조 컴포넌트
══════════════════════════════════════ */

function Chip({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "6px 14px", borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: "pointer",
      border: `1px solid ${active ? "var(--db-purple-400)" : "var(--border)"}`,
      background: active ? "rgba(26,25,22,.08)" : "var(--surface)",
      color: active ? "var(--text-1)" : "var(--text-3)",
      transition: "var(--db-transition)",
    }}>{children}</button>
  );
}

function ToolButton({ onClick, title, children }) {
  return (
    <button onClick={onClick} title={title} style={{
      padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)",
      background: "var(--surface)", color: "var(--text-3)", fontSize: 12, cursor: "pointer",
    }}>{children}</button>
  );
}

function Dot({ type }) {
  const s = TYPE_STYLE[type];
  if (!s) return null;
  return (
    <i style={{
      width: type === "pr" ? 11 : 8, height: 8, borderRadius: type === "pr" ? 2 : "50%",
      background: `radial-gradient(circle at 35% 30%, ${s.light}, ${s.deep})`, display: "inline-block",
    }} />
  );
}

function Card({ title, children }) {
  return (
    <div className="db-card" style={{ padding: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: C.text }}>{title}</div>
      {children}
    </div>
  );
}

function StatRow({ label, value, total }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 12, color: C.muted }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: C.text, fontVariantNumeric: "tabular-nums" }}>
        {value}{total != null && <span style={{ fontSize: 11, color: C.faint }}>/{total}</span>}
      </span>
    </div>
  );
}

function StatToggle({ label, value, active, disabled, onClick, hint, color }) {
  return (
    <button onClick={onClick} disabled={disabled} title={hint} style={{
      display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%",
      padding: "7px 8px", margin: "4px 0 0", borderRadius: 8, cursor: disabled ? "default" : "pointer",
      border: `1px solid ${active ? (color || C.faint) : "transparent"}`,
      background: active ? (color ? `${color}14` : C.soft) : "transparent",
      opacity: disabled ? 0.55 : 1,
    }}>
      <span style={{ fontSize: 12, color: color || C.muted }}>{label} {active ? "· 보는 중" : ""}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: color || C.text, fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </button>
  );
}

function ActionButton({ icon, label, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 8, width: "100%",
      padding: "8px 10px", borderRadius: "var(--db-radius-sm)",
      border: "1px solid var(--border)", background: "var(--border)",
      color: "var(--text-2)", fontSize: 12, cursor: "pointer", marginBottom: 6,
      transition: "var(--db-transition)",
    }}
    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--db-border-mid)"; e.currentTarget.style.color = "var(--text-1)"; }}
    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-2)"; }}
    ><span>{icon}</span>{label}</button>
  );
}

function Switch({ label, checked, onChange }) {
  return (
    <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", fontSize: 12, color: C.muted, cursor: "pointer" }}>
      {label}
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ accentColor: C.text }} />
    </label>
  );
}

function Slider({ label, value, min, max, step, onChange }) {
  return (
    <label style={{ display: "block", padding: "6px 0", fontSize: 12, color: C.muted }}>
      <span style={{ display: "flex", justifyContent: "space-between" }}>
        {label}<span style={{ color: C.faint, fontVariantNumeric: "tabular-nums" }}>×{value.toFixed(2)}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value}
             onChange={(e) => onChange(Number(e.target.value))}
             style={{ width: "100%", accentColor: C.text }} />
    </label>
  );
}

function Legend({ summary, stepsShown }) {
  return (
    <div style={{
      position: "absolute", left: 16, bottom: 16, display: "flex", gap: 12, flexWrap: "wrap", maxWidth: "calc(100% - 32px)",
      padding: "8px 12px", borderRadius: 10, fontSize: 10.5,
      background: "rgba(247,246,243,0.9)", backdropFilter: "blur(8px)",
      border: `1px solid ${C.border}`, color: C.muted,
    }}>
      {Object.entries(TYPE_STYLE)
        .filter(([type]) => type !== "pr" || summary?.prCount > 0)
        .map(([type, s]) => (
          <LegendItem key={type} label={s.label}><Dot type={type} /></LegendItem>
        ))}
      <LegendItem label="연결 안 됨">
        <i style={{
          width: 9, height: 9, borderRadius: "50%", background: "transparent",
          border: `1.5px dashed #8f8c82`, display: "inline-block", boxSizing: "border-box",
        }} />
      </LegendItem>

      {stepsShown && (
        <>
          <span style={{ width: 1, background: C.border, alignSelf: "stretch" }} />
          {[1, 2].map((k) => (
            <LegendItem key={k} label={STEP_STYLE[k].label} color={STEP_STYLE[k].color}>
              <i style={{
                width: 9, height: 9, borderRadius: "50%", display: "inline-block", boxSizing: "border-box",
                border: `2px ${k === 1 ? "solid" : "dashed"} ${STEP_STYLE[k].color}`,
              }} />
            </LegendItem>
          ))}
        </>
      )}

      {summary?.changedCount > 0 && (
        <>
          <span style={{ width: 1, background: C.border, alignSelf: "stretch" }} />
          {Object.entries(CHANGE_STYLE).map(([kind, s]) => (
            <LegendItem key={kind} label={s.label} color={s.color}>
              <i style={{ width: 9, height: 9, borderRadius: "50%", border: `2px solid ${s.color}`, display: "inline-block", boxSizing: "border-box" }} />
            </LegendItem>
          ))}
          <LegendItem label="확인 필요" color={IMPACT_COLOR}>
            <i style={{ width: 9, height: 9, borderRadius: "50%", border: `2px dashed ${IMPACT_COLOR}`, display: "inline-block", boxSizing: "border-box" }} />
          </LegendItem>
        </>
      )}
    </div>
  );
}

function LegendItem({ label, color, children }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6, color: color || C.muted }}>
      {children}{label}
    </span>
  );
}

function Overlay({ children, tone }) {
  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex",
      alignItems: "center", justifyContent: "center", textAlign: "center",
      fontSize: 13.5, lineHeight: 1.7,
      color: tone === "error" ? "#ef4444" : C.muted,
      background: "rgba(247,246,243,0.82)",
    }}>
      <div>{children}</div>
    </div>
  );
}

function Empty({ message }) {
  return (
    <div style={{
      flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", background: C.bg, color: C.muted, fontSize: 13.5,
    }}>{message}</div>
  );
}

function DetailPanel({ selection, onClose }) {
  const s = TYPE_STYLE[selection.type] || TYPE_STYLE.feature;

  return (
    <div className="db-card" data-testid="kg-detail" style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{
          padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700,
          background: `${s.color}22`, border: `1px solid ${s.color}66`, color: s.color,
        }}>{s.label}</div>
        <button onClick={onClose} aria-label="선택 해제" style={{
          marginLeft: "auto", border: "none", background: "transparent", color: C.faint, cursor: "pointer", fontSize: 14,
        }}>✕</button>
      </div>

      <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: C.text, wordBreak: "break-all", lineHeight: 1.45 }}>
        {selection.label}
      </h3>

      {selection.meta?.description && (
        <p style={{ margin: "0 0 12px", fontSize: 12.5, color: C.muted, lineHeight: 1.6 }}>{selection.meta.description}</p>
      )}

      {selection.type === "pr" && <PullRequestDetail meta={selection.meta} />}

      {selection.change && (
        <Note color={CHANGE_STYLE[selection.change].color} strong>
          직전 버전 대비 <b>{CHANGE_STYLE[selection.change].label}</b>
          {selection.step1.length + selection.step2.length > 0 && (
            <span style={{ display: "block", marginTop: 4, fontWeight: 400, color: C.muted }}>
              아래 영향 단계의 항목들을 함께 확인하세요
            </span>
          )}
        </Note>
      )}

      {selection.impacted && !selection.change && (
        <Note color={IMPACT_COLOR} strong>이 항목은 직접 바뀌지 않았지만, 바뀐 항목과 이어져 있어 확인이 필요합니다</Note>
      )}

      {selection.meta?.notice && <Note color={CHANGE_STYLE.ADDED.color}>{selection.meta.notice}</Note>}

      {selection.orphan && (
        <div style={{
          padding: "9px 11px", borderRadius: 7, fontSize: 12, lineHeight: 1.6, marginBottom: 12,
          background: C.soft, border: `1px dashed ${C.faint}`, color: C.muted,
        }}>
          {selection.meta?.hint || "다른 계층과 이어지지 않았습니다"}
        </div>
      )}

      {/* 기획서의 "우선순위를 지정해 단계별로" — 무엇부터 볼지 */}
      <div style={{ marginTop: 6, fontSize: 12, color: C.muted }}>
        영향 단계 <b style={{ color: STEP_STYLE[1].color }}>1단계 {selection.step1.length}</b>
        {" · "}
        <b style={{ color: "#c77b17" }}>2단계 {selection.step2.length}</b>
      </div>

      {selection.touchedBy.length > 0 && <Related title="지금 이걸 건드리는 PR" items={selection.touchedBy} empty="" />}
      {selection.type !== "pr" && (
        <Related title="1단계 · 이 항목을 사용하는 쪽" items={selection.upstream} empty="이 항목을 참조하는 대상이 없습니다" />
      )}
      <Related
        title={selection.type === "pr" ? "1단계 · 이 PR이 닿는 명세" : "1단계 · 이 항목이 영향을 주는 쪽"}
        items={selection.downstream}
        empty="위 목록 외에 영향을 주는 대상이 없습니다"
      />
      <Related title="2단계 · 한 다리 건너 확인할 것" items={selection.step2} empty="두 걸음 안에 더 닿는 항목이 없습니다" dashed />
    </div>
  );
}

function Note({ color, strong, children }) {
  return (
    <div style={{
      padding: "9px 11px", borderRadius: 7, fontSize: 12, lineHeight: 1.6, marginBottom: 10,
      background: `${color}14`, border: `1px solid ${color}55`, color, fontWeight: strong ? 600 : 400,
    }}>{children}</div>
  );
}

/**
 * PR 노드를 골랐을 때의 코드 쪽 정보 — 목록만으로는 알 수 없는 정합성 점수, 바꾼 파일, 원문 링크.
 */
function PullRequestDetail({ meta }) {
  const warnings = meta.warnings || 0;
  const files = meta.files || [];

  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
        padding: "9px 11px", borderRadius: 7, fontSize: 12,
        background: warnings > 0 ? `${IMPACT_COLOR}14` : C.soft,
        border: `1px solid ${warnings > 0 ? `${IMPACT_COLOR}55` : C.border}`,
        color: warnings > 0 ? IMPACT_COLOR : C.muted,
      }}>
        <b style={{ fontVariantNumeric: "tabular-nums" }}>정합성 {meta.score}/100</b>
        {warnings > 0 && <span>· 확인 필요 {warnings}건</span>}
      </div>

      {files.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <SectionTitle>바꾼 파일 ({files.length})</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {files.slice(0, 8).map((file) => (
              <code key={file} style={{ fontSize: 11, color: C.muted, wordBreak: "break-all", lineHeight: 1.5 }}>{file}</code>
            ))}
            {files.length > 8 && <span style={{ fontSize: 11, color: C.muted }}>… 외 {files.length - 8}개</span>}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        {meta.url && <ExternalLink href={meta.url}>PR 열기</ExternalLink>}
        {meta.reviewUrl && <ExternalLink href={meta.reviewUrl}>정합성 리뷰</ExternalLink>}
      </div>
    </div>
  );
}

function ExternalLink({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" style={{
      padding: "5px 11px", borderRadius: 999, fontSize: 11.5,
      border: `1px solid ${C.border}`, color: C.text, textDecoration: "none",
    }}>{children} ↗</a>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.04em", color: C.muted, marginBottom: 7 }}>{children}</div>
  );
}

function Related({ title, items, empty, dashed }) {
  return (
    <div style={{ marginTop: 14 }}>
      <SectionTitle>{title} {items.length > 0 && `(${items.length})`}</SectionTitle>
      {items.length === 0 ? (
        <div style={{ fontSize: 12, color: C.muted }}>{empty}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {items.map((item) => {
            const st = TYPE_STYLE[item.type] || TYPE_STYLE.feature;
            return (
              <div key={item.id} style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "6px 9px", borderRadius: 6, fontSize: 12,
                background: C.soft, border: `1px ${dashed ? "dashed" : "solid"} ${C.border}`,
                color: C.text, wordBreak: "break-all",
              }}>
                <i style={{ width: 8, height: 8, borderRadius: 2, flexShrink: 0, background: st.color, display: "inline-block" }} />
                {item.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
