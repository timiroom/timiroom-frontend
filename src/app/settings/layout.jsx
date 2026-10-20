import { SettingsView } from "@/components/settings/SettingsView";

export const metadata = {
  title: "설정 — Align-it",
};

/** 설정 화면 틀(상단 바·왼쪽 메뉴)은 여기 한 번만 두고, 하위 주소가 바뀌어도 그대로 유지한다. */
export default function SettingsLayout() {
  return <SettingsView />;
}
