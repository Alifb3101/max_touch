"use client";

import { useState } from "react";
import type { FormEvent, InputHTMLAttributes } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/format";

type Status = { kind: "error" | "ok"; message: string } | null;

function Field({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="sp-field">
      <span className="sp-label">{label}</span>
      <input className="sp-input" {...props} />
    </label>
  );
}

function StatusMessage({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <p role={status.kind === "error" ? "alert" : "status"} className={`sp-alert ${status.kind === "error" ? "sp-alert-error" : "sp-alert-ok"}`}>
      {status.message}
    </p>
  );
}

const NOT_CONFIGURED: Status = { kind: "error", message: "Accounts aren't available yet — the store database isn't connected." };

const siteOrigin = () => (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/+$/, "");

function friendlyAuthError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "That email and password don't match.";
  if (m.includes("email not confirmed")) return "Please confirm your email first — check your inbox for the link.";
  if (m.includes("already registered")) return "An account with this email already exists. Try signing in.";
  if (m.includes("password should be")) return "Please choose a stronger password (at least 8 characters).";
  if (m.includes("rate limit")) return "Too many attempts. Please wait a minute and try again.";
  return message;
}

// ── Sign in ──────────────────────────────────────────────────────────────────
export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [status, setStatus] = useState<Status>(params.get("error") ? { kind: "error", message: "That link has expired. Please try again." } : null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const supabase = createClient();
    if (!supabase) return setStatus(NOT_CONFIGURED);
    const f = new FormData(e.currentTarget);
    setPending(true);
    setStatus(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(f.get("email")).trim(),
      password: String(f.get("password")),
    });
    if (error) {
      setPending(false);
      return setStatus({ kind: "error", message: friendlyAuthError(error.message) });
    }
    router.replace(next);
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <StatusMessage status={status} />
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required />
      <div className="flex justify-end">
        <Link href="/forgot-password" className="sp-link text-[0.8rem]">
          Forgot password?
        </Link>
      </div>
      <button type="submit" className="sp-btn w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

// ── Create account ───────────────────────────────────────────────────────────
export function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [status, setStatus] = useState<Status>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const supabase = createClient();
    if (!supabase) return setStatus(NOT_CONFIGURED);
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password"));
    if (password.length < 8) return setStatus({ kind: "error", message: "Password must be at least 8 characters." });
    if (password !== String(f.get("confirm"))) return setStatus({ kind: "error", message: "Passwords don't match." });

    setPending(true);
    setStatus(null);
    const { data, error } = await supabase.auth.signUp({
      email: String(f.get("email")).trim(),
      password,
      options: {
        data: { full_name: String(f.get("fullName")).trim(), phone: String(f.get("phone")).trim() },
        emailRedirectTo: `${siteOrigin()}/auth/confirm?next=${encodeURIComponent(next)}`,
      },
    });
    setPending(false);
    if (error) return setStatus({ kind: "error", message: friendlyAuthError(error.message) });

    if (data.session) {
      router.replace(next);
      router.refresh();
    } else {
      setDone(true);
      setStatus({ kind: "ok", message: "Almost there — we've sent a confirmation link to your email." });
    }
  };

  if (done) return <StatusMessage status={status} />;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <StatusMessage status={status} />
      <Field label="Full name" name="fullName" autoComplete="name" required />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field label="Phone" name="phone" type="tel" autoComplete="tel" placeholder="+971…" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        <Field label="Confirm password" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <button type="submit" className="sp-btn w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}

// ── Forgot password ──────────────────────────────────────────────────────────
export function ForgotPasswordForm() {
  const [status, setStatus] = useState<Status>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const supabase = createClient();
    if (!supabase) return setStatus(NOT_CONFIGURED);
    const email = String(new FormData(e.currentTarget).get("email")).trim();
    setPending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteOrigin()}/auth/confirm?next=/reset-password`,
    });
    setPending(false);
    if (error && error.message.toLowerCase().includes("rate limit")) {
      return setStatus({ kind: "error", message: friendlyAuthError(error.message) });
    }
    setStatus({ kind: "ok", message: "If an account exists for that email, a reset link is on its way." });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <StatusMessage status={status} />
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <button type="submit" className="sp-btn w-full" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}

// ── Set a new password (after following the reset link) ──────────────────────
export function ResetPasswordForm() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const supabase = createClient();
    if (!supabase) return setStatus(NOT_CONFIGURED);
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password"));
    if (password.length < 8) return setStatus({ kind: "error", message: "Password must be at least 8 characters." });
    if (password !== String(f.get("confirm"))) return setStatus({ kind: "error", message: "Passwords don't match." });
    setPending(true);
    const { error } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (error) {
      return setStatus({
        kind: "error",
        message: error.message.toLowerCase().includes("session")
          ? "Your reset link has expired. Please request a new one."
          : friendlyAuthError(error.message),
      });
    }
    router.replace("/account");
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <StatusMessage status={status} />
      <Field label="New password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      <Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      <button type="submit" className="sp-btn w-full" disabled={pending}>
        {pending ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
