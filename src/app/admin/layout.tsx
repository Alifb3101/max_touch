import type { Metadata } from "next";
import type { ReactNode } from "react";
import AdminNav from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/admin";

export const metadata: Metadata = {
  title: "Shop desk",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user } = await requireAdmin();
  return (
    <div className="min-h-screen bg-ivory font-body text-taupe">
      <AdminNav email={user.email} />
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
