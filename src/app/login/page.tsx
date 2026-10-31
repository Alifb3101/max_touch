import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import AuthCard from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  return (
    <AuthCard
      eyebrow="Welcome back"
      title="Sign in"
      footer={
        <>
          New to Max Touch?{" "}
          <Link href="/signup" className="sp-link">
            Create an account
          </Link>
        </>
      }
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
