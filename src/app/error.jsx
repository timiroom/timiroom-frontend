"use client";

import { useEffect } from "react";
import { ActionButton, StatusPage } from "@/components/ui";

// 화면을 그리다 오류가 나면 Next.js 기본 오류 화면 대신 이 안내를 보여 준다.
export default function ErrorPage({ error, reset }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <StatusPage title="화면을 불러오지 못했습니다" message="잠시 후 다시 시도해 주세요. 계속되면 새로고침하거나 대시보드로 돌아가 주세요.">
      <ActionButton variant="primary" onClick={reset}>다시 시도</ActionButton>
      <ActionButton href="/dashboard">대시보드로 가기</ActionButton>
    </StatusPage>
  );
}
