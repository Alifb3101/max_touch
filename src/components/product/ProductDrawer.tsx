"use client";

import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, Ref } from "react";
import Image, { getImageProps } from "next/image";
import Link from "next/link";
import gsap from "gsap";

import { useCart } from "@/components/cart/CartProvider";
import { BagIcon } from "@/components/ui/icons";
import { money } from "@/lib/format";
import { canOptimize } from "@/lib/media";
import { MAX_QTY } from "@/lib/pricing";
import type { ExtraIconKind, Product, Thumb } from "@/lib/types";

// ── Palette ──────────────────────────────────────────────────────────────────
const GOLD = "#B08D57";
const BURGUNDY = "#6B2737";
const MAUVE = "#D8C4BC";
const IVORY = "#FBF3EA";
const TAUPE = "#5A4A42";
const STAGE = "#F6E9E3";
const FONT = "var(--font-jakarta), system-ui, sans-serif";

const CURTAINS = [GOLD, BURGUNDY, STAGE];
const PARTICLE_COLORS = [GOLD, "#E83E8C", BURGUNDY, "#F4A63B", "#B65FC8", "#2E8FD8"];
const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  angle: (i / 28) * Math.PI * 2 + (i % 2 ? 0.12 : -0.08),
  dist: 170 + ((i * 53) % 190),
  size: 6 + ((i * 7) % 12),
  star: i % 3 === 0,
  color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
}));

// ── Liquid curtain geometry ──────────────────────────────────────────────────
// Leading edge is a cubic curve: top x (t), middle control x (m), bottom x (b),
// in a 0–100 viewBox stretched over the drawer. 100/100/100 = fully hidden.
type Edge = { t: number; m: number; b: number };
const HIDDEN: Edge = { t: 100, m: 100, b: 100 };
const edgePath = ({ t, m, b }: Edge) => `M${t} 0 C${m} 35 ${m} 65 ${b} 100 L100 100 L100 0 Z`;

function openEdge(tl: gsap.core.Timeline, edge: Edge, path: SVGPathElement | null, at: number, dur = 0.95) {
  if (!path) return;
  const render = () => path.setAttribute("d", edgePath(edge));
  tl.to(edge, { m: 0, duration: dur * 0.78, ease: "power4.inOut", onUpdate: render }, at);
  tl.to(edge, { t: 0, b: 0, duration: dur, ease: "power4.inOut", onUpdate: render }, at + dur * 0.1);
}

function resetEdge(edge: Edge, path: SVGPathElement | null) {
  Object.assign(edge, HIDDEN);
  path?.setAttribute("d", edgePath(edge));
}

// ═════════════════════════════════════════════════════════════════════════════
export interface ProductDrawerHandle {
  open: () => void;
  close: () => void;
  isOpen: () => boolean;
}

interface ProductDrawerProps {
  product: Product;
  onOpenChange?: (open: boolean) => void;
  ref?: Ref<ProductDrawerHandle>;
}

