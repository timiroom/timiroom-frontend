"use client";

/**
 * 지식 그래프
 *
 * 기능 · API · DB 테이블이 어떻게 이어져 있는지 보여주고,
 * 하나를 고르면 그것과 엮인 것만 남겨 변경의 영향 범위를 드러낸다.
 *
 * 힘기반 배치는 노드가 늘면 가운데로 엉겨붙어 선이 서로를 가린다.
 * 그 덩어리를 피하려고 네 가지를 건다.
 *   1. 도메인 묶음  같은 리소스를 다루는 노드를 한 영역에 모으고 묶음끼리 밀어낸다.
 *   2. 크기로 위계  연결이 많은 노드를 크게 그려 중심이 먼저 보이게 한다.
 *   3. 선택 시 집중  고른 노드와 이어진 것만 남기고 나머지는 물러나게 한다.
 *   4. 라벨은 원 밖  글자 길이가 원 크기를 끌고 다니지 않게 아래에 둔다.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { fetchProjectGraph, toCytoscapeElements } from "@/lib/graphApi";

/**
 * 바탕 — 랜딩·대시보드와 같은 아이보리.
 *
 * 값은 지어내지 않고 디자인 시스템 토큰(styles/theme.css)을 그대로 옮겼다.
 * 이 화면만 어두우면 대시보드 안에서 혼자 튀어 다른 제품처럼 보인다.
 */
const C = {
  bg:      "#f7f6f3",   // --bg
  panel:   "#ffffff",   // --surface
  border:  "#e4e2db",   // --border
  text:    "#1a1916",   // --text-1
  muted:   "#6b6960",   // --text-2
  faint:   "#a8a69f",   // --text-3
};

/**
 * 계층별 색.
 *
 * 디자인 시스템의 상태 색(--db-green/blue/pink)을 그대로 쓴다. 밝은 바탕에서는
 * 파스텔이 배경에 녹아 버리므로 채도를 살린 중간 톤이 필요하고, 마침 그 토큰들이
 * 그 자리에 있다. 따뜻한 색(--db-orange)은 화면 통틀어 "변경·영향" 하나에만 준다.
 * 그러면 주황이 뜨는 순간 그게 곧 신호가 된다.
 *
 * light는 원 가운데, deep은 테두리 쪽 — 방사형으로 겹쳐 구슬처럼 입체를 준다.
 */
const TYPE_STYLE = {
  feature: { color: "#10b981", light: "#6ee7b7", deep: "#047857", label: "기능" },
  api:     { color: "#3b82f6", light: "#93c5fd", deep: "#1d4ed8", label: "API" },
  table:   { color: "#ec4899", light: "#f9a8d4", deep: "#be185d", label: "테이블" },
  // 코드(PR)는 기획 세 계층과 결이 달라 형태로도 구분한다 — 아래에서 사각형으로 그린다.
  // 색은 브랜드의 따뜻한 무채색이라 어느 계층으로도 오해되지 않는다.
  pr:      { color: "#6b6960", light: "#a8a69f", deep: "#3c3a33", label: "PR" },
};

/**
 * 연결 안 됨 — 붉은색으로 경고하지 않는다.
 * 이건 "잘못됐다"가 아니라 "이어질 것이 없다"는 부재다.
 *
 * 부재를 드러내는 방법은 바닥에 따라 뒤집어야 한다.
 * 어두운 바닥에서는 색을 빼면 창백하게 떠오르지만, 밝은 바닥에서 색을 빼면
 * 그냥 사라진다. 설계 구멍을 찾아 주는 게 이 화면의 쓸모인데 정작 그 구멍이
 * 제일 안 보이게 되는 셈이다. 그래서 밝은 바닥에서는 속을 비우고 테두리만 남긴다.
 * 채우면 있는 것, 비우면 없는 것 — 뜻은 같고 표현만 바탕에 맞춘다.
 */
const ORPHAN_STYLE = { color: "#d0cec6", light: "#e4e2db", deep: "#b3b0a5" };

/**
 * 변경 표시 — 전부 같은 호박색 계열이고 진하기로만 갈린다.
 * 추가에 초록, 수정에 노랑, 삭제에 회색을 쓰면 계층 색과 뒤엉켜
 * 화면에 색이 여섯 개가 된다. 한 계열로 묶으면 "따뜻한 테두리 = 손댈 곳"이
 * 한눈에 잡히고, 어느 종류인지는 범례와 상세 패널이 말해 준다.
 *
 * 밝은 바탕에서는 옅을수록 안 보이므로, 어두운 바탕에서 쓰던 순서를 뒤집어
 * 진할수록 무겁게 읽히도록 잡았다.
 */
