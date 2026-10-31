"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { mediaUrl } from "@/lib/media";
import { MAX_QTY } from "@/lib/pricing";
import type { CartLine } from "@/lib/types";

const STORAGE_KEY = "mt-cart-v1";

type NewLine = Omit<CartLine, "quantity">;

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  currency: string;
  ready: boolean;
  userId: string | null;
  add: (line: NewLine, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

const clampQty = (q: number) => Math.max(1, Math.min(MAX_QTY, Math.floor(q)));

interface ProductRow {
  id: string;
  slug: string;
  name: string;
  price: number | string;
  currency: string;
  stock: number;
  is_active: boolean;
  thumbnail_url: string | null;
  image_url: string | null;
  size: { label: string } | null;
}

const PRODUCT_COLUMNS = "id, slug, name, price, currency, stock, is_active, thumbnail_url, image_url, size:sizes(label)";

function fromRow(p: ProductRow, quantity: number): CartLine {
  return {
    productId: p.id,
    slug: p.slug,
    name: p.name,
    image: mediaUrl(p.thumbnail_url ?? p.image_url),
    price: Number(p.price),
    currency: p.currency,
    sizeLabel: p.size?.label ?? "",
    stock: p.stock,
    quantity: clampQty(quantity),
  };
}

export default function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);
  const userRef = useRef<string | null>(null);
  const linesRef = useRef<CartLine[]>([]);
  linesRef.current = lines;

  // ── Load the saved cart, then refresh prices/stock from the database ────
  useEffect(() => {
    let saved: CartLine[] = [];
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
      if (!Array.isArray(saved)) saved = [];
    } catch {
      saved = [];
    }
    setLines(saved);
    setReady(true);

    if (!supabase || saved.length === 0) return;
    supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .in(
        "id",
        saved.map((l) => l.productId),
      )
      .then(({ data }) => {
        if (!data) return;
        const rows = data as unknown as ProductRow[];
        setLines((current) =>
          current.flatMap((line) => {
            const row = rows.find((r) => r.id === line.productId);
            return row && row.is_active ? [fromRow(row, line.quantity)] : [];
          }),
        );
      });
  }, [supabase]);

  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, ready]);

  // ── Signed-in customers: merge the local cart with the saved one ────────
  const syncWithAccount = useCallback(
    async (uid: string) => {
      if (!supabase) return;
      const { data } = await supabase
        .from("cart_items")
        .select(`quantity, product:products(${PRODUCT_COLUMNS})`)
        .eq("user_id", uid);
      const remote = ((data ?? []) as unknown as { quantity: number; product: ProductRow | null }[])
        .filter((r) => r.product?.is_active)
        .map((r) => fromRow(r.product!, r.quantity));

      const merged = new Map<string, CartLine>();
      for (const line of [...remote, ...linesRef.current]) {
        const existing = merged.get(line.productId);
        merged.set(line.productId, existing ? { ...line, quantity: Math.max(existing.quantity, line.quantity) } : line);
      }
      const next = [...merged.values()];
      setLines(next);
      if (next.length) {
        await supabase
          .from("cart_items")
          .upsert(next.map((l) => ({ user_id: uid, product_id: l.productId, quantity: l.quantity })));
      }
    },
    [supabase],
  );

  useEffect(() => {
    if (!supabase || !ready) return;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const uid = session?.user?.id ?? null;
      const changed = uid !== userRef.current;
      userRef.current = uid;
      setUserId(uid);
      if (uid && changed) {
        // Run outside the auth callback to avoid blocking the auth client.
        setTimeout(() => void syncWithAccount(uid), 0);
      } else if (!uid && event === "SIGNED_OUT") {
        setLines([]);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [supabase, ready, syncWithAccount]);

  const persist = useCallback(
    (productId: string, quantity: number | null) => {
      const uid = userRef.current;
      if (!supabase || !uid) return;
      if (quantity === null) {
        void supabase.from("cart_items").delete().eq("user_id", uid).eq("product_id", productId);
      } else {
        void supabase.from("cart_items").upsert({ user_id: uid, product_id: productId, quantity });
      }
    },
    [supabase],
  );

  const add = useCallback(
    (line: NewLine, quantity = 1) => {
      const existing = linesRef.current.find((l) => l.productId === line.productId);
      const nextQty = clampQty((existing?.quantity ?? 0) + quantity);
      setLines((current) =>
        existing
          ? current.map((l) => (l.productId === line.productId ? { ...l, ...line, quantity: nextQty } : l))
          : [...current, { ...line, quantity: nextQty }],
      );
      persist(line.productId, nextQty);
    },
    [persist],
  );

  const setQuantity = useCallback(
    (productId: string, quantity: number) => {
      const q = clampQty(quantity);
      setLines((current) => current.map((l) => (l.productId === productId ? { ...l, quantity: q } : l)));
      persist(productId, q);
    },
    [persist],
  );

  const remove = useCallback(
    (productId: string) => {
      setLines((current) => current.filter((l) => l.productId !== productId));
      persist(productId, null);
    },
    [persist],
  );

  const clear = useCallback(() => {
    setLines([]);
    const uid = userRef.current;
    if (supabase && uid) void supabase.from("cart_items").delete().eq("user_id", uid);
  }, [supabase]);

  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((s, l) => s + l.quantity, 0);
    const subtotal = Math.round(lines.reduce((s, l) => s + l.price * l.quantity, 0) * 100) / 100;
    return {
      lines,
      count,
      subtotal,
      currency: lines[0]?.currency ?? "AED",
      ready,
      userId,
      add,
      setQuantity,
      remove,
      clear,
    };
  }, [lines, ready, userId, add, setQuantity, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
