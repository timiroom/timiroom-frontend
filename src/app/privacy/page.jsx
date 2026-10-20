import { LegalPage } from "@/components/legal/LegalPage";
import { SITE, value } from "@/lib/siteInfo";

export const metadata = { title: "개인정보처리방침 — Align-it" };

export default function PrivacyPage() {
  return (
    <LegalPage title="개인정보처리방침" current="/privacy">
      <p>{SITE.serviceName}(이하 &ldquo;서비스&rdquo;)는 개인정보 보호법에 따라 이용자의 개인정보를 아래와 같이 처리합니다.</p>

      <h2>1. 처리하는 개인정보</h2>
      <table className="legal__table">
        <thead><tr><th>구분</th><th>항목</th><th>목적</th></tr></thead>
        <tbody>
          <tr><td>가입·로그인</td><td>이메일, 이름, 프로필 사진, 로그인 제공자 식별값(Google·GitHub)</td><td>회원 식별, 로그인 유지</td></tr>
          <tr><td>서비스 이용</td><td>프로젝트 내용, 업로드한 파일, 만든 문서, AI 대화 내용, 연결한 GitHub 저장소·이슈·PR 정보</td><td>문서 생성과 정합성 검사 제공</td></tr>
          <tr><td>사용량</td><td>AI 기능별 사용 기록(토큰 수, 시각)</td><td>요금제 한도 관리, 비용 산정</td></tr>
          <tr><td>결제</td><td>카드사 이름과 카드 번호 끝 4자리, 결제 수단 식별값(빌링키, 암호화 저장), 결제·환불 기록</td><td>정기결제, 추가 사용량 결제, 환불</td></tr>
          <tr><td>내 AI 키</td><td>이용자가 등록한 AI 서비스 키(암호화 저장)</td><td>이용자 키로 AI 기능 호출</td></tr>
          <tr><td>자동 수집</td><td>접속 기록, 세션 쿠키, IP 주소</td><td>로그인 유지, 부정 이용 방지</td></tr>
        </tbody>
      </table>
      <p>카드 번호 전체와 유효기간은 서비스가 받지 않으며, 결제대행사가 처리합니다.</p>

      <h2>2. 보유 기간</h2>
      <p>탈퇴하면 지체 없이 지웁니다. 다만 법령에 따라 아래 정보는 정해진 기간 보관합니다.</p>
      <ul>
        <li>계약·청약철회, 대금 결제와 재화 공급 기록: 5년(전자상거래법)</li>
        <li>소비자 불만·분쟁 처리 기록: 3년(전자상거래법)</li>
        <li>접속 기록: 3개월(통신비밀보호법)</li>
      </ul>

      <h2>3. 처리 위탁</h2>
      <table className="legal__table">
        <thead><tr><th>받는 곳</th><th>위탁 업무</th></tr></thead>
        <tbody>
          <tr><td>코리아포트원(PortOne) 및 카드사·결제대행사(PG)</td><td>카드 등록, 결제, 결제 취소</td></tr>
          <tr><td>메일 발송 서비스</td><td>결제·사용량 알림 메일 발송</td></tr>
          <tr><td>업스테이지(Upstage)</td><td>문서 검색을 위한 문장 변환(임베딩)</td></tr>
        </tbody>
      </table>

      <h2>4. 국외 이전</h2>
      <p>AI 기능을 제공하려고 이용자가 입력한 내용(요구사항, 문서, 대화, 코드 변경 내용)을 아래 AI 서비스에 보냅니다. 보낸 내용은 응답을 만드는 데에만 쓰이며, 각 서비스의 정책에 따라 처리됩니다.</p>
      <table className="legal__table">
        <thead><tr><th>받는 곳(국가)</th><th>항목</th><th>시기와 방법</th></tr></thead>
        <tbody>
          <tr><td>OpenAI(미국)</td><td>AI 기능에 입력한 내용</td><td>기능을 쓸 때마다 암호화된 통신으로 전송</td></tr>
          <tr><td>Cohere(캐나다·미국)</td><td>문서 검색에 쓰는 문장</td><td>문서 검색 시 전송</td></tr>
          <tr><td>FriendliAI(미국·대한민국)</td><td>정합성 검사에 입력한 내용</td><td>검사 시 전송</td></tr>
        </tbody>
      </table>
      <p>이용자가 내 AI 키를 등록한 경우에는 이용자가 고른 AI 서비스로 직접 보내집니다. 국외 이전을 원하지 않으면 AI 기능을 쓰지 않거나 탈퇴할 수 있으며, 이 경우 서비스의 핵심 기능을 쓸 수 없습니다.</p>

      <h2>5. 이용자의 권리</h2>
      <p>이용자는 언제든 자신의 개인정보를 보거나 고치거나 지우도록 요청할 수 있고, 처리를 멈추도록 요청할 수 있습니다. 설정에서 직접 하거나 아래 연락처로 요청하면 지체 없이 처리합니다.</p>

      <h2>6. 안전 조치</h2>
      <ul>
        <li>결제 수단 식별값과 AI 키는 AES-256으로 암호화해 저장합니다.</li>
        <li>모든 통신은 HTTPS로 암호화합니다.</li>
        <li>개인정보에 접근할 수 있는 사람을 최소한으로 둡니다.</li>
      </ul>

      <h2>7. 쿠키</h2>
      <p>로그인을 유지하려고 세션 쿠키를 씁니다. 브라우저 설정에서 쿠키를 막을 수 있지만, 그러면 로그인이 필요한 기능을 쓸 수 없습니다.</p>

      <h2>8. 개인정보 보호책임자</h2>
      <p>책임자: {value(SITE.privacyOfficer)} · 연락처: {value(SITE.contactEmail)}</p>
      <p>개인정보 침해 신고·상담은 개인정보침해신고센터(국번 없이 118), 개인정보분쟁조정위원회(1833-6972)에도 할 수 있습니다.</p>

      <h2>9. 방침의 변경</h2>
      <p>이 방침을 바꾸면 시행 7일 전에 서비스 화면으로 알립니다.</p>
    </LegalPage>
  );
}
