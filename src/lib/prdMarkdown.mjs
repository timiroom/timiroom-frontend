/**
 * PRD 구조화 문서 ↔ 마크다운 변환.
 *
 * 화면·AI·정합성 검사는 모두 PRD의 구조화 필드(goals, coreFeatures …)를 읽는다.
 * 편집기는 사람이 쓰기 쉬운 마크다운을 보여 주고, 저장할 때 정해진 틀(## 제목)을 따라
 * 다시 구조화 필드로 되돌린다. 틀에 없는 필드(featureId, apiContract 등)는
 * 원본 항목과 이름으로 짝지어 그대로 보존한다.
 */

const SECTIONS = [
  { key: "projectOverview", title: "개요" },
  { key: "background", title: "배경" },
  { key: "goals", title: "목표" },
  { key: "kpi", title: "KPI" },
  { key: "coreFeatures", title: "핵심 기능" },
  { key: "userPersonas", title: "사용자 페르소나" },
  { key: "mvpScope", title: "MVP 범위" },
  { key: "techStack", title: "기술 스택" },
  { key: "releaseSchedule", title: "릴리즈 일정" },
];
const TITLE_TO_KEY = Object.fromEntries(SECTIONS.map((section) => [section.title, section.key]));
// 예전 화면에서 쓰던 이름도 받아 준다.
Object.assign(TITLE_TO_KEY, { "프로젝트 개요": "projectOverview", "배경 및 문제 정의": "background", "MVP": "mvpScope", "일정": "releaseSchedule", "페르소나": "userPersonas" });

export const TECH_LABELS = { backend: "백엔드", frontend: "프론트엔드", database: "데이터베이스", cache: "캐시", messageQueue: "메시지 큐", cdn: "CDN", monitoring: "모니터링", auth: "인증", infra: "인프라", mobile: "모바일" };
const TECH_KEYS = Object.fromEntries(Object.entries(TECH_LABELS).map(([key, label]) => [label, key]));

const KPI_FIELDS = [["basis", "근거"], ["measurementMethod", "측정 방법"], ["frequency", "측정 주기"]];
const PERSONA_FIELDS = [["goal", "목표"], ["painPoint", "불편함"], ["usagePattern", "사용 패턴"], ["techLevel", "기술 수준"]];

const list = (value) => (Array.isArray(value) ? value : value == null || value === "" ? [] : [value]);
const text = (value) => (value == null ? "" : String(value)).trim();
// 여러 줄 글을 목록 항목 안에 넣을 때 다음 줄을 들여 써서 같은 항목으로 묶는다.
const indentLines = (value, pad) => text(value).split("\n").join(`\n${pad}`);

