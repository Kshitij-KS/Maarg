"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import {
  OrganizationDashboard,
  OrganizationDashboardError,
  OrganizationDashboardSkeleton,
} from "@/components/portal/organization-dashboard";
import { clearPortalSession, getCurrentPortalUser, getDashboard, logout } from "@/lib/portal-client";

function isAuthError(e: unknown): boolean {
  const s = String(e);
  return (
    /\b401\b/.test(s) ||
    /unauthoriz/i.test(s) ||
    /missing bearer|not authenticated|session has expired|session is not active|inactive/i.test(s)
  );
}

export default function PortalDashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const dashboardQ = useQuery({ queryKey: ["portal-dashboard"], queryFn: getDashboard, retry: 1 });
  const meQ = useQuery({ queryKey: ["portal-me"], queryFn: getCurrentPortalUser, retry: 1 });

  const authError = isAuthError(dashboardQ.error) || isAuthError(meQ.error);

  useEffect(() => {
    if (authError) {
      clearPortalSession();
      router.replace("/portal/login?next=%2Fportal%2Fdashboard");
    }
  }, [authError, router]);

  async function signOut() {
    await logout();
    queryClient.removeQueries({ queryKey: ["portal-dashboard"] });
    queryClient.removeQueries({ queryKey: ["portal-me"] });
    router.push("/portal/login");
  }

  if (authError) {
    return <OrganizationDashboardSkeleton />;
  }
  if (dashboardQ.isLoading) {
    return <OrganizationDashboardSkeleton />;
  }
  if (dashboardQ.error) {
    return (
      <OrganizationDashboardError
        message={String(dashboardQ.error)}
        onRetry={() => void dashboardQ.refetch()}
      />
    );
  }
  if (dashboardQ.data) {
    return <OrganizationDashboard data={dashboardQ.data} me={meQ.data} onSignOut={signOut} />;
  }
  return null;
}
