"use client";

import Link from "next/link";
import { useState } from "react";

type AuthFormProps = {
  mode: "login" | "signup";
};

export function AuthForm({ mode }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
    const payload =
      mode === "login"
        ? { email: email.trim(), password }
        : { email: email.trim(), password, name: name.trim() };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Request failed");
        return;
      }
      window.location.assign("/app");
    } catch {
      setError("Network error - check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === "signup" ? (
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Name</span>
          <input
            className="field"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
      ) : null}
      <label className="block text-sm">
        <span className="mb-1 block text-[var(--muted)]">Email</span>
        <input
          className="field"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {mode === "signup" ? (
          <span className="mt-1 block text-xs text-[var(--muted)]">
            Use the same email as the PM platform for cohort identity match.
          </span>
        ) : null}
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-[var(--muted)]">Password</span>
        <input
          className="field"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={mode === "signup" ? 8 : 1}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      <button className="btn btn-primary w-full" type="submit" disabled={loading}>
        {loading ? "Working..." : mode === "login" ? "Sign in" : "Create account"}
      </button>
      <p className="text-center text-sm text-[var(--muted)]">
        {mode === "login" ? (
          <>
            No account? <Link href="/signup">Sign up</Link>
          </>
        ) : (
          <>
            Already registered? <Link href="/login">Sign in</Link>
          </>
        )}
      </p>
    </form>
  );
}
