"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { use } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRegistration } from "@/lib/portal-client";

export default function RegistrationStatusPage({
  params,
}: {
  params: Promise<{ registrationId: string }>;
}) {
  const { registrationId } = use(params);
  const { data, isLoading, error } = useQuery({
    queryKey: ["portal-registration", registrationId],
    queryFn: () => getRegistration(registrationId),
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-4xl font-semibold text-text-primary">Registration status</h1>
      <Card>
        <CardHeader>
          <CardTitle>{registrationId}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? <p className="text-text-secondary">Checking application...</p> : null}
          {error ? <p className="text-red-400">{String(error)}</p> : null}
          {data ? (
            <>
              <Badge>{String(data.status)}</Badge>
              <p className="text-text-secondary">
                Matched facility: {String(data.matched_facility_id ?? "Reviewer will assign")}
              </p>
              {data.status === "approved" ? (
                <Button asChild>
                  <Link href="/portal/login">Go to portal login</Link>
                </Button>
              ) : null}
              {data.reviewer_notes ? (
                <p className="rounded-lg border border-border-default p-3 text-text-secondary">
                  {String(data.reviewer_notes)}
                </p>
              ) : null}
            </>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
