// src/lib/techStack.mjs의 slug 목록을 읽어 simple-icons에서 로고 데이터를 뽑아
// src/lib/techLogos.mjs를 다시 만든다. simple-icons는 런타임 의존성이 아니라 저장하지 않고 설치한다.
//
//   npm install --no-save simple-icons@13
//   node scripts/gen-tech-logos.mjs
import { readFileSync, writeFileSync } from "node:fs";
import * as si from "simple-icons";

const src = new URL("../src/lib/techStack.mjs", import.meta.url);
const out = new URL("../src/lib/techLogos.mjs", import.meta.url);
// simple-icons는 package.json을 export하지 않아 패키지 위치에서 직접 읽는다.
const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.resolve("simple-icons")), "utf8"));
const bySlug = new Map(Object.values(si).filter((i) => i && i.slug).map((i) => [i.slug, i]));

const slugs = [...new Set([...readFileSync(src, "utf8").matchAll(/slug:\s*"([a-z0-9]+)"/g)].map((m) => m[1]))].sort();
const missing = slugs.filter((s) => !bySlug.has(s));
if (missing.length) {
  console.error("simple-icons에 없는 slug:", missing.join(", "));
  process.exit(1);
}

const lines = slugs.map((s) => {
  const i = bySlug.get(s);
  return `  ${JSON.stringify(s)}: { title: ${JSON.stringify(i.title)}, hex: "#${i.hex}", path: ${JSON.stringify(i.path)} },`;
});

const body = `/**
 * 기술 로고 데이터 — 생성 파일이라 직접 고치지 않는다.
 * 출처: simple-icons ${version} (CC0 1.0, https://github.com/simple-icons/simple-icons)
 * 로고는 각 회사의 상표다. 기술을 가리키는 용도로만 쓴다.
 * 새 기술은 techStack.mjs의 TECH_REGISTRY에 slug를 넣고 scripts/gen-tech-logos.mjs로 다시 만든다.
 */
export const TECH_LOGOS = {
${lines.join("\n")}
};
`;
writeFileSync(out, body);
console.log(`wrote ${slugs.length} logos, ${Buffer.byteLength(body)} bytes, simple-icons ${version}`);
