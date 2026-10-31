import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import AuthCard from "@/components/auth/AuthCard";
import { SignupForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = {
  title: "Create an account",
  robots: { index: false, follow: true },
};

export default function SignupPage() {
  return (
    <AuthCard
      eyebrow="Join Max Touch"
      title="Create your account"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="sp-link">
            Sign in
          </Link>
        </>
      }
    >
      <Suspense>
        <SignupForm />
      </Suspense>
    </AuthCard>
  );
}
