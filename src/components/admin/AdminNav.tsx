"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/account/AccountClient";

const LINKS = [
  { href: "/admin", label: "Desk" },
  { href: "/admin/products", label: "Kits" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/settings", label: "Delivery" },
];

export default function AdminNav({ email }: { email: string }) {
  const pathname = usePathname();
  const current = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-20 border-b border-mauve/70 bg-ivory/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <div>
          <Link href="/admin" className="font-display text-[1.7rem] leading-none text-burgundy">
            Shop desk
          </Link>
          <p className="mt-1 text-[0.72rem] text-taupe/70">{email}</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" className="sp-link text-[0.8rem]">
            View shop
          </Link>
          <SignOutButton />
        </div>
      </div>
      <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3" aria-label="Shop desk">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={current(link.href) ? "page" : undefined}
            className={`rounded-full px-3.5 py-2 text-[0.68rem] font-semibold tracking-[0.14em] uppercase transition-colors ${
              current(link.href) ? "bg-burgundy text-ivory" : "text-burgundy/80 hover:bg-blush/70"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
