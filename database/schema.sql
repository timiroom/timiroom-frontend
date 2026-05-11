-- ================================================================
-- Align-it  PostgreSQL Schema
-- ================================================================
-- 적용 방법:
--   docker compose up -d  →  자동 적용
--   또는 수동: psql -U alignit -d alignit -f schema.sql
-- ================================================================

-- 확장
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- 텍스트 유사도 검색

-- ──────────────────────────────────────────────────────────────
-- ENUM 타입 정의
-- ──────────────────────────────────────────────────────────────

CREATE TYPE oauth_provider_type     AS ENUM ('google', 'github');
CREATE TYPE project_status_type     AS ENUM ('draft', 'active', 'completed', 'archived');
CREATE TYPE member_role_type        AS ENUM ('owner', 'editor', 'viewer');
CREATE TYPE message_role_type       AS ENUM ('user', 'assistant');
CREATE TYPE pipeline_status_type    AS ENUM ('pending', 'running', 'completed', 'failed');
CREATE TYPE agent_type_enum         AS ENUM ('search', 'pm', 'prd', 'api', 'db', 'qa');
CREATE TYPE search_category_type    AS ENUM ('market_size', 'competitors', 'trends', 'target_users', 'regulations');
CREATE TYPE http_method_type        AS ENUM ('GET', 'POST', 'PUT', 'PATCH', 'DELETE');
CREATE TYPE artifact_status_type    AS ENUM ('proposed', 'accepted', 'rejected');
CREATE TYPE moscow_type             AS ENUM ('must', 'should', 'could', 'wont');
CREATE TYPE relation_type_enum      AS ENUM ('one_to_one', 'one_to_many', 'many_to_many');
CREATE TYPE qa_severity_type        AS ENUM ('critical', 'major', 'minor', 'info');
CREATE TYPE workflow_node_type      AS ENUM ('feature', 'api_spec', 'erd_entity', 'prd_document');
CREATE TYPE connection_label_type   AS ENUM ('implements', 'uses', 'stores', 'validates', 'generates');

-- ──────────────────────────────────────────────────────────────
-- 1. users
-- ──────────────────────────────────────────────────────────────
CREATE TABLE users (
  id                BIGSERIAL       PRIMARY KEY,
  email             VARCHAR(255)    NOT NULL UNIQUE,
  name              VARCHAR(100),
  profile_image_url VARCHAR(512),
  oauth_provider    oauth_provider_type NOT NULL,
  oauth_id          VARCHAR(255)    NOT NULL,
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_users_oauth UNIQUE (oauth_provider, oauth_id)
);

COMMENT ON TABLE  users                IS '소셜 로그인 사용자';
COMMENT ON COLUMN users.oauth_provider IS 'google | github';

