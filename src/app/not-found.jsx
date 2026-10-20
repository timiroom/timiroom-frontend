import { ActionButton, StatusPage } from "@/components/ui";

export default function NotFound() {
  return (
    <StatusPage code="404" title="페이지를 찾을 수 없습니다" message="주소가 바뀌었거나 삭제된 페이지입니다. 링크를 다시 확인해 주세요.">
      <ActionButton variant="primary" href="/dashboard">대시보드로 가기</ActionButton>
      <ActionButton href="/">첫 화면</ActionButton>
    </StatusPage>
  );
}
