import { redirect } from "next/navigation";

// 마이페이지는 설정 > 프로필로 옮겼다. 예전 링크와 북마크를 위해 남겨 둔다.
export default function MyPageRedirect() {
  redirect("/settings/profile");
}
