"use client";

import React, { useState, useMemo, useEffect } from "react";

const branches = [
  { id: 'main', color: '#10b981', name: 'main (통합)' },
  { id: 'doc/prd', color: '#3b82f6', name: '기획서(PRD)' },
  { id: 'doc/erd', color: '#f59e0b', name: 'ERD 명세' },
  { id: 'doc/api', color: '#8b5cf6', name: 'API 명세' },
];

// 초기 데이터 (오래된 순서, 나중에 뒤집음)
const initialCommits = [
  { 
    id: 'c1', col: 0, branch: 'main', message: '프로젝트 초기 설정 및 명세서 베이스라인 생성', author: '심민식', avatar: 'https://i.pravatar.cc/150?u=sim', date: '07-01 10:00',
    details: {
      description: '초기 프로젝트 설정 및 요구사항 정의서 뼈대를 구성했습니다.',
      affectedDocs: ['전체 프로젝트 구조'],
      diffs: [{ doc: 'Project Init', content: `+ 프로젝트 레포지토리 생성\n+ 기본 디렉토리 구조 설정\n+ 빈 PRD, ERD, API 템플릿 추가` }]
    }
  },
  { 
    id: 'c2', col: 1, branch: 'doc/prd', message: '소셜 로그인 인증 요구사항 상세 작성', author: '하은현', avatar: 'https://i.pravatar.cc/150?u=ha', date: '07-02 11:30', parent: 'c1',
    details: {
      description: '카카오 및 네이버 소셜 로그인을 위한 기능 요구사항(FR)을 구체화했습니다.',
      affectedDocs: ['기능 명세서'],
      targetDocs: ['ERD 명세서', 'API 명세서'],
      diffs: [{ 
        doc: '기능 명세 (Auth)', 
        content: `  - 일반 이메일 회원가입 기능 제공\n+ - 카카오, 네이버 OAuth 2.0 기반 소셜 로그인 기능 연동 제공\n+ - 최초 소셜 로그인 시 자동으로 회원 정보 생성\n  - 비밀번호 분실 시 이메일 본인 인증 후 초기화` 
      }]
    }
  },
  { 
    id: 'c3', col: 2, branch: 'doc/erd', message: 'Users 테이블 및 OAuth 연동 컬럼 추가 설계', author: '임석현', avatar: 'https://i.pravatar.cc/150?u=lim', date: '07-03 14:00', parent: 'c1',
    details: {
      description: '소셜 로그인 인증 관리를 위해 users 테이블을 확장하고 oauth_providers 테이블을 추가했습니다.',
      affectedDocs: ['ERD 명세서'],
      diffs: [{ 
        doc: 'DB Schema (users)', 
        content: `  CREATE TABLE users (\n    id BIGINT PRIMARY KEY,\n    email VARCHAR(255) NOT NULL,\n-   password VARCHAR(255) NOT NULL,\n+   password VARCHAR(255) NULL,\n+   auth_provider VARCHAR(50) DEFAULT 'local',\n+   social_id VARCHAR(255) NULL,\n    created_at TIMESTAMP\n  );` 
      }]
    }
  },
  { 
    id: 'c4', col: 3, branch: 'doc/api', message: '/auth/login 엔드포인트 요청/응답 스펙 정의', author: '정용환', avatar: 'https://i.pravatar.cc/150?u=jung', date: '07-04 09:15', parent: 'c1',
    details: {
      description: '프론트엔드와 소셜 로그인 통신을 위한 엔드포인트를 정의했습니다.',
      affectedDocs: ['API 명세서'],
      diffs: [{ 
        doc: 'API Spec (Auth)', 
        content: `  POST /api/v1/auth/login\n  Request Body:\n  {\n-   "email": "string",\n-   "password": "string"\n+   "provider": "string (local|kakao|naver)",\n+   "token": "string (oauth access token)",\n+   "email": "string (optional)"\n  }` 
      }]
    }
  },
  { 
    id: 'c5', col: 0, branch: 'main', message: '기획 및 DB 설계안 승인 (PRD, ERD 병합)', author: '심민식', avatar: 'https://i.pravatar.cc/150?u=sim', date: '07-05 16:20', parent: 'c1', mergeSources: ['c2', 'c3'],
    details: {
      description: '요구사항 및 DB 설계안 검토를 완료하고 메인 스펙으로 병합했습니다.',
      affectedDocs: ['기능 명세서', 'ERD 명세서'],
      diffs: []
    }
  },
  { 
    id: 'c6', col: 3, branch: 'doc/api', message: 'API 명세서 에러 응답 코드(400, 401) 추가 보완', author: '이연호', avatar: 'https://i.pravatar.cc/150?u=lee', date: '07-06 10:00', parent: 'c4',
    details: {
      description: 'QA를 위해 소셜 인증 실패 시나리오 및 에러 응답 코드를 상세화했습니다.',
      affectedDocs: ['API 명세서'],
      diffs: [{ 
        doc: 'API Spec (Auth Error Codes)', 
        content: `+ 400 Bad Request: 유효하지 않은 OAuth 토큰\n+ 401 Unauthorized: 제공자 연동 실패 또는 탈퇴한 계정\n  500 Internal Server Error` 
      }]
    }
  },
  { 
    id: 'c7', col: 0, branch: 'main', message: 'API 스펙 확정 및 메인 통합 승인', author: '김민정', avatar: 'https://i.pravatar.cc/150?u=kim', date: '07-07 13:00', parent: 'c5', mergeSources: ['c6'],
    details: {
      description: '최종 API 명세를 프론트엔드 작업 스펙으로 확정하고 병합했습니다.',
      affectedDocs: ['API 명세서'],
      diffs: []
    }
  },
];

