export function projectFeatures(project) {
  const list = project?.featureList;
  const detailed = project?.prdDocument?.coreFeatures;
  const source = Array.isArray(list) && list.length && typeof list[0] === "object"
    ? list : Array.isArray(detailed) && detailed.length ? detailed : Array.isArray(list) ? list : [];
  return source.filter(Boolean).map((item, index) => {
    const feature = typeof item === "string" ? { name:item } : item;
    const requirements = Array.isArray(feature.requirements) ? feature.requirements : feature.requirements ? [feature.requirements] : [];
    return { id:`feature-${index}`, name:feature.name || feature.title || `기능 ${index + 1}`, description:feature.description || "", requirements:requirements.map(r => typeof r === "string" ? r : r.text || r.description || r.name || "세부 조건 확인 필요") };
  });
}

export function featureScenarios(feature, index) {
  const conditions = feature.requirements.length ? feature.requirements : [feature.description || "기능 명세의 성공 조건을 구체화해 주세요."];
  const normal = conditions.map((requirement, i) => ({
    id:`TC-${index + 1}-${i + 1}`, type:"정상", title:`${feature.name} — 요구사항 ${i + 1}`,
    given:`${feature.name} 실행에 필요한 사용자 권한과 정상 테스트 데이터를 준비한다.`,
    when:`${feature.name}에서 다음 요구사항에 해당하는 동작을 수행한다: ${requirement}`,
    then:requirement,
  }));
  return [...normal,
    { id:`TC-${index + 1}-E`, type:"예외", title:`${feature.name} — 실패 상황`, given:"명세에 해당하는 잘못된 입력 또는 실패 조건을 준비한다. 구체적인 조건은 검토 후 확정한다.", when:`${feature.name}을 실패 조건으로 실행한다.`, then:"명세에 정의된 오류 안내와 복구 동작이 제공되고, 기존 데이터가 의도치 않게 변경되지 않는다." },
    { id:`TC-${index + 1}-B`, type:"경계", title:`${feature.name} — 경계 조건`, given:"입력 길이·허용 개수·빈 상태 등 적용 가능한 제한값을 명세에서 확인한다. 해당하지 않으면 제외한다.", when:`${feature.name}을 각 제한값의 직전·일치·초과 조건으로 실행한다.`, then:"허용 범위는 정상 처리되고 범위 밖의 조건은 명세에 따라 처리된다. 제한값이 없으면 먼저 정의한다." },
  ];
}
