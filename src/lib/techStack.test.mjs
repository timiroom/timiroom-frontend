import assert from "node:assert/strict";
import test from "node:test";

import { TECH_LOGOS } from "./techLogos.mjs";
import { TECH_REGISTRY, detectTechs, isLightColor, summarizeTech, techStackCards } from "./techStack.mjs";

const names = (value) => detectTechs(value).map((t) => t.name);

// AI가 실제로 생성한 PRD(땡겨요)의 techStack 문장
const SAMPLE = {
  backend: "Node.js (NestJS)를 사용하여 마이크로서비스 기반의 확장 가능한 백엔드를 구축합니다. 이벤트 기반 아키텍처와 RESTful API를 통해 추천 엔진을 통합합니다.",
  frontend: "React Native를 채택하여 iOS 및 Android 모두에서 일관된 사용자 경험을 제공합니다. 크로스 플랫폼 개발을 통해 개발 시간을 절감합니다.",
  database: "PostgreSQL을 주 데이터베이스로 사용하여 주문 정보, 사용자 프로필, 결제 기록 등 정형 데이터의 무결성과 트랜잭션 안정성을 확보합니다. 동시에 리뷰나 메뉴 카탈로그와 같은 유동적인 콘텐츠에는 MongoDB를 병행 적용합니다.",
  cache: "Redis를 활용하여 자주 조회되는 메뉴 추천 결과, 사용자 세션 정보를 고속 캐싱합니다.",
  messageQueue: "Kafka를 도입하여 주문 생성, 배달원 할당, 리뷰 작성과 같은 이벤트들을 비동기로 처리합니다.",
  cdn: "AWS CloudFront CDN을 사용하여 정적 자산(앱 아이콘, 이미지 리소스)을 글로벌 엣지 네트워크에 배포합니다.",
};

test("generated techStack sentences resolve to the named technologies", () => {
  assert.deepEqual(names(SAMPLE.backend), ["Node.js", "NestJS"]);
  assert.deepEqual(names(SAMPLE.frontend), ["React Native"]);
  assert.deepEqual(names(SAMPLE.database), ["PostgreSQL", "MongoDB"]);
  assert.deepEqual(names(SAMPLE.cache), ["Redis"]);
  assert.deepEqual(names(SAMPLE.messageQueue), ["Kafka"]);
  assert.deepEqual(names(SAMPLE.cdn), ["AWS CloudFront"]);
});

test("overlapping names prefer the longer match", () => {
  assert.deepEqual(names("JavaScript와 TypeScript"), ["JavaScript", "TypeScript"]);
  assert.deepEqual(names("Java 17과 Spring Boot"), ["Java", "Spring Boot"]);
  assert.deepEqual(names("Google Cloud Run에 배포"), ["Google Cloud"]);
  assert.deepEqual(names("Go와 Gin으로 작성"), ["Go"]);
  assert.deepEqual(names("Next.js와 React"), ["Next.js", "React"]);
});

test("korean particles attached to names still match", () => {
  assert.deepEqual(names("MySQL을 쓰고 Redis로 캐싱"), ["MySQL", "Redis"]);
});

test("same logo is shown once and at most three technologies", () => {
  assert.deepEqual(names("AWS 위에 AWS Lambda, Docker, Kubernetes, Nginx"), ["AWS", "AWS Lambda", "Docker"]);
});

test("unknown technology yields no logo but keeps the category", () => {
  const [card] = techStackCards({ cache: "Memcached로 세션을 캐싱합니다." });
  assert.equal(card.title, "Memcached");
  assert.equal(card.techs[0].slug, null);
  assert.equal(card.icon, "zap");
  assert.equal(card.label, "캐시");

  const [none] = techStackCards({ backend: "아직 정하지 않았습니다." });
  assert.deepEqual(none.techs, []);
  assert.equal(none.title, "백엔드");
});

test("summary keeps the first sentence and drops the tech lead-in", () => {
  assert.equal(summarizeTech(SAMPLE.backend), "마이크로서비스 기반의 확장 가능한 백엔드를 구축합니다.");
  assert.equal(summarizeTech(SAMPLE.database), "주문 정보, 사용자 프로필, 결제 기록 등 정형 데이터의 무결성과 트랜잭션 안정성을 확보합니다.");
  assert.equal(summarizeTech(SAMPLE.cache), "자주 조회되는 메뉴 추천 결과, 사용자 세션 정보를 고속 캐싱합니다.");
});

test("summary keeps a lead-in that names no technology", () => {
  const text = "주문 데이터를 활용해 추천 정확도를 높입니다.";
  assert.equal(summarizeTech(text), text);
});

test("category keys are matched regardless of case or separators", () => {
  const cards = techStackCards({ MESSAGEQUEUE: "Kafka", message_queue: "RabbitMQ", Backend: "Django" });
  assert.deepEqual(cards.map((c) => c.label), ["메시지 큐", "메시지 큐", "백엔드"]);
});

test("non-string values are read as text", () => {
  const [card] = techStackCards({ database: ["PostgreSQL", "Redis"] });
  assert.deepEqual(card.techs.map((t) => t.name), ["PostgreSQL", "Redis"]);
});

test("every registered slug has logo data", () => {
  const missing = TECH_REGISTRY.filter((t) => t.slug && !TECH_LOGOS[t.slug]).map((t) => t.slug);
  assert.deepEqual(missing, []);
});

test("light brand colors are detected for dark tiles", () => {
  assert.equal(isLightColor(TECH_LOGOS.javascript.hex), true);
  assert.equal(isLightColor(TECH_LOGOS.nodedotjs.hex), false);
  assert.equal(isLightColor(TECH_LOGOS.nextdotjs.hex), false);
});