const CHANGE_STYLE = {
  ADDED:    { color: "#f59e0b", label: "추가됨" },   // --db-orange
  MODIFIED: { color: "#ea580c", label: "수정됨" },
  REMOVED:  { color: "#9a3412", label: "삭제됨" },
};

/* 확인 필요 — 수정됨과 같은 색을 쓰되 점선으로 형태를 달리한다 */
const IMPACT_COLOR = "#ea580c";

/**
 * 그래프가 놓이는 바닥.
 *
 * 헤더·범례·상세 패널은 언제나 아이보리다. 바뀌는 건 그림이 놓이는 바닥뿐이라,
 * 액자가 캔버스를 감싸는 모양이 된다 — 지도나 사진이 자기 바닥을 갖는 것과 같다.
 *
 * 어두운 바닥은 새로 지어낸 색이 아니라 --db-purple-900(=--accent, CTA에 쓰는 먹색)이다.
 * 그래프는 원래 어두운 바닥에서 잘 읽힌다. 색 있는 노드가 빛나 보이고, 옅은 선이
 * 배경으로 물러나며, 흐리게 한 것이 "사라진" 게 아니라 "뒤로 간" 것으로 읽힌다.
 */
const CANVAS_THEME = {
  light: {
    bg:         "#f7f6f3",
    glow:       "#fdfdfc",
    label:      "#6b6960",
    labelPlate: "#f7f6f3",
    edge:       "#6b6960",
    edgeOpacity: 0.42,
    groupLabel: "#1a1916",
    groupOpacity: 0.3,
    focusRing:  "#1a1916",
    dim:        0.14,
    // 밝은 바닥 — 속을 비워 부재를 드러낸다
    orphanFill:      0,
    orphanRing:      "#8f8c82",
    orphanRingWidth: 2,
    orphanRingStyle: "dashed",
  },
  dark: {
    bg:         "#1a1916",   // --db-purple-900 / --accent
    glow:       "#2b2a25",   // --db-purple-800
    label:      "#a8a69f",   // --text-3
    labelPlate: "#1a1916",
    edge:       "#a8a69f",
    edgeOpacity: 0.3,
    groupLabel: "#ffffff",
    groupOpacity: 0.24,
    focusRing:  "#f7f6f3",
    dim:        0.08,
    // 어두운 바닥 — 색을 뺀 창백함이 그대로 부재로 읽힌다
    orphanFill:      1,
    orphanRing:      "rgba(255,255,255,0.30)",
    orphanRingWidth: 1.5,
    orphanRingStyle: "dotted",
  },
};

/**
 * 캔버스 바닥.
 *
 * 사용자에게 보이는 전환 스위치는 두지 않는다 — 테마는 화면 하나가 아니라
 * 앱 전체의 문제고, 이 화면만 스위치를 들고 있으면 나중에 앱 테마가 생겼을 때
 * 둘이 어긋난다. 앱에 테마 체계가 생기면 이 한 줄을 거기에 물리면 된다.
 */
const CANVAS = CANVAS_THEME.dark;

