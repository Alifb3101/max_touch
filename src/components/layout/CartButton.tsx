"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";
import { BagIcon, UserIcon } from "@/components/ui/icons";

/** Account + bag icons with the live bag count. */
export default function CartButton() {
  const { count, ready } = useCart();
  return (
    <>
      <Link href="/account" className="sp-icon-btn" aria-label="Your account">
        <UserIcon />
      </Link>
      <Link href="/cart" className="sp-icon-btn" aria-label={`Bag, ${count} item${count === 1 ? "" : "s"}`}>
        <BagIcon />
        {ready && count > 0 && (
          <span key={count} className="sp-badge">
            {count}
          </span>
        )}
      </Link>
    </>
  );
}
