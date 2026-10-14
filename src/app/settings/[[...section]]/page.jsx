import { SettingsView } from "@/components/settings/SettingsView";

export const metadata = {
  title: "설정 — Align-it",
};

export default function SettingsPage({ params }) {
  return <SettingsView section={params.section ?? []} />;
}
