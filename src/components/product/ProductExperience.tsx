"use client";

import { createContext, useCallback, useContext, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import SiteHeader from "@/components/layout/SiteHeader";
import type { Product } from "@/lib/types";
import Hero from "./Hero";
import ProductDrawer from "./ProductDrawer";
import type { ProductDrawerHandle } from "./ProductDrawer";

gsap.registerPlugin(ScrollTrigger);

const DrawerContext = createContext<() => void>(() => {});
export const useOpenDrawer = () => useContext(DrawerContext);

interface ProductExperienceProps {
  product: Product;
  /** Server-rendered content shown below the pinned hero. */
  children?: ReactNode;
}

export default function ProductExperience({ product, children }: ProductExperienceProps) {
  const lenisRef = useRef<Lenis | null>(null);
  const drawerRef = useRef<ProductDrawerHandle>(null);

  const openDrawer = useCallback(() => drawerRef.current?.open(), []);

  // Page scroll is frozen while the kit drawer is open; only the drawer scrolls.
  const handleDrawer = useCallback((open: boolean) => {
    if (open) {
      lenisRef.current?.stop();
      document.documentElement.style.overflow = "hidden";
    } else {
      lenisRef.current?.start();
      document.documentElement.style.overflow = "";
    }
  }, []);

  // ── Lenis smooth-scroll ─────────────────────────────────────────────────
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    lenis.on("scroll", ScrollTrigger.update);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      lenisRef.current = null;
      document.documentElement.style.overflow = "";
    };
  }, []);

  const subtitle =
    product.heroSubtitle ?? (product.pieces ? `${product.pieces} pieces · one case · yours` : `${product.size.label} kit · one case · yours`);

  return (
    <DrawerContext.Provider value={openDrawer}>
      <div style={{ background: "#fff", fontFamily: "var(--font-sora), sans-serif", color: "#5A4A42" }}>
        <SiteHeader overlay />

        {/* ════════════════════════════════════════════════════════════════
            HERO — GSAP ScrollTrigger pinned, scrub-driven kit reveal
        ════════════════════════════════════════════════════════════════ */}
        <Hero
          title={product.name}
          subtitle={subtitle}
          frames={product.frames}
          showcase={product.showcase}
          onSequenceEnd={openDrawer}
        />

        {children}

        <ProductDrawer ref={drawerRef} product={product} onOpenChange={handleDrawer} />
      </div>
    </DrawerContext.Provider>
  );
}

export function OpenDrawerButton({ children, className }: { children: ReactNode; className?: string }) {
  const open = useOpenDrawer();
  return (
    <button type="button" className={className} onClick={open}>
      {children}
    </button>
  );
}
