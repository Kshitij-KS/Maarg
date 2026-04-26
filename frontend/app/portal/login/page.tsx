"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { login } from "@/lib/portal-client";

export default function PortalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      router.push("/portal/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center px-6 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Organization Portal Login</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-text-secondary">
            Sign in as an approved healthcare organization to review your facility record, submit
            evidence-backed corrections, and track review status.
          </p>
          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="flex flex-col gap-2 text-sm text-text-secondary">
              Email
              <Input value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="flex flex-col gap-2 text-sm text-text-secondary">
              Password
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <Button type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
          </form>
          {/* demo only — hackathon fixture creds; do not ship to production marketing */}
          <div className="rounded-lg border border-border-default p-3 text-xs text-text-secondary">
            Demo org login: <span className="font-mono">portal-demo@maarg.test</span> /{" "}
            <span className="font-mono">PortalDemo123!</span>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
