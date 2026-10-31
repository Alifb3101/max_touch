import type { ReactNode } from "react";
import PageShell from "@/components/layout/PageShell";

export default function AuthCard({
  eyebrow,
  title,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <PageShell>
      <section className="mx-auto grid max-w-5xl gap-10 px-6 pt-16 pb-24 md:grid-cols-[1fr_1.1fr] md:items-center">
        <div className="sp-rise hidden md:block">
          <p className="sp-eyebrow">{eyebrow}</p>
          <h1 className="sp-title mt-4 text-[clamp(2.6rem,5vw,4rem)]">{title}</h1>
          <p className="mt-5 max-w-sm text-[0.9rem] leading-relaxed text-taupe/85">
            Save your addresses, track every order and check out in seconds.
          </p>
          <p className="mt-10 text-[3rem] leading-none text-gold" aria-hidden>
            ✦
          </p>
        </div>
        <div className="sp-panel sp-rise p-7 sm:p-10" style={{ "--d": "120ms" } as React.CSSProperties}>
          <h1 className="sp-title mb-6 text-[2.2rem] md:hidden">{title}</h1>
          {children}
          {footer && <div className="mt-8 border-t border-mauve/60 pt-6 text-[0.85rem] text-taupe">{footer}</div>}
        </div>
      </section>
    </PageShell>
  );
}
