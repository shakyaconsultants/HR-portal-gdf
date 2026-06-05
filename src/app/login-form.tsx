"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { Field } from "@/components/ui/Field";
import { getFriendlyApiMessage, parseApiResponse } from "@/lib/client-api";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("reason") === "session") {
      toast.error("Session expired. Please sign in again.");
    }
  }, [searchParams, toast]);

  useEffect(() => {
    async function checkSession() {
      const res = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
      if (res.ok) {
        router.replace("/dashboard");
      }
    }
    void checkSession();
  }, [router]);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await parseApiResponse<{ user: { name: string } }>(res);

      if (!res.ok || !json.ok) {
        toast.error(getFriendlyApiMessage(json, "Invalid email or password."));
        return;
      }

      toast.success(`Welcome back, ${json.data?.user.name ?? "User"}.`);
      router.replace("/dashboard");
      router.refresh();
    } catch {
      toast.error("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-layout">
        <section className="auth-brand">
          <div>
            <span className="auth-badge">Enterprise portal</span>
            <h1>Trainee Management & Hiring</h1>
            <p>End-to-end CRM workflow from registration through onboarding and employee transfer.</p>
            <div className="auth-features">
              <div className="auth-feature">Pipeline visibility for every candidate stage</div>
              <div className="auth-feature">Role-based access for Admin, HR, and Trainer</div>
              <div className="auth-feature">Batch management, evaluations, and communications</div>
            </div>
          </div>
          <p className="muted">GDF internal use only</p>
        </section>

        <section className="auth-card">
          <div>
            <h2>Sign in</h2>
            <p className="muted">Enter your portal credentials to continue.</p>
          </div>

          <form className="stack" onSubmit={handleLogin}>
            <Field label="Email address">
              <input type="email" name="email" placeholder="you@company.com" required autoComplete="email" />
            </Field>
            <Field label="Password">
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </Field>
            <button type="submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign in to portal"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
