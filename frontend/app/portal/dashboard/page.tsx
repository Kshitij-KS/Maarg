"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentPortalUser, getDashboard, logout } from "@/lib/portal-client";

export default function PortalDashboardPage() {
  const router = useRouter();
  const { data, isLoading, error } = useQuery({
    queryKey: ["portal-dashboard"],
    queryFn: getDashboard,
  });
  const me = useQuery({
    queryKey: ["portal-me"],
    queryFn: getCurrentPortalUser,
  });

  async function signOut() {
    await logout();
    router.push("/portal/login");
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-text-muted">Your Data</p>
          <h1 className="mt-3 text-4xl font-semibold text-text-primary">
            {data?.facility_name ?? "Facility dashboard"}
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            {me.data?.organization?.name ?? "Approved organization"} ·{" "}
            {me.data?.user.role.replace("_", " ") ?? "org user"}
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/portal/updates/new">Request a correction</Link>
          </Button>
          <Button type="button" variant="outline" onClick={signOut}>
            Log out
          </Button>
        </div>
      </div>
      {isLoading ? <p className="text-text-secondary">Loading your facility record...</p> : null}
      {error ? <p className="text-red-400">{String(error)}</p> : null}
      {data ? (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle>Trust Score</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-5xl font-semibold text-trust-300">{data.trust_score_percent}</p>
                <p className="text-sm text-text-secondary">out of 100</p>
              </CardContent>
            </Card>
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle>Facility Profile</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-text-secondary md:grid-cols-2">
                <p>PIN Code: {data.pin_code}</p>
                <p>District: {data.district}</p>
                <p>State: {data.state}</p>
                <p>Type: {data.facility_type}</p>
              </CardContent>
            </Card>
          </section>
          <section className="grid gap-4 lg:grid-cols-2">
            {data.capabilities.map((capability) => (
              <Card key={capability.capability}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-3">
                    {capability.label}
                    <Badge>{capability.status_label}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-text-secondary">
                  <p className="text-2xl font-semibold text-text-primary">
                    {capability.trust_score_percent}/100
                  </p>
                  <p>{capability.explanation}</p>
                  {capability.citation_sentence ? (
                    <blockquote className="rounded-lg border border-border-default p-3 text-sm">
                      &ldquo;{capability.citation_sentence}&rdquo;
                    </blockquote>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </section>
          <section className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Your Update Requests</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.update_requests.length === 0 ? (
                  <p className="text-text-secondary">No corrections submitted yet.</p>
                ) : (
                  data.update_requests.map((request) => (
                    <div key={request.request_id} className="rounded-lg border border-border-default p-3">
                      <p className="font-medium text-text-primary">{request.field_name}</p>
                      <p className="text-sm text-text-secondary">
                        {request.status} · Submitted {new Date(request.submitted_at).toLocaleString()}
                      </p>
                      <p className="text-sm text-text-secondary">Proposed: {request.new_value}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>How to Improve Your Score</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.improvement_suggestions.map((suggestion) => (
                  <div key={suggestion.title} className="rounded-lg border border-border-default p-3">
                    <Badge>{suggestion.severity}</Badge>
                    <p className="mt-2 font-medium text-text-primary">{suggestion.title}</p>
                    <p className="text-sm text-text-secondary">{suggestion.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </>
      ) : null}
    </main>
  );
}