-- ──────────────────────────────────────────────────────────────
-- 2. projects
-- ──────────────────────────────────────────────────────────────
CREATE TABLE projects (
  id                BIGSERIAL       PRIMARY KEY,
  owner_id          BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name              VARCHAR(200)    NOT NULL,
  description       TEXT,
  status            project_status_type NOT NULL DEFAULT 'draft',
  color             VARCHAR(7)      NOT NULL DEFAULT '#7C3AED',
  consistency_score SMALLINT        NOT NULL DEFAULT 0 CHECK (consistency_score BETWEEN 0 AND 100),
  progress          SMALLINT        NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_status ON projects(status);

COMMENT ON TABLE projects IS '사용자가 소유하는 개발 프로젝트';

-- ──────────────────────────────────────────────────────────────
-- 3. project_members  (프로젝트 멤버 + 역할)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE project_members (
  id          BIGSERIAL       PRIMARY KEY,
  project_id  BIGINT          NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     BIGINT          NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  role        member_role_type NOT NULL DEFAULT 'viewer',
  invited_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,

  CONSTRAINT uq_project_members UNIQUE (project_id, user_id)
);

CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user    ON project_members(user_id);

COMMENT ON COLUMN project_members.accepted_at IS 'NULL이면 초대 대기 상태';

-- ──────────────────────────────────────────────────────────────
-- 4. conversations  (AI 대화 세션)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE conversations (
  id          BIGSERIAL    PRIMARY KEY,
  project_id  BIGINT       NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     BIGINT       NOT NULL REFERENCES users(id),
  title       VARCHAR(200),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_project ON conversations(project_id);

-- ──────────────────────────────────────────────────────────────
-- 5. messages
-- ──────────────────────────────────────────────────────────────
CREATE TABLE messages (
  id                BIGSERIAL         PRIMARY KEY,
  conversation_id   BIGINT            NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role              message_role_type NOT NULL,
  content           TEXT              NOT NULL,
  created_at        TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);

-- ──────────────────────────────────────────────────────────────
-- 6. ai_suggestions  (Claude 스타일 선택지 카드)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE ai_suggestions (
  id                  BIGSERIAL    PRIMARY KEY,
  message_id          BIGINT       NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  suggestion_type     VARCHAR(50),                   -- 'feature_list' | 'architecture' | 'tech_stack' 등
  options             JSONB        NOT NULL,          -- [{ "label": "...", "description": "..." }]
  selected_index      SMALLINT,                      -- NULL = 미선택
  selected_at         TIMESTAMPTZ
);

COMMENT ON COLUMN ai_suggestions.options        IS '[{label, description, ...}] 선택지 배열';
COMMENT ON COLUMN ai_suggestions.selected_index IS 'NULL이면 아직 선택 전';

-- ──────────────────────────────────────────────────────────────
-- 7. pipeline_runs  (파이프라인 실행 단위)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE pipeline_runs (
  id            BIGSERIAL            PRIMARY KEY,
  project_id    BIGINT               NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  triggered_by  BIGINT               NOT NULL REFERENCES users(id),
  status        pipeline_status_type NOT NULL DEFAULT 'pending',
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pipeline_runs_project ON pipeline_runs(project_id);

-- ──────────────────────────────────────────────────────────────
-- 8. pipeline_steps  (에이전트별 단계)
--    Search·PM·PRD·API·DB·QA — 병렬 실행 시 각 row가 독립적으로 status 업데이트
-- ──────────────────────────────────────────────────────────────
CREATE TABLE pipeline_steps (
  id            BIGSERIAL            PRIMARY KEY,
  run_id        BIGINT               NOT NULL REFERENCES pipeline_runs(id) ON DELETE CASCADE,
  agent_type    agent_type_enum      NOT NULL,
  status        pipeline_status_type NOT NULL DEFAULT 'pending',
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  error_message TEXT,

  CONSTRAINT uq_pipeline_step UNIQUE (run_id, agent_type)
);

CREATE INDEX idx_pipeline_steps_run ON pipeline_steps(run_id);

-- ──────────────────────────────────────────────────────────────
-- 9. search_reports  (Search Agent — 5개 카테고리 병렬 수집)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE search_reports (
  id          BIGSERIAL             PRIMARY KEY,
  step_id     BIGINT                NOT NULL REFERENCES pipeline_steps(id) ON DELETE CASCADE,
  category    search_category_type  NOT NULL,
  title       VARCHAR(200),
  content     TEXT,
  source_urls JSONB,                              -- ["https://...", ...]
  created_at  TIMESTAMPTZ           NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN search_reports.category IS 'market_size|competitors|trends|target_users|regulations';

-- ──────────────────────────────────────────────────────────────
-- 10. prd_documents  (PRD Agent — 버전 관리)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE prd_documents (
  id          BIGSERIAL    PRIMARY KEY,
  project_id  BIGINT       NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  run_id      BIGINT       REFERENCES pipeline_runs(id),
  version     INT          NOT NULL DEFAULT 1,
  title       VARCHAR(200),
  content     TEXT,                  -- Markdown
  is_current  BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prd_project_current ON prd_documents(project_id, is_current);

-- 현재 버전은 프로젝트당 1개만 허용
CREATE UNIQUE INDEX uq_prd_current ON prd_documents(project_id) WHERE is_current = TRUE;

-- ──────────────────────────────────────────────────────────────
-- 11. features  (PM Agent — 기능 목록)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE features (
  id          BIGSERIAL           PRIMARY KEY,
  project_id  BIGINT              NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  run_id      BIGINT              REFERENCES pipeline_runs(id),
  name        VARCHAR(200)        NOT NULL,
  description TEXT,
  priority    moscow_type         NOT NULL DEFAULT 'should',
  category    VARCHAR(100),                -- 'auth' | 'payment' | 'notification' 등
  status      artifact_status_type NOT NULL DEFAULT 'proposed',
  created_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_features_project ON features(project_id);

-- ──────────────────────────────────────────────────────────────
-- 12. api_specs  (API Agent)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE api_specs (
  id              BIGSERIAL           PRIMARY KEY,
  project_id      BIGINT              NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  run_id          BIGINT              REFERENCES pipeline_runs(id),
  method          http_method_type    NOT NULL,
  path            VARCHAR(500)        NOT NULL,
  summary         VARCHAR(200),
  description     TEXT,
  request_body    JSONB,
  response_schema JSONB,
  auth_required   BOOLEAN             NOT NULL DEFAULT TRUE,
  status          artifact_status_type NOT NULL DEFAULT 'proposed',
  created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_specs_project ON api_specs(project_id);

-- ──────────────────────────────────────────────────────────────
-- 13. erd_entities  (DB Agent)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE erd_entities (
  id           BIGSERIAL           PRIMARY KEY,
  project_id   BIGINT              NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  run_id       BIGINT              REFERENCES pipeline_runs(id),
  entity_name  VARCHAR(100)        NOT NULL,
  table_name   VARCHAR(100),
  description  TEXT,
  columns      JSONB,              -- [{name, type, nullable, isPk, isFk, references}]
  status       artifact_status_type NOT NULL DEFAULT 'proposed',
  created_at   TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_erd_entities_project ON erd_entities(project_id);

COMMENT ON COLUMN erd_entities.columns IS '[{name, type, nullable, isPk, isFk, references}]';

-- ──────────────────────────────────────────────────────────────
-- 14. erd_relationships  (DB Agent — 엔티티 간 관계)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE erd_relationships (
  id                BIGSERIAL          PRIMARY KEY,
  project_id        BIGINT             NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  from_entity_id    BIGINT             NOT NULL REFERENCES erd_entities(id) ON DELETE CASCADE,
  to_entity_id      BIGINT             NOT NULL REFERENCES erd_entities(id) ON DELETE CASCADE,
  relationship_type relation_type_enum NOT NULL,
  from_column       VARCHAR(100),
  to_column         VARCHAR(100)
);

CREATE INDEX idx_erd_rel_project ON erd_relationships(project_id);

-- ──────────────────────────────────────────────────────────────
-- 15. qa_reports  (QA Agent)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE qa_reports (
  id                BIGSERIAL    PRIMARY KEY,
  project_id        BIGINT       NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  run_id            BIGINT       REFERENCES pipeline_runs(id),
  consistency_score SMALLINT     CHECK (consistency_score BETWEEN 0 AND 100),
  total_issues      INT          NOT NULL DEFAULT 0,
  critical_issues   INT          NOT NULL DEFAULT 0,
  summary           TEXT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────
-- 16. qa_issues  (QA Agent — 개별 이슈)
--     source/target 폴리모픽: feature | api_spec | erd_entity | prd_document
-- ──────────────────────────────────────────────────────────────
CREATE TABLE qa_issues (
  id           BIGSERIAL         PRIMARY KEY,
  report_id    BIGINT            NOT NULL REFERENCES qa_reports(id) ON DELETE CASCADE,
  severity     qa_severity_type  NOT NULL,
  issue_type   VARCHAR(100),               -- 'api_feature_mismatch' | 'erd_api_mismatch' 등
  description  TEXT              NOT NULL,
  source_type  workflow_node_type,
  source_id    BIGINT,
  target_type  workflow_node_type,
  target_id    BIGINT
);

CREATE INDEX idx_qa_issues_report   ON qa_issues(report_id);
CREATE INDEX idx_qa_issues_severity ON qa_issues(severity);

-- ──────────────────────────────────────────────────────────────
-- updated_at 자동 갱신 트리거
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