export default function ProductDrawer({ product, onOpenChange, ref }: ProductDrawerProps) {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [detail, setDetail] = useState<number | null>(0);
  const { add: addToCart, count: bagCount } = useCart();

  const soldOut = product.stock <= 0;
  const maxQty = Math.max(1, Math.min(MAX_QTY, product.stock));

  // Optimised sources for the stage image, its sweep mask and the fly-to-bag coin.
  const stageImage = useMemo(() => {
    if (!product.image) return null;
    const unoptimized = !canOptimize(product.image);
    const { props } = getImageProps({
      src: product.image,
      alt: product.imageAlt,
      width: 1200,
      height: 1200,
      sizes: "(max-width: 767px) 92vw, 52vw",
      unoptimized,
    });
    const { props: small } = getImageProps({ src: product.image, alt: "", width: 640, height: 640, unoptimized });
    return { props, small: small.src };
  }, [product.image, product.imageAlt]);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const triggerArrowRef = useRef<HTMLSpanElement>(null);
  const shockRef = useRef<HTMLSpanElement>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const curtainRefs = useRef<(SVGPathElement | null)[]>([]);
  const columnCurtainRef = useRef<SVGPathElement>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const stageInnerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const ringRefs = useRef<(HTMLDivElement | null)[]>([]);
  const kitWrapRef = useRef<HTMLDivElement>(null);
  const kitInnerRef = useRef<HTMLDivElement>(null);
  const kitImgRef = useRef<HTMLImageElement>(null);
  const sweepRef = useRef<HTMLDivElement>(null);
  const particleRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const captionRef = useRef<HTMLDivElement>(null);

  const headRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const priceRef = useRef<HTMLSpanElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const bagRef = useRef<HTMLAnchorElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);

  const edges = useRef<Edge[]>(CURTAINS.map(() => ({ ...HIDDEN })));
  const columnEdge = useRef<Edge>({ ...HIDDEN });
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const floatRef = useRef<gsap.core.Tween | null>(null);
  const ioRef = useRef<IntersectionObserver | null>(null);
  const openRef = useRef(false);

  // ── Reveal-on-scroll inside the drawer ──────────────────────────────────
  const revealEl = (el: HTMLElement, delay: number) => {
    const kind = el.dataset.reveal;
    if (kind === "line") {
      gsap.fromTo(el, { scaleX: 0 }, { scaleX: 1, duration: 1.2, delay, ease: "expo.inOut", transformOrigin: "left center" });
    } else if (kind === "card") {
      gsap.fromTo(
        el,
        { opacity: 0, y: 70, rotationX: -45, scale: 0.9, transformPerspective: 900, filter: "blur(10px)" },
        { opacity: 1, y: 0, rotationX: 0, scale: 1, filter: "blur(0px)", duration: 1.15, delay, ease: "expo.out", clearProps: "filter" },
      );
      const thumb = el.querySelector(".kd-thumb");
      if (thumb) {
        gsap.fromTo(
          thumb,
          { scale: 0, rotation: -35 },
          { scale: 1, rotation: 0, duration: 1, delay: delay + 0.15, ease: "back.out(2.2)" },
        );
      }
    } else {
      gsap.fromTo(
        el,
        { opacity: 0, y: 50, filter: "blur(8px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 1, delay, ease: "expo.out", clearProps: "filter" },
      );
    }
    el.querySelectorAll<HTMLElement>("[data-count]").forEach((c) => {
      const target = Number(c.dataset.count);
      const o = { v: 0 };
      gsap.to(o, {
        v: target,
        duration: 1.8,
        delay: delay + 0.1,
        ease: "power3.out",
        onUpdate: () => {
          c.textContent = String(Math.round(o.v));
        },
      });
    });
  };

  const startReveals = (targets: HTMLElement[]) => {
    ioRef.current?.disconnect();
    const io = new IntersectionObserver(
      (entries) => {
        const hits = entries.filter((e) => e.isIntersecting).map((e) => e.target as HTMLElement);
        hits.forEach((el, i) => {
          io.unobserve(el);
          revealEl(el, i * 0.09);
        });
      },
      { root: scrollRef.current, threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    targets.forEach((el) => io.observe(el));
    ioRef.current = io;
  };

  // ── OPEN ────────────────────────────────────────────────────────────────
  const openDrawer = useCallback(() => {
    if (openRef.current) return;
    openRef.current = true;
    setOpen(true);
    onOpenChange?.(true);

    tlRef.current?.kill();
    floatRef.current?.kill();

    const root = rootRef.current;
    if (!root) return;
    const q = gsap.utils.selector(root);
    const chars = q(".kd-char");
    const reveals = q("[data-reveal]") as HTMLElement[];
    const headItems = headRef.current ? Array.from(headRef.current.children) : [];
    const particles = particleRefs.current.filter(Boolean) as HTMLSpanElement[];
    const rings = ringRefs.current.filter(Boolean) as HTMLDivElement[];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    if (progressRef.current) gsap.set(progressRef.current, { scaleY: 0 });
    gsap.set(panelRef.current, { clearProps: "transform" });
    CURTAINS.forEach((_, i) => resetEdge(edges.current[i], curtainRefs.current[i]));
    resetEdge(columnEdge.current, columnCurtainRef.current);
    reveals.forEach((el) => {
      gsap.set(el, el.dataset.reveal === "line" ? { scaleX: 0 } : { opacity: 0 });
      el.querySelectorAll<HTMLElement>("[data-count]").forEach((c) => (c.textContent = "0"));
    });

    const tl = gsap.timeline();
    tlRef.current = tl;
    if (reduced) tl.timeScale(6);

    tl.set(root, { autoAlpha: 1 }, 0);

    // trigger: shockwave + arrow launches into the drawer
    tl.fromTo(shockRef.current, { scale: 0.6, opacity: 0.7 }, { scale: 3.2, opacity: 0, duration: 0.8, ease: "expo.out" }, 0);
    tl.to(triggerArrowRef.current, { x: -90, opacity: 0, duration: 0.4, ease: "power3.in" }, 0);
    tl.to(triggerRef.current, { x: 160, duration: 0.55, ease: "power3.in" }, 0.08);

    tl.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.9, ease: "power2.out" }, 0);

    // three liquid curtains: gold → burgundy → blush stage
    CURTAINS.forEach((_, i) => openEdge(tl, edges.current[i], curtainRefs.current[i], 0.05 + i * 0.13));
    // ivory content column pours in over the stage
    openEdge(tl, columnEdge.current, columnCurtainRef.current, 0.5, 0.9);

    // ── stage
    tl.fromTo(stageInnerRef.current, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: "power2.out" }, 0.7);
    tl.fromTo(glowRef.current, { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.6, ease: "expo.out" }, 0.75);
    tl.fromTo(
      kitInnerRef.current,
      { opacity: 0, scale: 0.25, rotationY: -80, rotationZ: 22, yPercent: 25, filter: "blur(30px)" },
      { opacity: 1, scale: 1, rotationY: 0, rotationZ: 0, yPercent: 0, filter: "blur(0px)", duration: 1.7, ease: "expo.out" },
      0.85,
    );
    rings.forEach((r, i) => {
      tl.fromTo(
        r,
        { scale: 0.15, opacity: 0.9 },
        { scale: 1 + i * 0.32, opacity: 0.55 - i * 0.14, duration: 1.8, ease: "expo.out" },
        1.0 + i * 0.1,
      );
    });
    if (!reduced) {
      particles.forEach((p, i) => {
        const cfg = PARTICLES[i];
        tl.fromTo(
          p,
          { x: 0, y: 0, scale: 0, opacity: 1, rotation: 0 },
          {
            x: Math.cos(cfg.angle) * cfg.dist,
            y: Math.sin(cfg.angle) * cfg.dist,
            scale: 1,
            rotation: cfg.star ? 260 : 0,
            opacity: 0,
            duration: 1.5 + (i % 5) * 0.12,
            ease: "expo.out",
          },
          1.05 + (i % 4) * 0.02,
        );
      });
    }
    tl.fromTo(
      sweepRef.current,
      { xPercent: -130, opacity: 0 },
      { xPercent: 130, opacity: 1, duration: 1.3, ease: "power2.inOut" },
      1.55,
    );
    tl.to(sweepRef.current, { opacity: 0, duration: 0.3 }, 2.6);
    tl.fromTo(captionRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.9, ease: "expo.out" }, 1.5);

    // ── content column
    tl.fromTo(headItems, { opacity: 0, y: -24 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.07, ease: "expo.out" }, 0.85);
    tl.fromTo(closeRef.current, { rotation: -180 }, { rotation: 0, duration: 1.1, ease: "expo.out" }, 0.85);
    tl.fromTo(
      chars,
      { yPercent: 120, rotation: 14, opacity: 0 },
      { yPercent: 0, rotation: 0, opacity: 1, duration: 1.15, stagger: 0.028, ease: "expo.out" },
      0.95,
    );
    tl.call(() => startReveals(reveals), undefined, 1.05);
    tl.fromTo(footerRef.current, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1, ease: "expo.out" }, 1.2);
    const priceObj = { v: 0 };
    tl.to(
      priceObj,
      {
        v: product.price,
        duration: 1.6,
        ease: "power3.out",
        onUpdate: () => {
          if (priceRef.current) priceRef.current.textContent = money(priceObj.v, product.currency);
        },
      },
      1.25,
    );

    tl.call(
      () => {
        closeRef.current?.focus({ preventScroll: true });
        if (!reduced && kitInnerRef.current) {
          floatRef.current = gsap.to(kitInnerRef.current, {
            y: -14,
            rotation: 0.8,
            duration: 2.8,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut",
          });
        }
      },
      undefined,
      2.4,
    );
  }, [onOpenChange, product.price, product.currency]);

  // ── CLOSE ───────────────────────────────────────────────────────────────
  const closeDrawer = useCallback(() => {
    if (!openRef.current) return;
    openRef.current = false;
    setOpen(false);

    tlRef.current?.kill();
    floatRef.current?.kill();
    ioRef.current?.disconnect();

    // Plain slide-out: the whole panel glides off to the right as one piece.
    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(rootRef.current, { autoAlpha: 0 });
        gsap.set(panelRef.current, { clearProps: "transform" });
        CURTAINS.forEach((_, i) => resetEdge(edges.current[i], curtainRefs.current[i]));
        resetEdge(columnEdge.current, columnCurtainRef.current);
        onOpenChange?.(false);
        triggerRef.current?.focus({ preventScroll: true });
      },
    });
    tlRef.current = tl;

    tl.to(panelRef.current, { xPercent: 100, duration: 0.6, ease: "power3.inOut" }, 0);
    tl.to(backdropRef.current, { opacity: 0, duration: 0.5, ease: "power2.out" }, 0.1);
    tl.to(triggerRef.current, { x: 0, duration: 0.5, ease: "power3.out" }, 0.35);
    tl.to(triggerArrowRef.current, { x: 0, opacity: 1, duration: 0.4, ease: "power2.out" }, 0.45);
  }, [onOpenChange]);

  useImperativeHandle(
    ref,
    () => ({ open: openDrawer, close: closeDrawer, isOpen: () => openRef.current }),
    [openDrawer, closeDrawer],
  );

  // ── Esc to close ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeDrawer]);

  // ── Wheel over the image stage scrolls the content column, never the page
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      scrollRef.current?.scrollBy({ top: e.deltaY });
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(
    () => () => {
      tlRef.current?.kill();
      floatRef.current?.kill();
      ioRef.current?.disconnect();
    },
    [],
  );

  // ── Pointer: magnetic trigger + 3D tilt on the image ────────────────────
  const onTriggerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (openRef.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    gsap.to(e.currentTarget, { x: dx * 0.3 - 10, y: dy * 0.18, duration: 0.6, ease: "power3.out" });
  };
  const onTriggerLeave = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (openRef.current) return;
    gsap.to(e.currentTarget, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, 0.45)" });
  };

  const onStageMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!openRef.current || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    gsap.to(kitWrapRef.current, { rotationY: px * 18, rotationX: -py * 14, duration: 1, ease: "power3.out" });
    gsap.to(glowRef.current, { x: px * 60, y: py * 40, duration: 1.2, ease: "power3.out" });
  };
  const onStageLeave = () => {
    gsap.to(kitWrapRef.current, { rotationY: 0, rotationX: 0, duration: 1.2, ease: "elastic.out(1, 0.5)" });
    gsap.to(glowRef.current, { x: 0, y: 0, duration: 1.2, ease: "power3.out" });
  };

  const onContentScroll = () => {
    const el = scrollRef.current;
    if (!el || !progressRef.current) return;
    const max = el.scrollHeight - el.clientHeight;
    gsap.set(progressRef.current, { scaleY: max > 0 ? el.scrollTop / max : 0 });
  };

  // ── Add to bag: confetti + product coin flies into the bag ──────────────
  const burstConfetti = (x: number, y: number) => {
    for (let i = 0; i < 30; i++) {
      const d = document.createElement("span");
      const size = gsap.utils.random(5, 11);
      Object.assign(d.style, {
        position: "fixed",
        left: `${x}px`,
        top: `${y}px`,
        width: `${size}px`,
        height: `${size * (i % 2 ? 0.45 : 1)}px`,
        background: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
        borderRadius: i % 3 === 0 ? "50%" : "2px",
        zIndex: "400",
        pointerEvents: "none",
      });
      document.body.appendChild(d);
      const angle = (gsap.utils.random(-165, -15) * Math.PI) / 180;
      const dist = gsap.utils.random(70, 230);
      gsap
        .timeline({ onComplete: () => d.remove() })
        .to(d, {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          rotation: gsap.utils.random(-600, 600),
          duration: 0.7,
          ease: "power3.out",
        })
        .to(d, { y: `+=${gsap.utils.random(140, 260)}`, opacity: 0, duration: 0.9, ease: "power2.in" }, ">-0.15");
    }
  };

  const flyToBag = (onLand: () => void) => {
    const from = kitImgRef.current?.getBoundingClientRect();
    const to = bagRef.current?.getBoundingClientRect();
    if (!from || !to) return onLand();
    const size = Math.min(140, from.width * 0.4);
    const sx = from.left + from.width / 2 - size / 2;
    const sy = from.top + from.height / 2 - size / 2;
    if (!stageImage) return onLand();
    const fly = document.createElement("img");
    fly.src = stageImage.small;
    Object.assign(fly.style, {
      position: "fixed",
      left: `${sx}px`,
      top: `${sy}px`,
      width: `${size}px`,
      height: `${size}px`,
      objectFit: "contain",
      padding: `${Math.round(size * 0.12)}px`,
      boxSizing: "border-box",
      background: IVORY,
      borderRadius: "50%",
      border: `2px solid ${GOLD}`,
      boxShadow: "0 18px 40px rgba(107,39,55,0.45)",
      zIndex: "401",
      pointerEvents: "none",
    });
    document.body.appendChild(fly);
    const dx = to.left + to.width / 2 - (sx + size / 2);
    const dy = to.top + to.height / 2 - (sy + size / 2);
    gsap
      .timeline({
        onComplete: () => {
          fly.remove();
          onLand();
        },
      })
      .fromTo(fly, { scale: 0.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(2)" })
      .to(fly, { x: dx, duration: 0.95, ease: "power2.inOut" }, 0.3)
      .to(fly, { y: dy, duration: 0.95, ease: "back.in(1.6)" }, 0.3)
      .to(fly, { scale: 0.12, rotation: 540, duration: 0.95, ease: "power2.in" }, 0.3);
  };

  const addToBag = () => {
    if (added || soldOut) return;
    const btn = ctaRef.current;
    if (btn) {
      const r = btn.getBoundingClientRect();
      burstConfetti(r.left + r.width / 2, r.top + r.height / 2);
      gsap.fromTo(btn, { scale: 0.92 }, { scale: 1, duration: 0.8, ease: "elastic.out(1, 0.4)" });
    }
    setAdded(true);
    const quantity = qty;
    flyToBag(() => {
      addToCart(
        {
          productId: product.id,
          slug: product.slug,
          name: product.name,
          image: product.thumbnail ?? product.image,
          price: product.price,
          currency: product.currency,
          sizeLabel: product.size.label,
          stock: product.stock,
        },
        quantity,
      );
      gsap.fromTo(
        bagRef.current,
        { scale: 1.45, rotation: -14 },
        { scale: 1, rotation: 0, duration: 0.9, ease: "elastic.out(1, 0.35)" },
      );
    });
    window.setTimeout(() => setAdded(false), 2600);
  };

  // ── Render ──────────────────────────────────────────────────────────────
  const title = product.name;
  const drawerId = `drawer-${product.id}`;

  return (
    <>
      {/* ═════════════ BIG ARROW TRIGGER ═════════════ */}
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Open ${title} details`}
        aria-expanded={open}
        aria-controls={drawerId}
        className="kd-trigger"
        onClick={openDrawer}
        onPointerMove={onTriggerMove}
        onPointerLeave={onTriggerLeave}
      >
        <span ref={shockRef} className="kd-trigger-shock" />
        <span className="kd-trigger-ring" />
        <span className="kd-trigger-sheen" />
        <span ref={triggerArrowRef} className="kd-trigger-arrow">
          <svg viewBox="0 0 64 40" width="58" height="36" fill="none" aria-hidden="true">
            <path d="M62 20H6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="kd-arrow-tail" />
            <path d="M22 4L5 20l17 16" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="kd-trigger-label">{product.ctaLabel ?? "Shop the kit"}</span>
      </button>

      {/* ═════════════ DRAWER OVERLAY ═════════════ */}
      <div
        ref={rootRef}
        id={drawerId}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-hidden={!open}
        data-lenis-prevent
        style={{ position: "fixed", inset: 0, zIndex: 300, visibility: "hidden", opacity: 0, fontFamily: FONT }}
      >
        <div
          ref={backdropRef}
          onClick={closeDrawer}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(11,5,7,0.55)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            opacity: 0,
          }}
        />

        <div ref={panelRef} className="absolute top-0 right-0 bottom-0 w-full md:w-[min(94vw,1480px)]">
          {/* liquid curtains */}
          {CURTAINS.map((color, i) => (
            <svg
              key={color}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
            >
              <path
                ref={(el) => {
                  curtainRefs.current[i] = el;
                }}
                d={edgePath(HIDDEN)}
                fill={color}
              />
            </svg>
          ))}

          <div className="relative grid h-full grid-rows-[minmax(250px,40vh)_minmax(0,1fr)] md:grid-cols-[1.08fr_1fr] md:grid-rows-1">
            {/* ═════════════ IMAGE STAGE (never changes on scroll) ═════════════ */}
            <div
              ref={stageRef}
              onPointerMove={onStageMove}
              onPointerLeave={onStageLeave}
              style={{ position: "relative", overflow: "hidden", perspective: 1400, minHeight: 0 }}
            >
              <div ref={stageInnerRef} style={{ position: "absolute", inset: 0, opacity: 0 }}>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: `linear-gradient(160deg, #FBF3EA 0%, ${STAGE} 55%, #F0DCD3 100%)`,
                  }}
                />
                <div
                  ref={glowRef}
                  style={{
                    position: "absolute",
                    inset: "-10%",
                    background: `radial-gradient(42% 38% at 50% 50%, rgba(255,255,255,0.95), rgba(255,255,255,0.35) 55%, transparent 75%),
                                 radial-gradient(30% 25% at 80% 16%, rgba(176,141,87,0.18), transparent 70%),
                                 radial-gradient(30% 24% at 18% 86%, rgba(107,39,55,0.10), transparent 70%)`,
                    pointerEvents: "none",
                  }}
                />

                {/* gold rings */}
                {[0, 1, 2].map((i) => (
                  <div
                    key={`ring-${i}`}
                    ref={(el) => {
                      ringRefs.current[i] = el;
                    }}
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      width: "min(62vh, 78%)",
                      aspectRatio: "1",
                      marginLeft: "calc(min(62vh, 78%) / -2)",
                      marginTop: "calc(min(62vh, 78%) / -2)",
                      pointerEvents: "none",
                    }}
                  >
                    <div className={`kd-ring ${i % 2 ? "kd-ring-rev" : ""}`} />
                  </div>
                ))}

                {/* particles */}
                <div style={{ position: "absolute", left: "50%", top: "50%", pointerEvents: "none" }}>
                  {PARTICLES.map((p, i) => (
                    <span
                      key={`p-${i}`}
                      ref={(el) => {
                        particleRefs.current[i] = el;
                      }}
                      style={{
                        position: "absolute",
                        left: -p.size / 2,
                        top: -p.size / 2,
                        width: p.size,
                        height: p.size,
                        lineHeight: `${p.size}px`,
                        fontSize: p.size * 1.4,
                        textAlign: "center",
                        color: p.color,
                        background: p.star ? "transparent" : p.color,
                        borderRadius: "50%",
                        opacity: 0,
                      }}
                    >
                      {p.star ? "✦" : ""}
                    </span>
                  ))}
                </div>

                {/* product image */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "clamp(1rem, 4vw, 4rem)",
                  }}
                >
                  <div
                    ref={kitWrapRef}
                    style={{
                      position: "relative",
                      width: "min(100%, 78vh)",
                      aspectRatio: "1",
                      perspective: 1200,
                      willChange: "transform",
                    }}
                  >
                    <div ref={kitInnerRef} style={{ position: "absolute", inset: 0, willChange: "transform, filter, opacity" }}>
                      {stageImage && (
                        // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- props come from getImageProps()
                        <img
                          {...stageImage.props}
                          ref={kitImgRef}
                          draggable={false}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            display: "block",
                            userSelect: "none",
                            filter: "drop-shadow(0 34px 38px rgba(107,39,55,0.28)) drop-shadow(0 8px 12px rgba(107,39,55,0.18))",
                          }}
                        />
                      )}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          overflow: "hidden",
                          pointerEvents: "none",
                          WebkitMaskImage: stageImage ? `url(${stageImage.small})` : undefined,
                          maskImage: stageImage ? `url(${stageImage.small})` : undefined,
                          WebkitMaskSize: "contain",
                          maskSize: "contain",
                          WebkitMaskRepeat: "no-repeat",
                          maskRepeat: "no-repeat",
                          WebkitMaskPosition: "center",
                          maskPosition: "center",
                        }}
                      >
                        <div
                          ref={sweepRef}
                          style={{
                            position: "absolute",
                            inset: 0,
                            background:
                              "linear-gradient(105deg, transparent 32%, rgba(255,255,255,0.6) 47%, rgba(233,207,156,0.55) 50%, transparent 66%)",
                            mixBlendMode: "screen",
                            filter: "blur(6px)",
                            opacity: 0,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* caption */}
                <div
                  ref={captionRef}
                  style={{
                    position: "absolute",
                    left: "clamp(1.25rem, 3vw, 2.5rem)",
                    right: "clamp(1.25rem, 3vw, 2.5rem)",
                    bottom: "clamp(1rem, 3vh, 2.25rem)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    fontSize: "0.68rem",
                    fontWeight: 600,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "rgba(90,74,66,0.7)",
                    pointerEvents: "none",
                  }}
                >
                  <span>
                    <span style={{ color: GOLD }}>✦</span> {product.caption ?? `${product.size.label} kit`}
                  </span>
                  <span className="hidden md:inline">Move to tilt</span>
                </div>
              </div>
            </div>

            {/* ═════════════ CONTENT COLUMN (the only thing that scrolls) ═════════════ */}
            <div style={{ position: "relative", minHeight: 0 }}>
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
              >
                <path ref={columnCurtainRef} d={edgePath(HIDDEN)} fill={IVORY} />
              </svg>

              <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
                {/* scroll progress thread */}
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: "rgba(176,141,87,0.15)", zIndex: 3 }}>
                  <div
                    ref={progressRef}
                    style={{
                      width: "100%",
                      height: "100%",
                      background: `linear-gradient(to bottom, ${GOLD}, ${BURGUNDY})`,
                      transformOrigin: "top",
                      transform: "scaleY(0)",
                    }}
                  />
                </div>

                {/* header */}
                <div
                  ref={headRef}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "1rem",
                    padding: "1.1rem clamp(1.25rem, 3.5vw, 3rem)",
                    borderBottom: `1px solid rgba(216,196,188,0.6)`,
                  }}
                >
                  <span style={{ fontSize: "1.05rem", fontWeight: 800, letterSpacing: "-0.01em", color: BURGUNDY }}>Max Touch</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <Link ref={bagRef} href="/cart" className="kd-bag" aria-label={`View bag, ${bagCount} ${bagCount === 1 ? "item" : "items"}`}>
                      <BagIcon />
                      {bagCount > 0 && <span className="kd-bag-badge">{bagCount}</span>}
                    </Link>
                    <button ref={closeRef} type="button" className="kd-close" onClick={closeDrawer} aria-label="Close">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
                        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* scrolling body */}
                <div
                  ref={scrollRef}
                  onScroll={onContentScroll}
                  data-lenis-prevent
                  style={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    overscrollBehavior: "contain",
                    WebkitOverflowScrolling: "touch",
                    padding: "clamp(1.75rem, 4vh, 3rem) clamp(1.25rem, 3.5vw, 3rem) 3rem",
                  }}
                >
                  <p data-reveal="up" style={eyebrow}>
                    {product.eyebrow ?? `${product.size.label} kit${product.pieces ? ` · ${product.pieces} pieces` : ""}`}
                  </p>

                  <h2
                    aria-label={product.titleLines.join(" ")}
                    style={{
                      fontWeight: 800,
                      letterSpacing: "-0.03em",
                      color: BURGUNDY,
                      fontSize: "clamp(2.1rem, 4vw, 3.5rem)",
                      lineHeight: 1.06,
                      margin: "0.75rem 0 0",
                    }}
                  >
                    {product.titleLines.map((line) => (
                      <span key={line} style={{ display: "block" }}>
                        {line.split(" ").map((word, wi) => (
                          <span
                            key={`${word}-${wi}`}
                            style={{
                              display: "inline-block",
                              overflow: "hidden",
                              padding: "0 0.02em 0.1em 0",
                              margin: "0 0.22em -0.1em 0",
                              verticalAlign: "top",
                            }}
                          >
                            {word.split("").map((ch, ci) => (
                              <span key={ci} className="kd-char" style={{ display: "inline-block", transformOrigin: "0% 100%" }}>
                                {ch}
                              </span>
                            ))}
                          </span>
                        ))}
                      </span>
                    ))}
                  </h2>

                  {(product.description ?? product.tagline) && (
                    <p
                      data-reveal="up"
                      style={{ fontSize: "0.95rem", lineHeight: 1.75, color: TAUPE, margin: "1.5rem 0 0", maxWidth: "34rem" }}
                    >
                      {product.description ?? product.tagline}
                    </p>
                  )}

                  {/* stats */}
                  {product.stats.length > 0 && (
                    <div data-reveal="up" style={{ display: "flex", gap: "clamp(1.5rem, 4vw, 3rem)", margin: "2.25rem 0 0" }}>
                      {product.stats.map((s) => (
                        <div key={s.label}>
                          <div
                            style={{
                              fontSize: "clamp(1.8rem, 3vw, 2.5rem)",
                              fontWeight: 800,
                              letterSpacing: "-0.03em",
                              color: BURGUNDY,
                              lineHeight: 1,
                            }}
                          >
                            <span data-count={s.value}>0</span>
                          </div>
                          <div style={{ ...eyebrow, color: TAUPE, marginTop: "0.4rem" }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* what's included */}
                  {product.included.length > 0 && (
                    <>
                      <div data-reveal="line" style={divider} />
                      <SectionTitle kicker="What's inside" title={product.includedTitle ?? "Everything in the box"} />
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" style={{ marginTop: "1.5rem" }}>
                        {product.included.map((item) => (
                          <div key={item.name} data-reveal="card" className="kd-card">
                            <div className="kd-thumb">
                              <ThumbArt thumb={item.thumb} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                                <span style={{ fontSize: "1.2rem", fontWeight: 800, color: BURGUNDY, lineHeight: 1 }}>
                                  ×<span data-count={item.qty}>0</span>
                                </span>
                                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: TAUPE }}>{item.name}</span>
                              </div>
                              {item.note && (
                                <p style={{ fontSize: "0.75rem", lineHeight: 1.55, color: "rgba(90,74,66,0.8)", margin: "0.35rem 0 0" }}>
                                  {item.note}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* also included */}
                  {product.extras.length > 0 && (
                    <>
                      <div data-reveal="line" style={divider} />
                      <SectionTitle kicker="Also included" title={product.extrasTitle ?? "Extras in the box"} />
                      <div style={{ marginTop: "1.25rem" }}>
                        {product.extras.map((x, i) => (
                          <div key={x.title} data-reveal="up" className="kd-extra">
                            <span className="kd-extra-index">0{i + 1}</span>
                            <span className="kd-extra-icon">
                              <ExtraIcon kind={x.icon} />
                            </span>
                            <div>
                              <div style={{ fontSize: "0.98rem", fontWeight: 700, color: BURGUNDY }}>{x.title}</div>
                              <p style={{ fontSize: "0.8rem", lineHeight: 1.6, color: TAUPE, margin: "0.25rem 0 0" }}>{x.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* perfect for */}
                  {product.perfectFor.length > 0 && (
                    <>
                      <div data-reveal="line" style={divider} />
                      <SectionTitle kicker="Made for" title="Every kind of look" />
                      <div data-reveal="up" style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", marginTop: "1.25rem" }}>
                        {product.perfectFor.map((p) => (
                          <span key={p} className="kd-chip">
                            {p}
                          </span>
                        ))}
                      </div>
                    </>
                  )}

                  {/* details accordion */}
                  {product.details.length > 0 && (
                    <>
                      <div data-reveal="line" style={divider} />
                      <div>
                        {product.details.map((d, i) => {
                          const isOpen = detail === i;
                          return (
                            <div key={d.q} data-reveal="up" style={{ borderBottom: `1px solid ${MAUVE}` }}>
                              <button
                                type="button"
                                className="kd-acc-btn"
                                aria-expanded={isOpen}
                                onClick={() => setDetail(isOpen ? null : i)}
                              >
                                <span>{d.q}</span>
                                <span className="kd-acc-plus" style={{ transform: isOpen ? "rotate(135deg)" : "rotate(0deg)" }}>
                                  +
                                </span>
                              </button>
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateRows: isOpen ? "1fr" : "0fr",
                                  transition: "grid-template-rows 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
                                }}
                              >
                                <div style={{ overflow: "hidden" }}>
                                  <p style={{ fontSize: "0.85rem", lineHeight: 1.75, color: TAUPE, margin: 0, paddingBottom: "1.25rem" }}>
                                    {d.a}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/* sticky add-to-bag */}
                <div
                  ref={footerRef}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.9rem",
                    padding: "1rem clamp(1.25rem, 3.5vw, 3rem)",
                    borderTop: `1px solid rgba(216,196,188,0.7)`,
                    background: "rgba(251,243,234,0.92)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <span style={{ ...eyebrow, color: TAUPE }}>Price</span>
                    <span
                      ref={priceRef}
                      style={{
                        fontSize: "1.3rem",
                        fontWeight: 800,
                        letterSpacing: "-0.02em",
                        color: BURGUNDY,
                        lineHeight: 1.15,
                        whiteSpace: "nowrap",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {money(product.price, product.currency)}
                    </span>
                    {product.compareAtPrice !== null && product.compareAtPrice > product.price && (
                      <s style={{ fontSize: "0.75rem", color: "rgba(90,74,66,0.6)", whiteSpace: "nowrap" }}>
                        {money(product.compareAtPrice, product.currency)}
                      </s>
                    )}
                  </div>

                  <div className="kd-qty" role="group" aria-label="Quantity">
                    <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">
                      −
                    </button>
                    <span aria-live="polite">{qty}</span>
                    <button type="button" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} aria-label="Increase quantity">
                      +
                    </button>
                  </div>

                  <button
                    ref={ctaRef}
                    type="button"
                    className={`kd-cta ${added ? "is-added" : ""}`}
                    onClick={addToBag}
                    disabled={soldOut}
                  >
                    <span className="kd-cta-fill" />
                    <span className="kd-cta-label" key={added ? "added" : soldOut ? "sold" : "add"}>
                      {soldOut ? (
                        "Sold out"
                      ) : added ? (
                        "Added to bag ✓"
                      ) : (
                        <>
                          Add to bag<span className="kd-cta-price"> · {money(product.price * qty, product.currency)}</span>
                        </>
                      )}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Shared styles ────────────────────────────────────────────────────────────
const eyebrow: CSSProperties = {
  fontSize: "0.68rem",
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: GOLD,
  margin: 0,
};

const divider: CSSProperties = {
  height: 1,
  margin: "2.75rem 0",
  background: `linear-gradient(90deg, ${GOLD}, rgba(216,196,188,0.6) 60%, transparent)`,
  transformOrigin: "left center",
};

// ── Sub-components ───────────────────────────────────────────────────────────
function SectionTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div data-reveal="up">
      <p style={eyebrow}>{kicker}</p>
      <h3
        style={{
          fontWeight: 800,
          letterSpacing: "-0.02em",
          fontSize: "clamp(1.35rem, 2.2vw, 1.75rem)",
          color: BURGUNDY,
          margin: "0.5rem 0 0",
          lineHeight: 1.15,
        }}
      >
        {title}
      </h3>
    </div>
  );
}

function ThumbArt({ thumb }: { thumb: Thumb }) {
  if (thumb.kind === "img") {
    return (
      <Image
        src={thumb.src}
        alt=""
        width={144}
        height={144}
        sizes="72px"
        draggable={false}
        unoptimized={!canOptimize(thumb.src)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          filter: "drop-shadow(0 6px 10px rgba(107,39,55,0.25))",
        }}
      />
    );
  }
  if (thumb.kind === "swatch") {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, width: "72%" }}>
        {thumb.colors.map((c) => (
          <span key={c} style={{ aspectRatio: "1", borderRadius: "50%", background: c, boxShadow: "inset 0 -2px 3px rgba(0,0,0,0.15)" }} />
        ))}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", transform: "rotate(-35deg)", height: "80%" }}>
      <span style={{ width: 6, height: "18%", background: thumb.tip, borderRadius: "3px 3px 1px 1px" }} />
      <span style={{ width: 10, height: "12%", background: `linear-gradient(90deg, #8a6a3a, ${GOLD}, #e6cc95, ${GOLD})` }} />
      <span style={{ width: 10, flex: 1, background: thumb.body, borderRadius: "0 0 3px 3px", boxShadow: "inset -2px 0 3px rgba(255,255,255,0.18)" }} />
    </div>
  );
}

function ExtraIcon({ kind }: { kind: ExtraIconKind }) {
  const common = { stroke: BURGUNDY, strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 32 32" width="26" height="26" fill="none" aria-hidden="true">
      {kind === "mirror" && (
        <>
          <rect x="6" y="5" width="20" height="22" rx="2" {...common} />
          <path d="M11 11l4-4M11 16l9-9" {...common} />
        </>
      )}
      {kind === "trays" && (
        <>
          <rect x="11" y="9" width="10" height="16" rx="1.5" {...common} />
          <path d="M11 11L4 8v14l7 3M21 11l7-3v14l-7 3" {...common} />
        </>
      )}
      {kind === "drawer" && (
        <>
          <rect x="5" y="7" width="22" height="18" rx="2" {...common} />
          <path d="M5 16h22M14 11.5h4M14 20.5h4" {...common} />
        </>
      )}
      {kind === "gift" && (
        <>
          <rect x="5" y="12" width="22" height="14" rx="1.5" {...common} />
          <path d="M3.5 12h25M16 12v14M16 12c-2-5-7-5-7-2s5 2 7 2c2 0 7 1 7-2s-5-3-7 2Z" {...common} />
        </>
      )}
    </svg>
  );
}
