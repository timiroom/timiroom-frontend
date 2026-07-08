import { NextResponse } from 'next/server';

// 메모리상에 세션별 진행 상태와 사용자 응답 저장
const sessionState = {};

export async function POST(request, { params }) {
  const { sessionId } = params;
  const body = await request.json();
  const userMessage = body.content || "";

  // 약간의 딜레이
  await new Promise((resolve) => setTimeout(resolve, 1500));

  if (!sessionState[sessionId]) {
    sessionState[sessionId] = { step: 1, answers: [] };
  }

  const state = sessionState[sessionId];
  
  // 사용자의 응답을 기록
  if (userMessage) {
    state.answers.push(userMessage);
  }

  if (state.step === 1) {
    state.step++;
    return NextResponse.json({
      message: `"${userMessage}" (이)라니 정말 멋진 아이디어네요! 이 서비스를 주로 모바일 앱으로 기획하실 건가요, 아니면 PC 기반의 웹 서비스로 기획하실 건가요?`,
      suggestions: ["모바일 앱", "반응형 웹", "PC 웹", "모바일 웹앱"],
      isComplete: false
    });
  }
  
  if (state.step === 2) {
    state.step++;
    return NextResponse.json({
      message: "플랫폼 방향이 정해졌군요. 그렇다면 이 서비스의 핵심 타겟 유저(페르소나)는 누구이며, 그들이 겪고 있는 가장 큰 불편함은 무엇인가요?",
      suggestions: ["바쁜 현대인의 시간 부족", "기존 서비스의 복잡한 사용성", "비용 부담 문제", "직접 입력할게요"],
      isComplete: false
    });
  }

  if (state.step === 3) {
    state.step++;
    return NextResponse.json({
      message: "타겟 유저와 문제점까지 명확하네요! 마지막으로 이 문제를 해결하기 위해 꼭 들어가야 할 핵심 기능(Must Have) 3가지만 말씀해 주시겠어요?",
      suggestions: ["회원가입/로그인, 결제, 알림", "검색, 필터링, 리뷰 작성", "실시간 채팅, 매칭, 푸시 알림", "기타"],
      isComplete: false
    });
  }

  // 4단계: 마지막 응답 후 프로젝트 완성
  // 사용자가 첫 번째로 입력한 문장을 프로젝트 이름으로 추출 (너무 길면 자름)
  const firstAnswer = state.answers[0] || "새로운 기획 아이디어";
  const projectName = firstAnswer.length > 15 ? firstAnswer.substring(0, 15) + "..." : firstAnswer;
  const platformAnswer = state.answers[1] || "";
  const platform = platformAnswer.includes("앱") ? "APP" : "WEB";

  return NextResponse.json({
    message: "완벽합니다! 제공해주신 정보를 바탕으로 프로젝트 기획과 파이프라인을 시작할 준비가 되었습니다. 잠시만 기다려주세요.",
    suggestions: [],
    isComplete: true,
    formData: {
      projectName: projectName,
      projectDescription: `사용자 입력 기반 기획:\n1. 아이디어: ${state.answers[0]}\n2. 플랫폼: ${state.answers[1]}\n3. 타겟: ${state.answers[2]}\n4. 핵심기능: ${state.answers[3]}`,
      platform: platform,
      techStack: ["Next.js", "Spring Boot", "PostgreSQL"],
    }
  });
}