/** 구조화 PRD → 마크다운 */
export function prdToMarkdown(doc) {
  if (!doc || typeof doc !== "object") return "";
  const out = [];
  const section = (title) => out.push(`## ${title}`, "");

  if (text(doc.projectOverview)) { section("개요"); out.push(text(doc.projectOverview), ""); }
  if (text(doc.background)) { section("배경"); out.push(text(doc.background), ""); }
  if (list(doc.goals).length) { section("목표"); list(doc.goals).forEach((goal) => out.push(`- ${indentLines(goal, "  ")}`)); out.push(""); }
  if (list(doc.kpi).length) {
    section("KPI");
    list(doc.kpi).forEach((kpi) => {
      if (typeof kpi !== "object" || !kpi) { out.push(`- ${indentLines(kpi, "  ")}`); return; }
      out.push(`- **${text(kpi.metric)}**: ${indentLines(kpi.target, "  ")}`);
      KPI_FIELDS.forEach(([key, label]) => { if (text(kpi[key])) out.push(`  - ${label}: ${indentLines(kpi[key], "    ")}`); });
    });
    out.push("");
  }
  if (list(doc.coreFeatures).length) {
    section("핵심 기능");
    list(doc.coreFeatures).forEach((feature) => {
      out.push(`### ${text(feature.name) || "이름 없는 기능"}${text(feature.priority) ? ` \`${text(feature.priority)}\`` : ""}`, "");
      if (text(feature.description)) out.push(text(feature.description), "");
      if (list(feature.requirements).length) { list(feature.requirements).forEach((item) => out.push(`- ${indentLines(item, "  ")}`)); out.push(""); }
    });
  }
  if (list(doc.userPersonas).length) {
    section("사용자 페르소나");
    list(doc.userPersonas).forEach((persona) => {
      const meta = [text(persona.age), text(persona.job)].filter(Boolean).join(", ");
      out.push(`### ${text(persona.name) || "이름 없는 사용자"}${meta ? ` (${meta})` : ""}`, "");
      PERSONA_FIELDS.forEach(([key, label]) => { if (text(persona[key])) out.push(`- ${label}: ${indentLines(persona[key], "  ")}`); });
      out.push("");
    });
  }
  if (doc.mvpScope && typeof doc.mvpScope === "object") {
    section("MVP 범위");
    const scope = doc.mvpScope;
    if (list(scope.included).length) { out.push("### 포함", ""); list(scope.included).forEach((item) => out.push(`- ${indentLines(item, "  ")}`)); out.push(""); }
    if (list(scope.excluded).length) { out.push("### 제외", ""); list(scope.excluded).forEach((item) => out.push(`- ${indentLines(item, "  ")}`)); out.push(""); }
    if (text(scope.rationale)) out.push("### 근거", "", text(scope.rationale), "");
  }
  if (doc.techStack && typeof doc.techStack === "object" && Object.keys(doc.techStack).length) {
    section("기술 스택");
    Object.entries(doc.techStack).forEach(([key, value]) => out.push(`- **${TECH_LABELS[key] ?? key}**: ${indentLines(value, "  ")}`));
    out.push("");
  }
  if (list(doc.releaseSchedule).length) {
    section("릴리즈 일정");
    list(doc.releaseSchedule).forEach((release) => {
      out.push(`### ${text(release.milestone) || "이름 없는 일정"}${text(release.date) ? ` (${text(release.date)})` : ""}`, "");
      if (text(release.description)) out.push(text(release.description), "");
      if (list(release.deliverables).length) { list(release.deliverables).forEach((item) => out.push(`- ${indentLines(item, "  ")}`)); out.push(""); }
    });
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

/* ── 마크다운 읽기 ───────────────────────────────────────── */

// ## 단위로 자른다. 첫 ## 앞의 글은 개요로 본다.
function splitSections(markdown) {
  const sections = [];
  let current = { title: null, lines: [] };
  String(markdown || "").replace(/\r\n?/g, "\n").split("\n").forEach((line) => {
    const heading = /^##\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading && !line.startsWith("###")) { sections.push(current); current = { title: heading[1].trim(), lines: [] }; }
    else current.lines.push(line);
  });
  sections.push(current);
  return sections.filter((section) => section.title !== null || section.lines.some((line) => line.trim()));
}

// ### 단위로 자른다.
function splitSubsections(lines) {
  const parts = [];
  let current = { title: null, lines: [] };
  lines.forEach((line) => {
    const heading = /^###\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) { parts.push(current); current = { title: heading[1].trim(), lines: [] }; }
    else current.lines.push(line);
  });
  parts.push(current);
  return parts.filter((part) => part.title !== null || part.lines.some((line) => line.trim()));
}

// 글(문단)과 목록 항목을 나눈다. 목록 항목은 들여쓰기로 단계를 구분하고, 이어지는 줄은 같은 항목에 붙인다.
function readBlocks(lines) {
  const paragraphs = [], items = [];
  let paragraph = [], last = null;
  const flush = () => { if (paragraph.length) paragraphs.push(paragraph.join("\n").trim()); paragraph = []; };
  lines.forEach((line) => {
    const item = /^(\s*)[-*+]\s+(.*)$/.exec(line);
    if (item) {
      flush();
      last = { depth: item[1].replace(/\t/g, "  ").length >= 2 ? 1 : 0, text: item[2] };
      items.push(last);
    } else if (!line.trim()) {
      flush(); last = null;
    } else if (last && /^\s+/.test(line)) {
      last.text += `\n${line.trim()}`;
    } else {
      last = null; paragraph.push(line.trim());
    }
  });
  flush();
  return { text: paragraphs.join("\n\n"), items };
}

const strip = (value) => value.replace(/\*\*(.+?)\*\*/g, "$1").trim();
// "라벨: 값" 형태를 나눈다.
function labelled(value) {
  const match = /^\*{0,2}([^:*]+?)\*{0,2}\s*[:：]\s*([\s\S]*)$/.exec(value);
  return match ? [match[1].trim(), match[2].trim()] : [null, value.trim()];
}
// 원본 목록에서 같은 이름의 항목을 찾아 숨은 필드를 이어 받는다. 없으면 이름만 바뀐 것으로 보고
// 같은 자리의 원본 항목을 쓴다(그 원본의 이름이 새 문서에 그대로 남아 있으면 새 항목이다).
function baseFor(baseList, name, index, nameKey, newNames) {
  const items = list(baseList).filter((item) => item && typeof item === "object");
  const byName = items.find((item) => text(item[nameKey]) === name);
  if (byName) return byName;
  const sameSlot = items[index];
  return sameSlot && !newNames.has(text(sameSlot[nameKey])) ? sameSlot : {};
}

/**
 * 마크다운 → 구조화 PRD. base는 편집 전 문서로, 틀에 없는 필드를 보존하는 데 쓴다.
 * 돌려주는 unknownSections는 틀에 없는 ## 제목들이다(마크다운 원문에는 남는다).
 */
export function markdownToPrd(markdown, base = {}) {
  const doc = { ...(base && typeof base === "object" ? base : {}) };
  const unknownSections = [];
  const seen = new Set();

  splitSections(markdown).forEach((section) => {
    const key = section.title === null ? "projectOverview" : TITLE_TO_KEY[section.title];
    if (!key) { unknownSections.push(section.title); return; }
    seen.add(key);
    const blocks = readBlocks(section.lines);

    if (key === "projectOverview" || key === "background") {
      doc[key] = blocks.text || blocks.items.map((item) => item.text).join("\n");
    } else if (key === "goals") {
      doc.goals = blocks.items.filter((item) => item.depth === 0).map((item) => item.text.trim());
    } else if (key === "kpi") {
      const rows = [];
      const names = new Set(blocks.items.filter((item) => item.depth === 0).map((item) => labelled(item.text)[0] ?? strip(item.text)));
      blocks.items.forEach((item) => {
        if (item.depth === 0) {
          const [metric, target] = labelled(item.text);
          const original = baseFor(base?.kpi, metric ?? strip(item.text), rows.length, "metric", names);
          rows.push({ ...original, metric: metric ?? strip(item.text), target: metric ? target : "" });
        } else if (rows.length) {
          const [label, value] = labelled(item.text);
          const field = KPI_FIELDS.find(([, name]) => name === label)?.[0];
          if (field) rows[rows.length - 1][field] = value;
        }
      });
      doc.kpi = rows;
    } else if (key === "coreFeatures") {
      const parts = splitSubsections(section.lines).filter((part) => part.title);
      const featureHeading = (title) => /^(.*?)(?:\s+`([^`]+)`)?$/.exec(title);
      const names = new Set(parts.map((part) => featureHeading(part.title)[1].trim()));
      doc.coreFeatures = parts.map((part, index) => {
        const heading = featureHeading(part.title);
        const name = heading[1].trim();
        const body = readBlocks(part.lines);
        const original = baseFor(base?.coreFeatures, name, index, "name", names);
        return { ...original, name, ...(heading[2] ? { priority: heading[2] } : {}), description: body.text, requirements: body.items.filter((item) => item.depth === 0).map((item) => item.text.trim()) };
      });
    } else if (key === "userPersonas") {
      const parts = splitSubsections(section.lines).filter((part) => part.title);
      const personaHeading = (title) => /^(.*?)(?:\s+\(([^,()]*)(?:,\s*([^()]*))?\))?$/.exec(title);
      const names = new Set(parts.map((part) => personaHeading(part.title)[1].trim()));
      doc.userPersonas = parts.map((part, index) => {
        const heading = personaHeading(part.title);
        const name = heading[1].trim();
        const original = baseFor(base?.userPersonas, name, index, "name", names);
        const persona = { ...original, name };
        if (heading[2] !== undefined) {
          const age = heading[2].trim();
          persona.age = typeof original.age === "number" && /^\d+$/.test(age) ? Number(age) : age;
        }
        if (heading[3] !== undefined) persona.job = heading[3].trim();
        readBlocks(part.lines).items.forEach((item) => {
          const [label, value] = labelled(item.text);
          const field = PERSONA_FIELDS.find(([, name]) => name === label)?.[0];
          if (field) persona[field] = value;
        });
        return persona;
      });
    } else if (key === "mvpScope") {
      const scope = { ...(base?.mvpScope && typeof base.mvpScope === "object" ? base.mvpScope : {}) };
      splitSubsections(section.lines).forEach((part) => {
        const body = readBlocks(part.lines);
        if (part.title === "포함") scope.included = body.items.map((item) => item.text.trim());
        else if (part.title === "제외") scope.excluded = body.items.map((item) => item.text.trim());
        else if (part.title === "근거" || part.title === null) { if (body.text) scope.rationale = body.text; }
      });
      doc.mvpScope = scope;
    } else if (key === "techStack") {
      const stack = {};
      readBlocks(section.lines).items.filter((item) => item.depth === 0).forEach((item) => {
        const [label, value] = labelled(item.text);
        if (label) stack[TECH_KEYS[label] ?? label] = value;
      });
      doc.techStack = stack;
    } else if (key === "releaseSchedule") {
      const parts = splitSubsections(section.lines).filter((part) => part.title);
      const releaseHeading = (title) => /^(.*?)(?:\s+\(([^()]*)\))?$/.exec(title);
      const names = new Set(parts.map((part) => releaseHeading(part.title)[1].trim()));
      doc.releaseSchedule = parts.map((part, index) => {
        const heading = releaseHeading(part.title);
        const milestone = heading[1].trim();
        const body = readBlocks(part.lines);
        const original = baseFor(base?.releaseSchedule, milestone, index, "milestone", names);
        return { ...original, milestone, ...(heading[2] !== undefined ? { date: heading[2].trim() } : {}), description: body.text, deliverables: body.items.filter((item) => item.depth === 0).map((item) => item.text.trim()) };
      });
    }
  });

  // 마크다운에서 통째로 지운 섹션은 문서에서도 비운다.
  SECTIONS.forEach(({ key }) => {
    if (seen.has(key) || !(key in doc)) return;
    if (Array.isArray(doc[key])) doc[key] = [];
    else if (doc[key] && typeof doc[key] === "object") doc[key] = key === "mvpScope" ? { included: [], excluded: [], rationale: "" } : {};
    else doc[key] = "";
  });

  return { doc, unknownSections };
}

/** 틀에 없는 ## 섹션을 원문 그대로 꺼낸다. 화면에 따로 보여 주고, 구조에서 마크다운을 다시 만들 때 뒤에 붙인다. */
export function extraSections(markdown) {
  return splitSections(markdown)
    .filter((section) => section.title !== null && !TITLE_TO_KEY[section.title])
    .map((section) => ({ title: section.title, markdown: `## ${section.title}\n${section.lines.join("\n")}`.trim() }));
}

/** 구조화 PRD에서 마크다운을 만들고, 이전 마크다운에 있던 틀 밖 섹션을 뒤에 이어 붙인다. */
export function prdToMarkdownWithExtras(doc, previousMarkdown) {
  const extras = extraSections(previousMarkdown).map((section) => section.markdown);
  return [prdToMarkdown(doc).trim(), ...extras].filter(Boolean).join("\n\n") + "\n";
}
