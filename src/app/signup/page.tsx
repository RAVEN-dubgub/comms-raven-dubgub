import { AuthForm } from "@/components/auth-form";

export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-10">
      <div className="card w-full">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent-2)]">
          Project 2 · Comms
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Create account</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Join #general, #announcements, and #reviews. Use your PM platform email.
        </p>
        <div className="mt-6">
          <AuthForm mode="signup" />
        </div>
      </div>
    </main>
  );
}