/* ── Diff 뷰어 컴포넌트 ── */
function DiffViewer({ code }) {
  return (
    <pre style={{ margin: 0, padding: 16, background: '#1e1e1e', borderRadius: 8, fontSize: 13, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", overflowX: 'auto', lineHeight: 1.6 }}>
      {code.split('\n').map((line, i) => {
        let color = '#d4d4d4';
        let bg = 'transparent';
        if (line.startsWith('+')) { color = '#4ade80'; bg = 'rgba(74, 222, 128, 0.1)'; }
        if (line.startsWith('-')) { color = '#f87171'; bg = 'rgba(248, 113, 113, 0.1)'; }
        return (
          <div key={i} style={{ color, backgroundColor: bg, padding: '0 8px', margin: '0 -8px', display: 'flex' }}>
            <span style={{ width: 20, flexShrink: 0, opacity: 0.5, userSelect: 'none' }}>{i+1}</span>
            <span style={{ whiteSpace: 'pre-wrap' }}>{line}</span>
          </div>
        )
      })}
    </pre>
  );
}

export default function BranchVisualization() {
  const [selectedCommit, setSelectedCommit] = useState(null);
  const [commits, setCommits] = useState(initialCommits);

  const ROW_HEIGHT = 80;
  const COL_WIDTH = 60;
  const NODE_RADIUS = 8;
  const X_OFFSET = 30;
  const Y_OFFSET = 40;

  // 최신 커밋이 상단(row: 0)에 오도록 계산
  // commits 배열은 원래 오래된 순서대로 저장되어 있다고 가정
  const totalCommits = commits.length;
  const commitsWithRow = commits.map((c, idx) => ({
    ...c,
    row: totalCommits - 1 - idx, // 역순 할당: 마지막 아이템이 row 0
  }));

  const totalHeight = (totalCommits) * ROW_HEIGHT;
  const totalWidth = 320;

  const getBranchColor = (branchId) => {
    const b = branches.find(b => b.id === branchId);
    return b ? b.color : '#9ca3af';
  };

  // 문서 수동 저장 시뮬레이션
  const simulateManualSave = () => {
    const now = new Date();
    const formattedDate = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const newCommit = {
      id: `c${Date.now()}`,
      col: 1, 
      branch: 'doc/prd',
      message: '[수동 저장] 휴대전화 본인인증 요구사항 추가',
      author: '심민식',
      avatar: 'https://i.pravatar.cc/150?u=sim',
      date: formattedDate + ' (수동)',
      parent: commits[commits.length - 1].id, // 이전 가장 최근 커밋에 연결 (임의)
      details: {
        description: 'PRD 문서가 수동으로 저장되었습니다. 이 변경으로 인해 API 명세와 ERD 명세의 검토 및 업데이트가 필요할 수 있습니다.',
        affectedDocs: ['기능 명세서 (PRD)'],
        targetDocs: ['API 명세서 (Auth)', 'ERD 명세서 (users)'], // 반영 대상 문서
        diffs: [{ 
          doc: '기능 명세서', 
          content: `  - 일반 이메일 회원가입\n  - 소셜 로그인 연동\n+ - 휴대전화 본인인증(KCB) 모듈 연동 추가\n+ - 인증번호 SMS 발송 및 검증 로직` 
        }]
      }
    };
    
    setCommits([...commits, newCommit]);
  };

  const drawPaths = useMemo(() => {
    const paths = [];

    commitsWithRow.forEach(commit => {
      // 1. Draw line from parent
      if (commit.parent) {
        const parent = commitsWithRow.find(c => c.id === commit.parent);
        if (parent) {
          const startX = parent.col * COL_WIDTH + X_OFFSET;
          const startY = parent.row * ROW_HEIGHT + Y_OFFSET;
          const endX = commit.col * COL_WIDTH + X_OFFSET;
          const endY = commit.row * ROW_HEIGHT + Y_OFFSET;

          // 역순 타임라인이므로 Y가 감소하는 방향(위로 올라감)
          const midYOffset = Math.abs(startY - endY) / 2;
          const pathD = `M ${startX} ${startY} C ${startX} ${startY - midYOffset}, ${endX} ${endY + midYOffset}, ${endX} ${endY}`;
          
          paths.push(
            <path 
              key={`path-${parent.id}-${commit.id}`}
              d={pathD}
              fill="none"
              stroke={getBranchColor(commit.branch)}
              strokeWidth="3"
            />
          );
        }
      }

      // 2. Draw merge lines
      if (commit.mergeSources) {
        commit.mergeSources.forEach(srcId => {
          const source = commitsWithRow.find(c => c.id === srcId);
          if (source) {
            const startX = source.col * COL_WIDTH + X_OFFSET;
            const startY = source.row * ROW_HEIGHT + Y_OFFSET;
            const endX = commit.col * COL_WIDTH + X_OFFSET;
            const endY = commit.row * ROW_HEIGHT + Y_OFFSET;

            const midYOffset = Math.abs(startY - endY) / 2;
            const pathD = `M ${startX} ${startY} C ${startX} ${startY - midYOffset}, ${endX} ${endY + midYOffset}, ${endX} ${endY}`;
            
            paths.push(
              <path 
                key={`merge-${source.id}-${commit.id}`}
                d={pathD}
                fill="none"
                stroke={getBranchColor(source.branch)}
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            );
          }
        });
      }
    });
    return paths;
  }, [commitsWithRow]);

  return (
    <div style={{ padding: '24px', background: '#fdfdfd', minHeight: '100%', borderRadius: '12px', position: 'relative' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1a1916', marginBottom: '8px' }}>작업 브랜치 시각화</h2>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>팀원들의 문서 수정 이력을 클릭하여 변경 사항(Diff)과 연관 문서를 상세히 확인하세요.</p>
          
          <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
            {branches.map(b => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: b.color }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#4b5563' }}>{b.name}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* 문서 수동 저장 시뮬레이션 버튼 */}
        <button 
          onClick={simulateManualSave}
          style={{ 
            padding: '10px 16px', background: '#1a1916', color: '#fff', 
            borderRadius: '10px', fontSize: '13px', fontWeight: '700', 
            border: 'none', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' 
          }}
        >
          + 현재 기획문서 수동 저장
        </button>
      </div>

      <div style={{ display: 'flex', position: 'relative' }}>
        {/* 왼쪽: SVG 라인 & 노드 (그래프 영역) */}
        <div style={{ position: 'relative', width: `${totalWidth}px`, height: `${totalHeight}px` }}>
          <svg width={totalWidth} height={totalHeight} style={{ position: 'absolute', top: 0, left: 0 }}>
            {branches.map((b, i) => (
              <line 
                key={`guide-${i}`}
                x1={i * COL_WIDTH + X_OFFSET} 
                y1={0} 
                x2={i * COL_WIDTH + X_OFFSET} 
                y2={totalHeight} 
                stroke="#f3f4f6" 
                strokeWidth="1" 
              />
            ))}
            
            {drawPaths}

            {commitsWithRow.map(commit => {
              const x = commit.col * COL_WIDTH + X_OFFSET;
              const y = commit.row * ROW_HEIGHT + Y_OFFSET;
              const color = getBranchColor(commit.branch);
              
              // 수동 저장된 새 커밋 하이라이트
              const isNewManual = commit.date.includes('수동');
              
              return (
                <g key={`node-group-${commit.id}`} onClick={() => setSelectedCommit(commit)} style={{ cursor: 'pointer' }}>
                  {isNewManual && (
                    <circle cx={x} cy={y} r={NODE_RADIUS + 4} fill={color} opacity="0.2" style={{ animation: "pulse 1.5s infinite" }} />
                  )}
                  <circle 
                    cx={x} 
                    cy={y} 
                    r={NODE_RADIUS} 
                    fill={color}
                    stroke="#ffffff"
                    strokeWidth="3"
                    style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.15))' }}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* 오른쪽: 커밋 정보 영역 (리스트) */}
        <div style={{ flex: 1, position: 'relative' }}>
          {commitsWithRow.map(commit => {
            const y = commit.row * ROW_HEIGHT;
            const isManual = commit.date.includes('수동');

            return (
              <div 
                key={`info-${commit.id}`}
                onClick={() => setSelectedCommit(commit)}
                style={{ 
                  position: 'absolute', 
                  top: y + 16, 
                  left: 0,
                  display: 'flex',
                  alignItems: 'center',
                  background: isManual ? '#f0fdf4' : '#ffffff',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: isManual ? '1px solid #4ade80' : '1px solid #f3f4f6',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  width: '100%',
                  maxWidth: '560px',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.05)';
                  e.currentTarget.style.borderColor = getBranchColor(commit.branch);
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
                  e.currentTarget.style.borderColor = isManual ? '#4ade80' : '#f3f4f6';
                }}
              >
                <img 
                  src={commit.avatar} 
                  alt={commit.author} 
                  style={{ width: 36, height: 36, borderRadius: '50%', marginRight: 12, border: '1px solid #eaeaea' }} 
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1916' }}>{commit.message}</span>
                    <span style={{ fontSize: 11, color: isManual ? '#16a34a' : '#9ca3af', fontWeight: isManual ? 700 : 400 }}>{commit.date}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>{commit.author}</span>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: getBranchColor(commit.branch),
                      background: `${getBranchColor(commit.branch)}15`,
                      padding: '2px 8px',
                      borderRadius: '12px',
                    }}>
                      {commit.branch}
                    </span>
                    {commit.mergeSources && (
                      <span style={{ fontSize: 10, color: '#8b5cf6', background: '#8b5cf615', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                        Merged
                      </span>
                    )}
                    {commit.details?.targetDocs && (
                      <span style={{ fontSize: 10, color: '#f59e0b', background: '#fef3c7', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                        반영 필요: {commit.details.targetDocs.length}건
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 상세 내용 모달창 */}
      {selectedCommit && (
        <div 
          onClick={() => setSelectedCommit(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{ width: 640, maxHeight: '85vh', background: '#ffffff', borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 50px rgba(0,0,0,0.3)' }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #eaeaea', background: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1a1916', marginBottom: 8 }}>{selectedCommit.message}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img src={selectedCommit.avatar} alt="author" style={{ width: 24, height: 24, borderRadius: '50%' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#4b5563' }}>{selectedCommit.author}</span>
                  <span style={{ fontSize: 13, color: '#9ca3af' }}>{selectedCommit.date}</span>
                </div>
              </div>
              <button onClick={() => setSelectedCommit(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, color: '#9ca3af', lineHeight: 1 }}>&times;</button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                {selectedCommit.details?.affectedDocs && (
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase' }}>변경된 문서</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {selectedCommit.details.affectedDocs.map(doc => (
                        <span key={doc} style={{ padding: '4px 10px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, fontWeight: 600, color: '#4b5563' }}>
                          📄 {doc}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedCommit.details?.targetDocs && (
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', marginBottom: 6, textTransform: 'uppercase' }}>반영 대상 문서 (영향도)</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {selectedCommit.details.targetDocs.map(doc => (
                        <span key={doc} style={{ padding: '4px 10px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 6, fontSize: 12, fontWeight: 600, color: '#d97706' }}>
                          ⚠️ {doc}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {selectedCommit.details?.description && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase' }}>Description</div>
                  <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6 }}>{selectedCommit.details.description}</p>
                </div>
              )}

              {selectedCommit.details?.diffs && selectedCommit.details.diffs.length > 0 ? (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase' }}>Changes</div>
                  {selectedCommit.details.diffs.map((diff, i) => (
                    <div key={i} style={{ marginBottom: 16, border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                      <div style={{ background: '#f9fafb', padding: '8px 12px', borderBottom: '1px solid #e5e7eb', fontSize: 12, fontWeight: 600, color: '#4b5563' }}>
                        {diff.doc}
                      </div>
                      <DiffViewer code={diff.content} />
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: 14 }}>
                  상세 변경 내역(Diff)이 없는 병합/초기화 커밋입니다.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
