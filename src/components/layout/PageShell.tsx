import type { ReactNode } from "react";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";

export default function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-ivory font-body text-taupe">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_55%_60%_at_12%_0%,rgba(243,220,212,0.9),transparent_70%),radial-gradient(ellipse_45%_50%_at_92%_10%,rgba(233,207,156,0.28),transparent_70%)]"
      />
      <SiteHeader />
      <main className="relative flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
