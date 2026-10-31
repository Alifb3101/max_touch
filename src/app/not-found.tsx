import Link from "next/link";
import PageShell from "@/components/layout/PageShell";

export default function NotFound() {
  return (
    <PageShell>
      <section className="mx-auto max-w-xl px-6 py-28 text-center">
        <p className="text-[2.4rem] text-gold" aria-hidden>
          ✦
        </p>
        <p className="sp-eyebrow mt-3">404</p>
        <h1 className="sp-title mt-3 text-[clamp(2.4rem,5vw,3.6rem)]">This page has slipped out of the case</h1>
        <p className="mt-4 text-[0.9rem] text-taupe/80">The kit you&apos;re looking for may have moved or sold out.</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/makeup-kits" className="sp-btn">
            Browse makeup kits
          </Link>
          <Link href="/" className="sp-btn sp-btn-ghost">
            Home
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
