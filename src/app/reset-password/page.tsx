import type { Metadata } from "next";
import AuthCard from "@/components/auth/AuthCard";
import { ResetPasswordForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <AuthCard eyebrow="Almost done" title="Choose a new password">
      <ResetPasswordForm />
    </AuthCard>
  );
}
