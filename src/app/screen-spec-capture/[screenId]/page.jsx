"use client";

import { useEffect } from "react";
import LandingPage from "@/app/page";
import DashboardPage from "@/app/dashboard/page";
import { MyPage } from "@/components/dashboard/MyPage";
import { WorkspaceInviteLanding } from "@/components/dashboard/invite/WorkspaceInviteLanding";
import { ProjectManagementView } from "@/components/project/ProjectManagementView";
import { useParams, useSearchParams } from "next/navigation";

const LANDING_SCREENS = new Set(["LAND-001", "LAND-002", "LAND-003"]);

export default function ScreenSpecCapturePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const screenId = params?.screenId;
  const scrollY = Number(searchParams.get("y") || 0);

  useEffect(() => {
    if (window.location.hash) return;

    const applyScroll = () => {
      document.documentElement.style.scrollBehavior = "auto";
      document.body.style.overflowAnchor = "none";
      window.scrollTo(0, scrollY);
      if (document.scrollingElement) {
        document.scrollingElement.scrollTop = scrollY;
      }

      document.querySelectorAll("main, section, div").forEach((element) => {
        if (element.scrollHeight > element.clientHeight + 24 && element.clientHeight > 240) {
          element.scrollTop = scrollY;
        }
      });
    };

    applyScroll();
    const firstTimer = window.setTimeout(applyScroll, 200);
    const secondTimer = window.setTimeout(applyScroll, 700);
    return () => {
      window.clearTimeout(firstTimer);
      window.clearTimeout(secondTimer);
    };
  }, [screenId, scrollY]);

  if (LANDING_SCREENS.has(screenId)) {
    return <LandingPage />;
  }

  if (screenId === "MY-001") {
    return <MyPage />;
  }

  if (screenId === "INV-001") {
    return <WorkspaceInviteLanding inviteCode="ALGN-82K" />;
  }

  if (screenId === "SET-001") {
    return <ProjectManagementView projectId="screen-spec-project" />;
  }

  return <DashboardPage />;
}
