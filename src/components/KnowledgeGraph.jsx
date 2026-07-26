"use client";

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
});

const dummyData = {
  nodes: [
    // 키워드 (중심 노드)
    { id: '키워드: 인증(Auth)', group: 1, val: 30, color: '#f87171', type: 'keyword' },
    { id: '키워드: 워크스페이스', group: 1, val: 30, color: '#fbbf24', type: 'keyword' },
    { id: '키워드: 시각화', group: 1, val: 30, color: '#34d399', type: 'keyword' },
    
    // 기능명세
    { id: '기능: 소셜 로그인', group: 2, val: 18, color: '#fca5a5', type: 'doc', docType: 'PRD', isUpdated: true },
    { id: '기능: JWT 토큰 발급', group: 2, val: 15, color: '#fca5a5', type: 'doc', docType: 'PRD' },
    { id: '기능: 프로젝트 생성', group: 2, val: 20, color: '#fcd34d', type: 'doc', docType: 'PRD' },
    { id: '기능: 팀원 초대', group: 2, val: 15, color: '#fcd34d', type: 'doc', docType: 'PRD' },
    { id: '기능: 지식 그래프 렌더링', group: 2, val: 20, color: '#6ee7b7', type: 'doc', docType: 'PRD' },
    { id: '기능: 브랜치 타임라인', group: 2, val: 18, color: '#6ee7b7', type: 'doc', docType: 'PRD', isUpdated: true },

    // 연관 API 및 ERD
    { id: 'API: POST /auth/login', group: 3, val: 10, color: '#94a3b8', type: 'doc', docType: 'API', isUpdated: true },
    { id: 'API: POST /workspace/invite', group: 3, val: 10, color: '#94a3b8', type: 'doc', docType: 'API' },
    { id: 'ERD: users 테이블', group: 4, val: 12, color: '#c084fc', type: 'doc', docType: 'ERD', isUpdated: true },
    { id: 'ERD: oauth_providers 테이블', group: 4, val: 12, color: '#c084fc', type: 'doc', docType: 'ERD', isUpdated: true },
    { id: 'ERD: projects 테이블', group: 4, val: 12, color: '#c084fc', type: 'doc', docType: 'ERD' },
  ],
  links: [
    { source: '키워드: 인증(Auth)', target: '기능: 소셜 로그인', relationDesc: '소셜 로그인 기획 요구사항의 핵심 키워드' },
    { source: '키워드: 인증(Auth)', target: '기능: JWT 토큰 발급', relationDesc: '인증 세션 유지를 위한 토큰 관리 기능' },
    { source: '키워드: 워크스페이스', target: '기능: 프로젝트 생성', relationDesc: '워크스페이스 내 하위 프로젝트 생성 로직' },
    { source: '키워드: 워크스페이스', target: '기능: 팀원 초대', relationDesc: '워크스페이스 협업을 위한 초대 로직' },
    { source: '키워드: 시각화', target: '기능: 지식 그래프 렌더링', relationDesc: '문서 관계망 시각화 요구사항' },
    { source: '키워드: 시각화', target: '기능: 브랜치 타임라인', relationDesc: '작업 이력 타임라인 시각화 요구사항' },
    { source: '기능: 소셜 로그인', target: 'API: POST /auth/login', relationDesc: '소셜 로그인 처리를 위한 백엔드 엔드포인트' },
    { source: '기능: 소셜 로그인', target: 'ERD: users 테이블', relationDesc: '회원 기본 정보 저장을 위한 테이블 참조' },
    { source: '기능: 소셜 로그인', target: 'ERD: oauth_providers 테이블', relationDesc: '카카오/네이버 등 OAuth 공급자별 식별자 저장' },
    { source: '기능: 팀원 초대', target: 'API: POST /workspace/invite', relationDesc: '팀원 이메일 초대 이메일 발송 API' },
    { source: '기능: 프로젝트 생성', target: 'ERD: projects 테이블', relationDesc: '프로젝트 메타데이터 저장을 위한 테이블' },
    { source: 'API: POST /workspace/invite', target: 'ERD: users 테이블', relationDesc: '초대받은 사용자의 회원 존재 여부 검증' },
    { source: 'API: POST /workspace/invite', target: 'ERD: projects 테이블', relationDesc: '권한 검증 시 프로젝트 정보 참조' },
  ],
};

