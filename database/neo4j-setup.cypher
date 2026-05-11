// ================================================================
// Align-it  Neo4j 초기 설정
// ================================================================
// 적용 방법:
//   1. docker compose up -d 후 http://localhost:7474 접속
//   2. Connect URL: bolt://localhost:7687
//      Username: neo4j  /  Password: alignit1234
//   3. 이 파일 내용을 Browser의 쿼리창에 붙여넣고 실행
//
// 역할:
//   PostgreSQL이 각 산출물(feature, api, erd)의 상세 데이터를 저장하면,
//   Neo4j는 이들 간의 '연결 관계'와 '정합성 경로'를 그래프로 저장합니다.
//   QA Agent가 정합성 경로를 추적하거나 워크플로우 시각화에 사용됩니다.
// ================================================================

// ── 제약조건 (Constraints) ──────────────────────────────────────

// 각 노드는 PostgreSQL의 PK(id)와 project_id를 함께 가짐
CREATE CONSTRAINT con_feature_id   IF NOT EXISTS FOR (f:Feature)    REQUIRE f.featureId   IS UNIQUE;
CREATE CONSTRAINT con_api_id       IF NOT EXISTS FOR (a:ApiSpec)    REQUIRE a.apiSpecId   IS UNIQUE;
CREATE CONSTRAINT con_erd_id       IF NOT EXISTS FOR (e:ErdEntity)  REQUIRE e.entityId    IS UNIQUE;
CREATE CONSTRAINT con_prd_id       IF NOT EXISTS FOR (p:PrdDoc)     REQUIRE p.prdDocId    IS UNIQUE;
CREATE CONSTRAINT con_project_id   IF NOT EXISTS FOR (j:Project)    REQUIRE j.projectId   IS UNIQUE;

// ── 인덱스 (Indexes) ───────────────────────────────────────────

CREATE INDEX idx_feature_project   IF NOT EXISTS FOR (f:Feature)   ON (f.projectId);
CREATE INDEX idx_api_project       IF NOT EXISTS FOR (a:ApiSpec)   ON (a.projectId);
CREATE INDEX idx_erd_project       IF NOT EXISTS FOR (e:ErdEntity) ON (e.projectId);

// ── 노드 구조 예시 (실제 데이터는 Spring Data Neo4j가 삽입) ────

// (:Project {projectId, name, status})
//
// (:Feature {
//    featureId,   -- PostgreSQL features.id
//    projectId,
//    name,
//    priority,    -- must|should|could|wont
//    status       -- proposed|accepted|rejected
// })
//
// (:ApiSpec {
//    apiSpecId,   -- PostgreSQL api_specs.id
//    projectId,
//    method,      -- GET|POST|PUT|PATCH|DELETE
//    path,
//    summary
// })
//
// (:ErdEntity {
//    entityId,    -- PostgreSQL erd_entities.id
//    projectId,
//    entityName,
//    tableName
// })
//
// (:PrdDoc {
//    prdDocId,    -- PostgreSQL prd_documents.id
//    projectId,
//    version,
//    isCurrent
// })

// ── 관계 타입 정의 (방향: 소스 → 타겟) ────────────────────────
//
// (Feature)-[:IMPLEMENTS]->(ApiSpec)
//    기능이 어떤 API로 구현되는지
//
// (ApiSpec)-[:USES]->(ErdEntity)
//    API가 어떤 DB 엔티티에 접근하는지
//
// (Feature)-[:STORES]->(ErdEntity)
//    기능이 어떤 DB 엔티티에 데이터를 저장하는지
//
// (ErdEntity)-[:RELATES_TO {type: "one_to_many"}]->(ErdEntity)
//    ERD 내 엔티티 간 관계
//
// (PrdDoc)-[:GENERATES]->(Feature)
//    PRD에서 추출된 기능
//
// (PrdDoc)-[:GENERATES]->(ApiSpec)
//    PRD에서 생성된 API 명세
//
// (PrdDoc)-[:GENERATES]->(ErdEntity)
//    PRD에서 생성된 ERD 엔티티

// ── 워크플로우 정합성 검증 쿼리 예시 ──────────────────────────

// 특정 프로젝트의 모든 기능-API 연결 조회
// MATCH (f:Feature {projectId: $projectId})-[:IMPLEMENTS]->(a:ApiSpec)
// RETURN f.name AS feature, a.method AS method, a.path AS path

// API와 연결되지 않은 고아 기능 찾기 (정합성 이슈 탐지)
// MATCH (f:Feature {projectId: $projectId})
// WHERE NOT (f)-[:IMPLEMENTS]->(:ApiSpec)
// RETURN f.name AS orphanFeature, f.priority

// 특정 ERD 엔티티를 참조하는 모든 API 조회
// MATCH (a:ApiSpec)-[:USES]->(e:ErdEntity {entityId: $entityId})
// RETURN a.method, a.path

// 전체 프로젝트 워크플로우 그래프 (시각화용)
// MATCH p = (f:Feature {projectId: $projectId})-[*1..3]->(e:ErdEntity)
// RETURN p LIMIT 100