export function KnowledgeGraph({ project }) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);

  const [graph, setGraph]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [selected, setSelected] = useState(null);
  const [showOrphanOnly, setShowOrphanOnly] = useState(false);
  const [showImpactOnly, setShowImpactOnly] = useState(false);

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
  }, [projectId]);

  /* ── 그래프 렌더 ── */
  useEffect(() => {
    if (!graph || !containerRef.current) return;
    if (!graph.nodes?.length) return;

    let cy;
    let disposed = false;

    (async () => {
      // 브라우저에서만 불러온다 — 서버 렌더 단계에는 필요 없다.
      // 두 패키지 모두 CommonJS로 배포되어 동적 import로는 상호운용이 깨진다.
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

        // 휠 한 칸에 얼마나 확대할지. 기본값이 1인데 0.2로 눌러 놓으니
        // 몇 번을 굴려도 그림이 거의 그대로라 "반응이 없다"고 느껴진다.
        wheelSensitivity: 1,
        minZoom: 0.15,
        maxZoom: 3,

        // 확대·이동 중에는 화면을 한 장 떠서 그것만 움직인다.
        // 노드마다 방사형 그라디언트를 칠하고 라벨 뒤에 판까지 깔아 두어
        // 한 프레임 값이 싸지 않은데, 끌 때마다 전부 다시 그리면 끊긴다.
        textureOnViewport: true,
        motionBlur: false,

        style: [
          {
            selector: "node",
            style: {
              label: "data(label)",
              "font-family": "'Pretendard','Noto Sans KR',sans-serif",
              "font-size": 10,
              "font-weight": 500,
              // 라벨을 원 아래에 둔다 — 원 안에 넣으면 글자 길이에 원 크기가 끌려간다
              "text-valign": "bottom",
              "text-halign": "center",
              "text-margin-y": 7,
              "text-wrap": "wrap",
              "text-max-width": 140,
              // 글자를 가장 진한 색으로 두면 노드보다 라벨이 먼저 눈에 든다.
              // 주인공은 관계이므로 글자는 한 단계 물러난 색으로 둔다.
              color: CANVAS.label,
              // 글자 뒤에 바탕색을 얇게 깔아, 선 위를 지나가도 읽히게 한다.
              // 예전의 외곽선(text-outline)은 글자마다 후광이 생겨 지저분했다.
              "text-background-color": CANVAS.labelPlate,
              "text-background-opacity": 0.78,
              "text-background-padding": 3,
              "text-background-shape": "roundrectangle",
              shape: "ellipse",
              // 연결이 많을수록 크게 — 무엇이 중심인지 크기로 먼저 읽힌다
              width: "mapData(degree, 0, 8, 20, 52)",
              height: "mapData(degree, 0, 8, 20, 52)",
              "border-width": 0,
              // 납작한 원판 대신 가운데가 밝은 구슬로 — 평면적인 인상을 없앤다
              "background-fill": "radial-gradient",
              "background-gradient-stop-positions": "0% 62% 100%",
              "transition-property": "opacity, border-width, width, height",
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
            // 도메인 묶음 — 상자를 그리지 않는다.
            // 눈에는 보이지 않지만 배치 계산에는 그대로 작용해,
            // 같은 도메인 노드끼리 자연스럽게 모이고 도메인끼리는 떨어진다.
            // 선으로 영역을 가두면 관계보다 칸막이가 먼저 읽힌다.
            selector: 'node[type="group"]',
            style: {
              // 묶음은 그리지 않으므로 노드가 쓰는 방사형 채움을 물려받으면 안 된다.
              // 색 정지점이 없는 채로 그라디언트를 계산하려다 렌더러가 멈춘다.
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
              // 도메인 이름은 배경 안내판이다. 흐리게 두지 않으면
              // 정작 봐야 할 노드 라벨보다 먼저 눈에 든다.
              color: CANVAS.groupLabel,
              "text-opacity": CANVAS.groupOpacity,
              "text-background-opacity": 0,
              padding: 14,
              width: "label",
              height: "label",
              events: "no",
            },
          },
          {
            // 코드(PR) — 기획에서 나온 세 계층과 출신이 다르다.
            // 색만 달리하면 "네 번째 계층"처럼 읽히므로 형태를 바꿔
            // 한눈에 "이건 문서가 아니라 코드"임을 알게 한다.
            selector: 'node[type="pr"]',
            style: {
              shape: "round-rectangle",
              width: "mapData(degree, 0, 8, 26, 58)",
              height: "mapData(degree, 0, 8, 16, 26)",
              "font-size": 9.5,
              "text-max-width": 170,
            },
          },
          {
            // 어디에도 이어지지 않은 노드 — 설계 구멍.
            // 색이 빠져 죽은 듯 보이는 것 자체가 신호다.
            selector: 'node[orphan="yes"]',
            style: {
              "background-color": ORPHAN_STYLE.color,
              "background-gradient-stop-colors":
                `${ORPHAN_STYLE.light} ${ORPHAN_STYLE.color} ${ORPHAN_STYLE.deep}`,
              "background-opacity": CANVAS.orphanFill,
              "border-width": CANVAS.orphanRingWidth,
              "border-color": CANVAS.orphanRing,
              "border-opacity": 1,
              "border-style": CANVAS.orphanRingStyle,
              color: CANVAS.label,
            },
          },
          /* 변경된 노드 — 테두리 색으로 무엇이 바뀌었는지 알린다.
             채움색은 종류(기능·API·테이블)를 그대로 두어 두 정보가 겹치지 않게 한다.
             테두리를 두껍게 잡아 멀리서도 어디가 바뀌었는지 먼저 눈에 들게 한다 */
          ...Object.entries(CHANGE_STYLE).map(([kind, s]) => ({
            selector: `node[change="${kind}"]`,
            style: { "border-width": 3.5, "border-color": s.color, "border-opacity": 1 },
          })),
          {
            // 삭제된 항목은 지금 명세에 없으므로 속을 비워 부재를 드러낸다
            selector: 'node[change="REMOVED"]',
            style: { "background-opacity": 0.15, "border-style": "dashed" },
          },
          {
            // 스스로 바뀐 건 아니지만 바뀐 것과 이어져 확인이 필요한 노드
            selector: 'node[impacted="yes"]',
            style: {
              "border-width": 2.5,
              "border-color": IMPACT_COLOR,
              "border-opacity": 0.9,
              "border-style": "dashed",
            },
          },
          {
            // 이 화면이 보여주려는 건 노드가 아니라 노드 사이의 관계다.
            // 선이 배경에 묻히면 무엇이 무엇에 걸려 있는지 읽히지 않으므로
            // 바탕과 확실히 구분될 만큼은 밝게 둔다.
            // 색은 검정 대신 따뜻한 회색 — 검은 선은 노드보다 진해서
            // 배경 격자처럼 보여야 할 것이 앞으로 나온다.
            selector: "edge",
            style: {
              width: 1.1,
              "line-color": CANVAS.edge,
              "line-opacity": CANVAS.edgeOpacity,
              // 완만한 곡선 — 세 개 이상이 한 노드에 모일 때 선이 겹쳐 사라지지 않는다
              "curve-style": "bezier",
              "control-point-step-size": 30,
              "target-arrow-shape": "none",
              "transition-property": "opacity, line-color, line-opacity, width",
              "transition-duration": "160ms",
            },
          },
          {
            selector: 'edge[type="REFERENCES"]',
            style: { "line-style": "dashed" },
          },
          {
            // 코드가 명세에 닿는 선. 문서끼리의 관계(항상 참인 구조)와 달리
            // 이건 "지금 누군가 건드리는 중"이라는 시간이 있는 사실이므로
            // 점선으로 임시성을 드러낸다.
            selector: 'edge[type="CHANGES"]',
            style: { "line-style": "dotted", "line-opacity": 0.45, width: 1.4 },
          },
          {
            // 변경이 타고 번져 나간 경로.
            // 노드에 표시만 남기면 "왜 이게 영향을 받았는지"가 안 보인다.
            // 번짐이 지나간 선을 굵고 밝게 살려 두면 경로가 한눈에 이어진다.
            //
            // 화살표는 달지 않는다. 영향은 양방향으로 퍼진다 —
            // 테이블이 바뀌면 그 테이블을 쓰는 API 쪽으로, 즉 선이 그려진
            // 방향과 반대로도 번진다. 화살촉을 붙이면 없는 방향을 주장하게 된다.
            selector: 'edge[onImpactPath="yes"]',
            style: {
              width: 2.4,
              "line-color": IMPACT_COLOR,
              "line-opacity": 0.85,
            },
          },
          /* 선택 시 — 관련 없는 것은 물러나고 영향 경로만 남는다.
             밝은 바탕에서는 너무 낮추면 아예 사라져 맥락을 잃는다 */
          { selector: ".dim", style: { opacity: CANVAS.dim } },
          {
            selector: "node.focus",
            style: { "border-width": 3, "border-color": CANVAS.focusRing, "border-opacity": 0.9 },
          },
          {
            selector: "edge.focus",
            style: { width: 2, "line-color": CANVAS.focusRing, "line-opacity": 0.8, "target-arrow-shape": "none" },
          },
        ],
        layout: fcoseLayout(elements.length),
      });

      cy.on("tap", "node", (evt) => {
        const node = evt.target;
        if (node.data("type") === "group") return;   // 상자는 선택 대상이 아니다
        applyFocus(cy, node);
        setSelected(buildSelection(node));
      });

      cy.on("tap", (evt) => {
        if (evt.target === cy) {
          clearFocus(cy);
          setSelected(null);
        }
      });

      cyRef.current = cy;
    })();

    return () => {
      disposed = true;
      if (cy) cy.destroy();
      cyRef.current = null;
    };
  }, [graph]);

  /* ── 걸러 보기 (연결 안 됨 / 변경 영향) ── */
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    if (showOrphanOnly) {
      cy.nodes('[type != "group"]').forEach((n) => {
        n.toggleClass("dim", n.data("orphan") !== "yes");
      });
      cy.edges().addClass("dim");
    } else if (showImpactOnly) {
      // 바뀐 것과 그 때문에 확인이 필요한 것만 남긴다
      const involved = cy.nodes('[change != "none"], [impacted="yes"]');
      cy.elements().addClass("dim");
      involved.removeClass("dim");
      // 그 사이를 잇는 선도 함께 살려야 어디로 번졌는지 보인다
      involved.edgesWith(involved).removeClass("dim");
      cy.nodes('[type="group"]').removeClass("dim");
    } else if (!selected) {
      clearFocus(cy);
    }
  }, [showOrphanOnly, showImpactOnly, selected]);

  const summary = graph?.summary;
  const orphanTotal = summary
    ? summary.orphanFeatures + summary.orphanApis + summary.orphanTables
    : 0;

  const reset = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    clearFocus(cy);
    cy.fit(undefined, 30);
    setSelected(null);
    setShowOrphanOnly(false);
    setShowImpactOnly(false);
  }, []);

  /* ── 화면 ── */
  if (!projectId) {
    return <Empty message="프로젝트를 선택하면 지식 그래프를 볼 수 있습니다" />;
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100vh", background: C.bg }}>
      {/* 상단 요약 */}
      <div style={{
        flexShrink: 0, padding: "15px 26px", borderBottom: `1px solid ${C.border}`,
        background: C.panel, display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap",
      }}>
        <span style={{
          fontSize: 11, fontWeight: 600, color: C.muted,
          letterSpacing: "0.16em", textTransform: "uppercase",
        }}>지식 그래프</span>

        {summary && (
          <>
            <Stat label="기능" value={summary.featureCount} type="feature" />
            <Stat label="API" value={summary.apiCount} type="api" />
            <Stat label="테이블" value={summary.tableCount} type="table" />
            {summary.prCount > 0 && <Stat label="PR" value={summary.prCount} type="pr" />}

            {/* 변경 영향 — 직전 문서 대비 무엇이 바뀌었고 어디까지 번졌는지 */}
            {summary.changedCount > 0 && (
              <button
                onClick={() => { setShowImpactOnly((v) => !v); setShowOrphanOnly(false); }}
                title="바뀐 항목과 그 때문에 확인이 필요한 항목만 보기"
                style={{
                  marginLeft: 4, padding: "5px 12px", borderRadius: 999, fontSize: 11.5, fontWeight: 600,
                  cursor: "pointer", letterSpacing: "0.01em",
                  background: showImpactOnly ? `${IMPACT_COLOR}18` : "transparent",
                  border: `1px solid ${IMPACT_COLOR}${showImpactOnly ? "99" : "55"}`,
                  color: IMPACT_COLOR,
                }}
              >
                변경 {summary.changedCount} · 영향 {summary.impactedCount}
              </button>
            )}

            {orphanTotal > 0 && (
              <button
                onClick={() => { setShowOrphanOnly((v) => !v); setShowImpactOnly(false); }}
                title="다른 계층과 이어지지 않은 항목만 보기"
                style={{
                  marginLeft: 4, padding: "5px 12px", borderRadius: 999, fontSize: 11.5, fontWeight: 600,
                  cursor: "pointer", letterSpacing: "0.01em",
                  background: showOrphanOnly ? "#f2f0ea" : "transparent",
                  border: `1px solid ${showOrphanOnly ? C.faint : C.border}`,
                  color: showOrphanOnly ? C.text : C.muted,
                }}
              >
                연결 안 됨 {orphanTotal}
              </button>
            )}

            <button
              onClick={reset}
              style={{
                marginLeft: "auto", padding: "5px 12px", borderRadius: 999, fontSize: 11.5,
                background: "transparent", border: `1px solid ${C.border}`, color: C.muted, cursor: "pointer",
              }}
            >초기화</button>
          </>
        )}
      </div>

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* 그래프 */}
        {/* 단색 바탕은 평평해서 그래프가 종이에 찍힌 것처럼 죽는다.
            가운데를 미세하게 밝혀 두면 노드가 그 빛 속에 놓인 것처럼 보인다. */}
        <div style={{
          flex: 1, position: "relative", minWidth: 0,
          background: `radial-gradient(ellipse 90% 70% at 50% 42%, ${CANVAS.glow} 0%, ${CANVAS.bg} 72%)`,
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

          {/* 범례 */}
          {graph?.nodes?.length > 0 && (
            <div style={{
              position: "absolute", left: 18, bottom: 18, display: "flex", gap: 14,
              padding: "9px 14px", borderRadius: 10, fontSize: 10.5,
              // 판을 얹지 않고 바탕에 스며들게 — 상자를 덜어낸 화면과 결을 맞춘다
              background: "rgba(247,246,243,0.86)", backdropFilter: "blur(8px)",
              border: `1px solid ${C.border}`, color: C.muted,
            }}>
              {/* 범례 표식은 화면의 노드와 같은 형태여야 바로 이어 읽힌다.
                  PR은 캔버스에서 사각형이므로 범례에서도 사각형으로 둔다. */}
              {Object.entries(TYPE_STYLE)
                .filter(([type]) => type !== "pr" || summary?.prCount > 0)
                .map(([type, s]) => (
                  <LegendItem key={type} label={s.label}>
                    <i style={{
                      width: type === "pr" ? 13 : 9, height: 9,
                      borderRadius: type === "pr" ? 3 : "50%",
                      background: `radial-gradient(circle at 35% 30%, ${s.light}, ${s.deep})`,
                      display: "inline-block",
                    }} />
                  </LegendItem>
                ))}
              <LegendItem label="연결 안 됨">
                <i style={{
                  width: 9, height: 9, borderRadius: "50%",
                  // 범례는 언제나 아이보리 판 위에 있으므로 캔버스 모드를 따르지 않는다
                  background: ORPHAN_STYLE.color, border: `1px dotted ${C.faint}`,
                  display: "inline-block", boxSizing: "border-box",
                }} />
              </LegendItem>

              {/* 변경이 있을 때만 노출 — 평소엔 범례를 짧게 유지한다 */}
              {summary?.changedCount > 0 && (
                <>
                  <span style={{ width: 1, background: C.border, alignSelf: "stretch" }} />
                  {Object.entries(CHANGE_STYLE).map(([kind, s]) => (
                    <LegendItem key={kind} label={s.label} color={s.color}>
                      <i style={{
                        width: 9, height: 9, borderRadius: "50%",
                        border: `2px solid ${s.color}`, display: "inline-block", boxSizing: "border-box",
                      }} />
                    </LegendItem>
                  ))}
                  <LegendItem label="확인 필요" color={IMPACT_COLOR}>
                    <i style={{
                      width: 9, height: 9, borderRadius: "50%",
                      border: `2px dashed ${IMPACT_COLOR}`, display: "inline-block", boxSizing: "border-box",
                    }} />
                  </LegendItem>
                  <LegendItem label="영향 경로" color={IMPACT_COLOR}>
                    <i style={{
                      width: 14, height: 0, display: "inline-block",
                      borderTop: `2px solid ${IMPACT_COLOR}`,
                    }} />
                  </LegendItem>
                </>
              )}
            </div>
          )}
        </div>

        {/* 상세 */}
        {selected && <DetailPanel selection={selected} />}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   배치
══════════════════════════════════════ */

/**
 * 유기적으로 퍼지되 뭉치지 않게 하는 설정.
 *
 * 힘기반 배치는 그대로 두면 노드가 늘어날수록 가운데로 엉겨붙어
 * 선이 서로를 가리는 덩어리가 된다. 그래서 두 가지를 건다.
 *   - 밀어내는 힘을 노드 수에 따라 키운다
 *   - 도메인 묶음끼리도 서로 밀어내게 해 영역이 겹치지 않게 한다
 *
 * 묶음을 선으로 그리지 않으므로, 어디까지가 한 도메인인지는 오직
 * 이 배치가 만들어내는 거리감으로만 전달된다. 묶음 안은 더 당기고
 * 묶음끼리는 더 밀어내야 상자 없이도 경계가 읽힌다.
 */
function fcoseLayout(elementCount) {
  const crowded = elementCount > 40;

  return {
    name: "fcose",
    quality: "proof",
    // 무작위 시작점을 쓰지 않는다. 같은 명세면 언제 열어도 같은 그림이어야
    // "저번에 봤던 그 노드"를 눈으로 찾을 수 있다. 열 때마다 배치가 흔들리면
    // 매번 처음부터 읽어야 한다.
    randomize: false,
    animate: true,
    animationDuration: 700,
    fit: true,
    padding: 60,

    // 라벨을 원 밖에 두므로 배치 계산에도 라벨 크기를 포함시켜야 한다.
    // 이게 없으면 원끼리는 안 겹쳐도 글자끼리 겹쳐 읽을 수 없게 된다.
    nodeDimensionsIncludeLabels: true,

    // 연결이 많은 노드는 조금 더 밀어낸다. users처럼 대여섯이 매달린 노드는
    // 이웃이 퍼져야 선이 갈라져 보인다. 다만 세게 주면 허브가 서로를 화면 끝까지
    // 밀어내 가운데가 비고 가장자리만 붐빈다.
    nodeRepulsion: (node) => {
      const base = crowded ? 4200 : 2600;
      return base * (1 + Math.min(node.data("degree") || 0, 8) * 0.12);
    },

    // 이어진 것은 가까이 둔다.
    //
    // 도메인을 가로지르는 외래키와 바깥에서 들어오는 PR을 멀찍이 떼어놓으려고
    // 이상거리를 늘려 봤는데 반대로 갔다. 힘기반 배치에서 이상거리를 늘리면
    // 정돈되는 게 아니라 그냥 선이 길어져서, 화면을 가로지르며 남의 선을 더 많이 지난다.
    // 떼어놓는 일은 밀어내는 힘이 하고, 선은 짧을수록 읽힌다.
    idealEdgeLength: (edge) => {
      const near = crowded ? 80 : 56;
      // PR은 자기가 건드린 것에 붙어 있어야 "이 코드가 여기를 만진다"가 한눈에 보인다
      return edge.data("type") === "CHANGES" ? near * 0.8 : near;
    },
    edgeElasticity: 0.55,
    nestingFactor: 0.08,       // 묶음 안쪽은 더 가깝게 — 덩어리로 보이게
    // 중력이 약하면 노드가 화면 끝까지 흩어져, 정작 봐야 할 관계는
    // 작아지고 빈 바탕만 넓어진다. 당기는 힘을 세게 잡아 화면을 채운다.
    gravity: 1.4,
    gravityRange: 5.0,
    gravityCompound: 1.6,      // 묶음이 저마다 뭉치되 서로 밀어내진 않게
    numIter: 3500,
    // 이어지지 않은 덩어리를 따로 흩뿌리지 않고 빈 곳에 끼워 넣는다
    packComponents: true,
    tile: true,                // 연결 없는 노드는 따로 정렬해 둔다
    tilingPaddingVertical: 14,
    tilingPaddingHorizontal: 14,
  };
}

/* ══════════════════════════════════════
   영향 범위 계산
══════════════════════════════════════ */

/**
 * 고른 노드와 이어진 것만 남긴다.
 * 하류(이것이 영향을 주는 쪽)와 상류(이것에 영향을 주는 쪽)를 모두 살린다 —
 * 테이블을 골랐을 때 "이걸 쓰는 API"는 상류에 있기 때문이다.
 */
function applyFocus(cy, node) {
  const related = node.successors().union(node.predecessors()).union(node);
  cy.elements().addClass("dim");
  related.removeClass("dim").addClass("focus");
  node.removeClass("dim");
  // 상자는 배경이므로 흐림에서 제외한다
  cy.nodes('[type="group"]').removeClass("dim");
}

function clearFocus(cy) {
  cy.elements().removeClass("dim focus");
}

/**
 * 그림에는 이어진 사슬 전체를 남기지만, 목록에는 바로 맞닿은 것만 싣는다.
 * 사슬을 그대로 나열하면 "reviews를 사용하는 쪽"에 두세 다리 건넌 항목까지 섞여
 * 정작 손봐야 할 대상이 묻힌다.
 */
function buildSelection(node) {
  // PR은 상류에 섞어 두면 "이 API를 사용하는 쪽"에 코드가 끼어들어 뜻이 흐려진다.
  // 문서끼리의 관계와 "지금 이걸 건드리는 코드"는 성격이 다르므로 따로 센다.
  const downstream = node.outgoers().nodes('[type != "group"]');
  const upstream   = node.incomers().nodes('[type != "group"][type != "pr"]');
  const touchedBy  = node.incomers().nodes('[type="pr"]');

  const toItem = (n) => ({
    id: n.id(),
    label: n.data("fullLabel") || n.data("label"),
    type: n.data("type"),
    orphan: n.data("orphan") === "yes",
  });

  return {
    // 패널에서는 줄이지 않은 원래 이름을 보여준다
    label: node.data("fullLabel") || node.data("label"),
    type: node.data("type"),
    orphan: node.data("orphan") === "yes",
    change: node.data("change") !== "none" ? node.data("change") : null,
    impacted: node.data("impacted") === "yes",
    meta: node.data("meta") || {},
    downstream: downstream.map(toItem),
    upstream: upstream.map(toItem),
    touchedBy: touchedBy.map(toItem),
  };
}

/* ══════════════════════════════════════
   보조 컴포넌트
══════════════════════════════════════ */

function LegendItem({ label, color, children }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6, color: color || C.muted }}>
      {children}{label}
    </span>
  );
}

