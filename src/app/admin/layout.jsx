import { AdminView } from "@/components/admin/AdminView";

export const metadata = {
  title: "관리자 — Align-it",
};

/** 관리자 화면 틀(상단 바·왼쪽 메뉴)을 한 번만 두고, 하위 주소가 바뀌어도 그대로 유지한다(설정 화면과 같다). */
export default function AdminLayout() {
  return <AdminView />;
}
