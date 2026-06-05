import { Suspense } from "react";
import { LoginForm } from "@/app/login-form";

export default function Home() {
  return (
    <Suspense fallback={<div className="auth-wrap muted">Loading portal…</div>}>
      <LoginForm />
    </Suspense>
  );
}
