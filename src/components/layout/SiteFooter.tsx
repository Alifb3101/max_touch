import Link from "next/link";
import { SITE } from "@/lib/site";

const COLUMNS = [
  {
    title: "Shop",
    links: [
      { href: "/makeup-kits", label: "All makeup kits" },
      { href: "/makeup-kits/big", label: "Big kits" },
      { href: "/makeup-kits/medium", label: "Medium kits" },
      { href: "/makeup-kits/small", label: "Small kits" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/account", label: "My account" },
      { href: "/account#orders", label: "My orders" },
      { href: "/cart", label: "Bag" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-mauve/70 bg-[linear-gradient(180deg,#FBF3EA,#F6E9E3)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Link href="/" className="sp-logo">
            Max <em>Touch</em>
          </Link>
          <p className="mt-4 max-w-sm text-[0.82rem] leading-relaxed text-taupe/80">
            Makeup kits and gift kits in keepsake cases — every shade, every tool, ready to gift.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="sp-eyebrow">{col.title}</p>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-[0.85rem] text-taupe transition-colors hover:text-burgundy">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-mauve/60 px-6 py-5 text-center text-[0.7rem] tracking-[0.18em] text-taupe/70 uppercase">
        © {new Date().getFullYear()} {SITE.name}
      </div>
    </footer>
  );
}