function Stat({ label, value, type }) {
  const s = TYPE_STYLE[type];
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: C.muted }}>
      <i style={{
        width: 8, height: 8, borderRadius: "50%",
        background: `radial-gradient(circle at 35% 30%, ${s.light}, ${s.deep})`,
        display: "inline-block",
      }} />
      {label} <b style={{ color: C.text, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{value}</b>
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

function DetailPanel({ selection }) {
  const s = TYPE_STYLE[selection.type] || TYPE_STYLE.feature;

  return (
    <aside style={{
      width: 300, flexShrink: 0, borderLeft: `1px solid ${C.border}`,
      background: C.panel, overflowY: "auto", padding: "18px 20px",
    }}>
      <div style={{
        display: "inline-block", padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700,
        background: `${s.color}22`, border: `1px solid ${s.color}66`, color: s.color, marginBottom: 10,
      }}>{s.label}</div>

      <h3 style={{
        margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: C.text,
        wordBreak: "break-all", lineHeight: 1.45,
      }}>{selection.label}</h3>

      {selection.meta?.description && (
        <p style={{ margin: "0 0 12px", fontSize: 12.5, color: C.muted, lineHeight: 1.6 }}>
          {selection.meta.description}
        </p>
      )}

      {selection.type === "pr" && <PullRequestDetail meta={selection.meta} />}

      {selection.change && (
        <div style={{
          padding: "9px 11px", borderRadius: 7, fontSize: 12, lineHeight: 1.6, marginBottom: 10,
          background: `${CHANGE_STYLE[selection.change].color}1a`,
          border: `1px solid ${CHANGE_STYLE[selection.change].color}66`,
          color: CHANGE_STYLE[selection.change].color, fontWeight: 600,
        }}>
          직전 버전 대비 <b>{CHANGE_STYLE[selection.change].label}</b>
          {selection.downstream.length + selection.upstream.length > 0 && (
            <span style={{ display: "block", marginTop: 4, fontWeight: 400, color: C.muted }}>
              아래 목록의 항목들을 함께 확인하세요
            </span>
          )}
        </div>
      )}

      {selection.impacted && !selection.change && (
        <div style={{
          padding: "9px 11px", borderRadius: 7, fontSize: 12, lineHeight: 1.6, marginBottom: 10,
          background: `${IMPACT_COLOR}1a`, border: `1px solid ${IMPACT_COLOR}66`,
          color: IMPACT_COLOR, fontWeight: 600,
        }}>
          이 항목은 직접 바뀌지 않았지만, 바뀐 항목과 이어져 있어 확인이 필요합니다
        </div>
      )}

      {/* 명세 자체의 흠 — 연결은 멀쩡해도 문서를 손봐야 하는 것들 */}
      {selection.meta?.notice && (
        <div style={{
          padding: "9px 11px", borderRadius: 7, fontSize: 12, lineHeight: 1.6, marginBottom: 10,
          background: `${CHANGE_STYLE.ADDED.color}12`,
          border: `1px solid ${CHANGE_STYLE.ADDED.color}44`,
          color: CHANGE_STYLE.ADDED.color,
        }}>
          {selection.meta.notice}
        </div>
      )}

      {selection.orphan && (
        <div style={{
          padding: "9px 11px", borderRadius: 7, fontSize: 12, lineHeight: 1.6, marginBottom: 14,
          background: "#f2f0ea", border: `1px dashed ${C.faint}`, color: C.muted,
        }}>
          {selection.meta?.hint || "다른 계층과 이어지지 않았습니다"}
        </div>
      )}

      {selection.touchedBy.length > 0 && (
        <Related title="지금 이걸 건드리는 PR" items={selection.touchedBy} empty="" />
      )}

      {/* PR은 언제나 출발점이라 상류가 없다 — 빈 칸을 띄워 봐야 자리만 차지한다 */}
      {selection.type !== "pr" && (
        <Related title="이 항목을 사용하는 쪽" items={selection.upstream}
                 empty="이 항목을 참조하는 대상이 없습니다" />
      )}
      <Related title={selection.type === "pr" ? "이 PR이 닿는 명세" : "이 항목이 영향을 주는 쪽"}
               items={selection.downstream}
               empty="영향을 주는 대상이 없습니다" />
    </aside>
  );
}

/**
 * PR 노드를 골랐을 때의 코드 쪽 정보.
 *
 * 아래의 "영향을 주는 쪽" 목록이 이 PR이 닿는 API·테이블을 이미 보여주므로,
 * 여기서는 그 목록만으로는 알 수 없는 것 — 정합성 점수, 바꾼 파일, 원문 링크 — 만 싣는다.
 */
function PullRequestDetail({ meta }) {
  const warnings = meta.warnings || 0;
  const files = meta.files || [];

  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
        padding: "9px 11px", borderRadius: 7, fontSize: 12,
        background: warnings > 0 ? `${IMPACT_COLOR}14` : "#f2f0ea",
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
              <code key={file} style={{
                fontSize: 11, color: C.muted, wordBreak: "break-all", lineHeight: 1.5,
              }}>{file}</code>
            ))}
            {files.length > 8 && (
              <span style={{ fontSize: 11, color: C.muted }}>… 외 {files.length - 8}개</span>
            )}
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
    <div style={{
      fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
      color: C.muted, marginBottom: 7,
    }}>{children}</div>
  );
}

function Related({ title, items, empty }) {
  return (
    <div style={{ marginTop: 16 }}>
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
                background: "#f2f0ea", border: `1px solid ${C.border}`,
                color: C.text, wordBreak: "break-all",
              }}>
                <i style={{
                  width: 8, height: 8, borderRadius: 2, flexShrink: 0,
                  background: st.color, display: "inline-block",
                }} />
                {item.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
