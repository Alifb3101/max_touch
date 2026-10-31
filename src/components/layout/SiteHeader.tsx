"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import CartButton from "./CartButton";

/** `overlay` floats transparently over a full-screen hero until the page scrolls. */
export default function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!overlay) return;
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlay]);

  const current = (href: string) => (pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined);

  return (
    <header className={`sp-header${overlay ? " is-overlay" : ""}${scrolled ? " is-scrolled" : ""}`}>
      <Link href="/" className="sp-logo" aria-label="Max Touch — home">
        Max <em>Touch</em>
      </Link>
      <nav className="sp-nav" aria-label="Main">
        <Link href="/makeup-kits" className="sp-nav-link" aria-current={current("/makeup-kits")}>
          Kits
        </Link>
        <Link href="/makeup-kits/big" className="sp-nav-link sp-nav-text" aria-current={current("/makeup-kits/big")}>
          Big
        </Link>
        <Link href="/makeup-kits/medium" className="sp-nav-link sp-nav-text" aria-current={current("/makeup-kits/medium")}>
          Medium
        </Link>
        <Link href="/makeup-kits/small" className="sp-nav-link sp-nav-text" aria-current={current("/makeup-kits/small")}>
          Small
        </Link>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <CartButton />
        </div>
      </nav>
    </header>
  );
}
