import type { Metadata } from "next";
import Link from "next/link";
import AuthCard from "@/components/auth/AuthCard";
import { ForgotPasswordForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = {
  title: "Reset your password",
  robots: { index: false, follow: true },
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      eyebrow="Forgot password"
      title="Reset your password"
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="sp-link">
            Back to sign in
          </Link>
        </>
      }
    >
      <p className="mb-6 text-[0.88rem] leading-relaxed text-taupe/85">
        Enter the email you signed up with and we&apos;ll send you a link to choose a new password.
      </p>
      <ForgotPasswordForm />
    </AuthCard>
  );
}