const KnowledgeGraph = () => {
  const fgRef = useRef();
  // 레이아웃이 2컬럼이 되므로 그래프 너비를 유동적으로 계산
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoverNode, setHoverNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const containerRef = useRef(null);

  const graphData = useMemo(() => {
    const data = { nodes: dummyData.nodes.map(n => ({...n})), links: dummyData.links.map(l => ({...l})) };
    data.nodes.forEach(node => {
      node.neighbors = [];
      node.links = [];
    });
    data.links.forEach(link => {
      const sourceNode = data.nodes.find(n => n.id === link.source) || link.source;
      const targetNode = data.nodes.find(n => n.id === link.target) || link.target;
      
      if (typeof sourceNode === 'object' && typeof targetNode === 'object') {
        // 이웃 노드와 어떤 관계로 연결되어 있는지 파악하기 위해 link도 함께 저장
        sourceNode.neighbors.push({ node: targetNode, link });
        targetNode.neighbors.push({ node: sourceNode, link });
        sourceNode.links.push(link);
        targetNode.links.push(link);
      }
    });
    return data;
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight || 600,
        });
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedNode]); // 사이드패널 렌더링 시 리사이즈 반영

  const handleNodeHover = useCallback((node) => {
    document.body.style.cursor = node ? 'pointer' : 'default';
    setHoverNode(node || null);
  }, []);

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
  }, []);

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', gap: 16 }}>
      
      {/* ── 좌측 그래프 캔버스 ── */}
      <div 
        ref={containerRef}
        style={{ 
          flex: 1,
          border: '1px solid #eaeaea', 
          borderRadius: '12px', 
          overflow: 'hidden',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
          backgroundColor: '#fdfdfd',
          position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 10, background: 'rgba(255,255,255,0.9)', padding: '8px 12px', borderRadius: 8, border: '1px solid #eaeaea', fontSize: 12, fontWeight: 600, color: '#4b5563', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}></span> 최근 수정 반영됨
          </div>
          <div style={{ color: '#9ca3af', fontSize: 11, fontWeight: 400 }}>노드를 클릭하여 연관 문서를 확인하세요.</div>
        </div>

        <ForceGraph2D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeLabel=""
          nodeAutoColorBy="group"
          linkDirectionalParticles={2}
          linkDirectionalParticleSpeed={d => 0.005}
          onNodeHover={handleNodeHover}
          onNodeClick={handleNodeClick}
          linkColor={link => {
            const isHovering = hoverNode && hoverNode.links && hoverNode.links.includes(link);
            const isSelected = selectedNode && selectedNode.links && selectedNode.links.includes(link);
            if (isHovering || isSelected) return 'rgba(0, 0, 0, 0.6)';
            if (!hoverNode && !selectedNode) return 'rgba(200, 200, 200, 0.6)';
            return 'rgba(200, 200, 200, 0.1)';
          }}
          linkWidth={link => {
            const isHovering = hoverNode && hoverNode.links && hoverNode.links.includes(link);
            const isSelected = selectedNode && selectedNode.links && selectedNode.links.includes(link);
            return (isHovering || isSelected) ? 2 : 1;
          }}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const isHovered = node === hoverNode;
            const isSelected = node === selectedNode;
            
            // 호버 또는 선택 상태에 따른 인접 노드 여부
            const isNeighborHover = hoverNode && hoverNode.neighbors && hoverNode.neighbors.some(n => n.node === node);
            const isNeighborSelect = selectedNode && selectedNode.neighbors && selectedNode.neighbors.some(n => n.node === node);
            
            const isFocused = isHovered || isSelected || isNeighborHover || isNeighborSelect;
            const hasFocusGroup = hoverNode || selectedNode;
            const isDimmed = hasFocusGroup && !isFocused;

            const label = node.id;
            const fontSize = (isHovered || isSelected ? 14 : 12) / globalScale;
            ctx.font = `${isHovered || isSelected ? 'bold ' : ''}${fontSize}px 'Pretendard', sans-serif`;
            const textWidth = ctx.measureText(label).width;
            const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.4);

            // 배경 박스 렌더링
            ctx.fillStyle = isDimmed ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.9)';
            ctx.beginPath();
            ctx.roundRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1], 4 / globalScale);
            ctx.fill();

            // 텍스트 렌더링
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = isDimmed ? 'rgba(200, 200, 200, 0.3)' : (node.color || '#333');
            ctx.fillText(label, node.x, node.y);

            // 선택 및 호버 테두리
            if (isHovered || isSelected) {
              ctx.strokeStyle = isSelected ? '#3b82f6' : 'rgba(0, 0, 0, 0.8)';
              ctx.lineWidth = (isSelected ? 2 : 1.5) / globalScale;
              ctx.stroke();
            }

            // [추가 구현 2번] 업데이트 반영 상태 표시 (초록색 점)
            if (node.isUpdated && !isDimmed) {
              ctx.beginPath();
              ctx.arc(node.x + bckgDimensions[0] / 2 - 2/globalScale, node.y - bckgDimensions[1] / 2 + 2/globalScale, 4 / globalScale, 0, 2 * Math.PI, false);
              ctx.fillStyle = '#10b981';
              ctx.fill();
              ctx.strokeStyle = '#fff';
              ctx.lineWidth = 1 / globalScale;
              ctx.stroke();
            }

            node.__bckgDimensions = bckgDimensions;
          }}
          nodePointerAreaPaint={(node, color, ctx) => {
            ctx.fillStyle = color;
            const bckgDimensions = node.__bckgDimensions;
            bckgDimensions && ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, ...bckgDimensions);
          }}
        />
      </div>

      {/* ── 우측 연관 문서 패널 ── */}
      {selectedNode && (
        <div style={{ 
          width: '320px', 
          background: '#ffffff', 
          borderRadius: '12px', 
          border: '1px solid #eaeaea', 
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #eaeaea', background: '#fafafa', position: 'relative' }}>
            <button 
              onClick={() => setSelectedNode(null)}
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#9ca3af' }}
            >&times;</button>
            <div style={{ fontSize: 11, fontWeight: 700, color: selectedNode.color, textTransform: 'uppercase', marginBottom: 4 }}>
              {selectedNode.type === 'keyword' ? '키워드 노드' : '문서 노드'}
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1a1916', margin: 0, lineHeight: 1.4 }}>
              {selectedNode.id.split(': ')[1] || selectedNode.id}
            </h3>
            {selectedNode.isUpdated && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 11, fontWeight: 700, color: '#10b981' }}>
                <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#10b981' }}></span> 최신 수정사항 반영됨
              </div>
            )}
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
            <h4 style={{ fontSize: 13, fontWeight: 800, color: '#4b5563', marginBottom: 12 }}>연결된 항목 ({selectedNode.neighbors.length})</h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {selectedNode.neighbors.map(({ node: neighbor, link }) => (
                <div key={neighbor.id} style={{ 
                  padding: '12px', 
                  borderRadius: '10px', 
                  border: '1px solid #f3f4f6', 
                  background: '#ffffff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  cursor: 'pointer',
                  transition: 'transform 0.1s'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                onClick={() => setSelectedNode(neighbor)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: neighbor.color, padding: '2px 8px', background: `${neighbor.color}15`, borderRadius: '12px' }}>
                      {neighbor.id.split(': ')[0]}
                    </div>
                    {neighbor.isUpdated && (
                      <span style={{ fontSize: 10, color: '#10b981', fontWeight: 800, background: '#10b98115', padding: '2px 6px', borderRadius: '4px' }}>업데이트됨</span>
                    )}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1916', marginBottom: 6 }}>
                    {neighbor.id.split(': ')[1] || neighbor.id}
                  </div>
                  
                  {link.relationDesc && (
                    <div style={{ 
                      fontSize: 12, 
                      color: '#6b7280', 
                      lineHeight: 1.5,
                      padding: '8px',
                      background: '#f9fafb',
                      borderRadius: '6px',
                      borderLeft: `2px solid ${neighbor.color}`
                    }}>
                      <strong style={{ color: '#4b5563' }}>연결 관계:</strong> {link.relationDesc}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {selectedNode.neighbors.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px 0', color: '#9ca3af', fontSize: 13 }}>
                연결된 항목이 없습니다.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeGraph;
