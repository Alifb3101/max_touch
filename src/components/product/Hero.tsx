"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { canOptimize } from "@/lib/media";

gsap.registerPlugin(ScrollTrigger);

// ── Floating product slots ───────────────────────────────────────────────────
// Where each showcase cut-out lands around the kit (desktop vw/vh and mobile mX/mY).
interface Slot {
  xVw: number;
  yVh: number;
  rot: number;
  startRot: number;
  w: number;
  mX: number;
  mY: number;
}

const SLOTS: Slot[] = [
  { xVw: -42, yVh: 4, rot: -12, startRot: -50, w: 14, mX: -22, mY: 12 },
  { xVw: 40, yVh: -8, rot: 8, startRot: 45, w: 13, mX: 20, mY: 14 },
  { xVw: -34, yVh: -30, rot: -4, startRot: -25, w: 15, mX: -16, mY: 20 },
  { xVw: 42, yVh: 18, rot: -6, startRot: 35, w: 13, mX: 18, mY: 22 },
  { xVw: 28, yVh: 34, rot: 10, startRot: -40, w: 13, mX: -18, mY: 28 },
  { xVw: -30, yVh: 32, rot: -8, startRot: 30, w: 13, mX: 16, mY: 30 },
  { xVw: 30, yVh: -32, rot: 3, startRot: 20, w: 15, mX: -12, mY: 34 },
];

export const MAX_SHOWCASE = SLOTS.length;

const SPARKLES = [
  { x: 6, y: 15, sz: 14, d: 0.0 },  { x: 94, y: 20, sz: 12, d: 0.5 },
  { x: 4, y: 52, sz: 10, d: 1.1 },  { x: 96, y: 48, sz: 14, d: 0.3 },
  { x: 12, y: 86, sz: 10, d: 1.5 }, { x: 88, y: 84, sz: 12, d: 0.7 },
  { x: 50, y: 4, sz: 16, d: 0.9 },  { x: 50, y: 96, sz: 12, d: 0.2 },
  { x: 28, y: 7, sz: 10, d: 1.3 },  { x: 72, y: 5, sz: 10, d: 0.6 },
  { x: 3, y: 68, sz: 12, d: 1.7 },  { x: 97, y: 36, sz: 10, d: 0.4 },
];

const GOLD = "#B08D57";
const BURGUNDY = "#6B2737";
const MAUVE = "#D8C4BC";
const IVORY = "#FBF3EA";

// Fires once each time the scrubbed timeline reaches its last frame; re-arms
// only after the user scrolls back up past `rearmBelow`.
function watchSequenceEnd(tl: gsap.core.Timeline, onEnd: () => void, rearmBelow = 0.9) {
  let armed = true;
  let pending: gsap.core.Tween | null = null;
  tl.eventCallback("onUpdate", () => {
    const p = tl.progress();
    if (armed && p >= 0.995) {
      armed = false;
      pending = gsap.delayedCall(0.35, onEnd);
    } else if (!armed && p < rearmBelow) {
      armed = true;
      pending?.kill();
      pending = null;
    }
  });
}

interface HeroProps {
  title: string;
  subtitle: string;
  frames: string[];
  showcase: { label: string; image: string }[];
  onSequenceEnd?: () => void;
}

export default function Hero({ title, subtitle, frames: FRAMES, showcase, onSequenceEnd }: HeroProps) {
  const HERO_ITEMS = showcase.slice(0, MAX_SHOWCASE).map((s, i) => ({ ...SLOTS[i], src: s.image, label: s.label }));

  const wrapperRef = useRef<HTMLDivElement>(null);
  const onEndRef = useRef(onSequenceEnd);
  onEndRef.current = onSequenceEnd;
  const fireEnd = () => onEndRef.current?.();
  const frameRefs = useRef<(HTMLImageElement | null)[]>([]);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const glowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cueRef = useRef<HTMLDivElement>(null);
  const bgGlowRef = useRef<HTMLDivElement>(null);
  const sparkleRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);
  const kitRef = useRef<HTMLDivElement>(null);
  const sweepRef = useRef<HTMLDivElement>(null);
  const ringRefs = useRef<(HTMLDivElement | null)[]>([]);
  const shimmerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      frameRefs.current.forEach((f, i) =>
        f && gsap.set(f, { opacity: i === FRAMES.length - 1 ? 1 : 0 }),
      );
      const vw = window.innerWidth / 100;
      const vh = window.innerHeight / 100;
      itemRefs.current.forEach((el, i) => {
        if (!el || !HERO_ITEMS[i]) return;
        const it = HERO_ITEMS[i];
        gsap.set(el, { x: it.xVw * vw, y: it.yVh * vh, opacity: 1, scale: 1, rotation: it.rot, filter: "blur(0px)" });
      });
      wrapperRef.current?.querySelectorAll(".product-label").forEach((l) => gsap.set(l, { opacity: 0.85, y: 0 }));
      glowRefs.current.forEach((g) => g && gsap.set(g, { opacity: 0.5 }));
      gsap.set(cueRef.current, { opacity: 0 });
      gsap.set(bgGlowRef.current, { opacity: 0.2 });
      gsap.set(sparkleRef.current, { opacity: 1 });
      gsap.set(titleRef.current, { opacity: 1, y: 0, filter: "blur(0px)" });
      gsap.set(subtitleRef.current, { opacity: 1, y: 0, filter: "blur(0px)" });
      gsap.set(kitRef.current, { scale: 1 });
      ringRefs.current.forEach((r, i) => r && gsap.set(r, { scale: 0.85 + i * 0.1, opacity: 0.25, rotation: i % 2 ? -40 : 50 }));
      return;
    }

    const mm = gsap.matchMedia();

    // ═══════════════════════ DESKTOP ≥ 768 px ═══════════════════════
    mm.add("(min-width: 768px)", () => {
      const vw = window.innerWidth / 100;
      const vh = window.innerHeight / 100;
      const frames = frameRefs.current.filter(Boolean) as HTMLImageElement[];
      const items = itemRefs.current.filter(Boolean) as HTMLDivElement[];
      const glows = glowRefs.current.filter(Boolean) as HTMLDivElement[];
      const rings = ringRefs.current.filter(Boolean) as HTMLDivElement[];

      const labels = wrapperRef.current?.querySelectorAll<HTMLSpanElement>(".product-label") ?? [];

      frames.forEach((f, i) => gsap.set(f, { opacity: i === 0 ? 1 : 0 }));
      items.forEach((el, i) => {
        gsap.set(el, { opacity: 0, scale: 0, filter: "blur(22px)", x: 0, y: 0, rotation: HERO_ITEMS[i]?.startRot ?? 0 });
      });
      labels.forEach((lbl) => gsap.set(lbl, { opacity: 0, y: 8 }));
      glows.forEach((g) => gsap.set(g, { opacity: 0, scale: 0.3 }));
      gsap.set(cueRef.current, { opacity: 1, y: 0 });
      gsap.set(bgGlowRef.current, { opacity: 0 });
      gsap.set(sparkleRef.current, { opacity: 0 });
      gsap.set(titleRef.current, { opacity: 0, y: 60, filter: "blur(32px)" });
      gsap.set(subtitleRef.current, { opacity: 0, y: 35, filter: "blur(20px)" });
      gsap.set(kitRef.current, { scale: 0.72 });
      gsap.set(sweepRef.current, { opacity: 0, xPercent: -110 });
      gsap.set(shimmerRef.current, { opacity: 0, scaleX: 0 });
      rings.forEach((r) => gsap.set(r, { scale: 0.3, opacity: 0.03 }));

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: wrapperRef.current,
          start: "top top",
          end: "+=540%",
          scrub: 1.2,
          pin: true,
          anticipatePin: 1,
        },
      });

      // scroll cue out
      tl.to(cueRef.current, { opacity: 0, y: -35, duration: 0.5, ease: "power2.in" }, 0);

      // kit scales up BIG
      tl.to(kitRef.current, { scale: 1, duration: 3.5, ease: "power2.out" }, 0);

      // frame crossfade first → last
      const perFrame = 5.4 / Math.max(1, FRAMES.length - 1);
      for (let i = 0; i < frames.length - 1; i++) {
        const t = i * perFrame;
        tl.to(frames[i], { opacity: 0, duration: perFrame, ease: "none" }, t);
        if (frames[i + 1]) tl.to(frames[i + 1], { opacity: 1, duration: perFrame, ease: "none" }, t);
      }

      // light sweep
      tl.to(sweepRef.current, { opacity: 0.65, xPercent: 110, duration: 2.8, ease: "power1.inOut" }, 0.5);
      tl.to(sweepRef.current, { opacity: 0, duration: 0.5, ease: "power2.in" }, 3.3);

      // background glow
      tl.to(bgGlowRef.current, { opacity: 0.24, duration: 3.8, ease: "power1.in" }, 0.3);

      // gold rings
      rings.forEach((ring, i) => {
        tl.to(ring, { scale: 0.85 + i * 0.12, opacity: 0.3 - i * 0.07, rotation: i % 2 ? -70 : 80, duration: 4.2, ease: "power2.out" }, 0.2 + i * 0.4);
      });

      // palette pop
      tl.to(kitRef.current, { scale: 1.1, duration: 0.7, ease: "power3.out" }, 2.4);
      tl.to(kitRef.current, { scale: 1, duration: 0.8, ease: "power2.inOut" }, 3.1);

      // products BURST out from the kit center
      items.forEach((el, i) => {
        if (i >= HERO_ITEMS.length) return;
        const it = HERO_ITEMS[i];
        const stagger = 3.4 + i * 0.3;

        // First: quick opacity pop so it appears from inside the kit
        tl.to(el, { opacity: 1, scale: 0.3, filter: "blur(8px)", duration: 0.3, ease: "power2.out" }, stagger);

        // Then: shoot outward to final position with overshoot
        tl.to(el, {
          x: it.xVw * vw, y: it.yVh * vh,
          scale: 1, rotation: it.rot, filter: "blur(0px)",
          duration: 2.4, ease: "back.out(1.7)",
        }, stagger + 0.2);
      });

      // product labels fade in after products land
      labels.forEach((lbl, i) => {
        tl.to(lbl, { opacity: 0.85, y: 0, duration: 0.8, ease: "power2.out" }, 4.8 + i * 0.2);
      });

      // glow halos
      glows.forEach((g, i) => {
        tl.to(g, { opacity: 0.6, scale: 1, duration: 1.5, ease: "power2.out" }, 4.2 + i * 0.3);
      });

      // subtitle
      tl.to(subtitleRef.current, { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.4, ease: "power2.out" }, 6);

      // headline
      tl.to(titleRef.current, { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.8, ease: "power2.out" }, 6.8);

      // sparkles
      tl.to(sparkleRef.current, { opacity: 1, duration: 2.4, ease: "power1.in" }, 7);

      // shimmer
      tl.to(shimmerRef.current, { opacity: 0.6, scaleX: 1, duration: 2, ease: "power2.out" }, 5.2);

      watchSequenceEnd(tl, fireEnd);
    });

    // ═══════════════════════ MOBILE < 768 px ════════════════════════
    mm.add("(max-width: 767px)", () => {
      const vw = window.innerWidth / 100;
      const vh = window.innerHeight / 100;
      const frames = frameRefs.current.filter(Boolean) as HTMLImageElement[];
      const items = itemRefs.current.filter(Boolean) as HTMLDivElement[];
      const glows = glowRefs.current.filter(Boolean) as HTMLDivElement[];

      const mLabels = wrapperRef.current?.querySelectorAll<HTMLSpanElement>(".product-label") ?? [];

      frames.forEach((f, i) => gsap.set(f, { opacity: i === 0 ? 1 : 0 }));
      items.forEach((el, i) => {
        gsap.set(el, { opacity: 0, scale: 0, filter: "blur(12px)", x: 0, y: 0, rotation: (HERO_ITEMS[i]?.startRot ?? 0) * 0.5 });
      });
      mLabels.forEach((lbl) => gsap.set(lbl, { opacity: 0, y: 6 }));
      glows.forEach((g) => gsap.set(g, { opacity: 0, scale: 0.3 }));
      gsap.set(cueRef.current, { opacity: 1, y: 0 });
      gsap.set(bgGlowRef.current, { opacity: 0 });
      gsap.set(sparkleRef.current, { opacity: 0 });
      gsap.set(titleRef.current, { opacity: 0, y: 40, filter: "blur(22px)" });
      gsap.set(subtitleRef.current, { opacity: 0, y: 22, filter: "blur(14px)" });
      gsap.set(kitRef.current, { scale: 0.78 });

      const tl = gsap.timeline({
        scrollTrigger: { trigger: wrapperRef.current, start: "top top", end: "+=400%", scrub: 0.8, pin: true },
      });

      tl.to(cueRef.current, { opacity: 0, y: -22, duration: 0.4 }, 0);
      tl.to(kitRef.current, { scale: 1, duration: 2.2, ease: "power2.out" }, 0);

      const perFrame = 3.6 / Math.max(1, FRAMES.length - 1);
      for (let i = 0; i < frames.length - 1; i++) {
        const t = i * perFrame;
        tl.to(frames[i], { opacity: 0, duration: perFrame, ease: "none" }, t);
        if (frames[i + 1]) tl.to(frames[i + 1], { opacity: 1, duration: perFrame, ease: "none" }, t);
      }

      tl.to(bgGlowRef.current, { opacity: 0.14, duration: 2 }, 0.4);

      items.forEach((el, i) => {
        if (i >= HERO_ITEMS.length) return;
        const it = HERO_ITEMS[i];
        const ms = 2.5 + i * 0.15;
        tl.to(el, { opacity: 1, scale: 0.3, filter: "blur(6px)", duration: 0.2, ease: "power2.out" }, ms);
        tl.to(el, {
          x: it.mX * vw, y: it.mY * vh,
          scale: 1, rotation: it.rot * 0.5, filter: "blur(0px)",
          duration: 1.2, ease: "back.out(1.4)",
        }, ms + 0.15);
      });

      mLabels.forEach((lbl, i) => {
        tl.to(lbl, { opacity: 0.85, y: 0, duration: 0.5, ease: "power2.out" }, 3.6 + i * 0.1);
      });

      glows.forEach((g, i) => {
        tl.to(g, { opacity: 0.4, scale: 0.8, duration: 1, ease: "power2.out" }, 3.0 + i * 0.15);
      });

      tl.to(subtitleRef.current, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.8 }, 4.2);
      tl.to(titleRef.current, { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.1 }, 4.8);
      tl.to(sparkleRef.current, { opacity: 0.6, duration: 1.5 }, 5.2);

      watchSequenceEnd(tl, fireEnd);
    });

    return () => mm.revert();
  }, { scope: wrapperRef });

  // Initial inline states match the first GSAP frame so the server-rendered
  // HTML doesn't flash before hydration.
  return (
    <section
      ref={wrapperRef}
      aria-label={title}
      style={{
        height: "100vh",
        width: "100%",
        overflow: "hidden",
        background: IVORY,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      {/* ── Radial warm glow ──────────────────────────────────────── */}
      <div
        ref={bgGlowRef}
        style={{
          position: "absolute", inset: 0, opacity: 0,
          background: `radial-gradient(ellipse 65% 60% at 50% 48%, rgba(176,141,87,0.3), rgba(243,220,212,0.2), transparent 75%)`,
          pointerEvents: "none", willChange: "opacity",
        }}
      />

      {/* ── Gold rings ────────────────────────────────────────────── */}
      {[0, 1, 2].map((i) => (
        <div
          key={`ring-${i}`}
          ref={(el) => { ringRefs.current[i] = el; }}
          style={{
            position: "absolute", left: "50%", top: "50%",
            width: `min(${500 + i * 190}px, ${56 + i * 14}vw)`,
            aspectRatio: "1", borderRadius: "50%",
            border: "1px solid rgba(176,141,87,0.12)",
            transform: "translate(-50%, -50%)",
            opacity: 0.03,
            pointerEvents: "none", willChange: "transform, opacity",
          }}
        />
      ))}

      {/* ── Sparkles ──────────────────────────────────────────────── */}
      <div ref={sparkleRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0 }}>
        {SPARKLES.map((sp, i) => (
          <span
            key={`sp-${i}`}
            style={{
              position: "absolute", left: `${sp.x}%`, top: `${sp.y}%`,
              fontSize: `${sp.sz}px`,
              color: i % 3 === 0 ? GOLD : i % 3 === 1 ? BURGUNDY : MAUVE,
              lineHeight: 1,
              animation: `sparkle 2.1s ease-in-out ${sp.d}s infinite`,
              transformOrigin: "center",
            }}
          >✦</span>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MAIN KIT — BIG center image, the hero of the page
      ═══════════════════════════════════════════════════════════════ */}
      <div
        ref={kitRef}
        style={{
          position: "relative",
          width: "min(700px, 78vw)",
          height: "min(700px, 78vw)",
          transform: "scale(0.72)",
          willChange: "transform",
          flexShrink: 0,
          zIndex: 2,
          filter: "drop-shadow(0 24px 60px rgba(107,39,55,0.16)) drop-shadow(0 8px 20px rgba(176,141,87,0.1))",
        }}
      >
        {FRAMES.map((src, i) => (
          <Image
            key={`frame-${i}`}
            ref={(el) => { frameRefs.current[i] = el; }}
            src={src}
            alt={i === 0 ? `${title} — closed case` : i === FRAMES.length - 1 ? `${title} — open, showing everything inside` : ""}
            fill
            sizes="(max-width: 897px) 78vw, 700px"
            preload={i === 0}
            loading={i === 0 ? undefined : "eager"}
            draggable={false}
            unoptimized={!canOptimize(src)}
            style={{ objectFit: "contain", opacity: i === 0 ? 1 : 0, willChange: "opacity" }}
          />
        ))}

        {/* Light sweep */}
        <div
          ref={sweepRef}
          style={{
            position: "absolute", inset: "4%", opacity: 0,
            background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.94) 48%, rgba(176,141,87,0.5) 50%, transparent 68%)",
            mixBlendMode: "screen", pointerEvents: "none",
            filter: "blur(5px)", willChange: "transform, opacity",
          }}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          PRODUCT CUTOUTS — real transparent PNGs, flying out from the kit
      ═══════════════════════════════════════════════════════════════ */}
      {HERO_ITEMS.map((item, i) => (
        <div
          key={`item-${i}`}
          ref={(el) => { itemRefs.current[i] = el; }}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            marginLeft: `${-(item.w / 2)}vw`,
            marginTop: `${-(item.w / 2)}vw`,
            width: `clamp(${item.w * 5.5}px, ${item.w}vw, ${item.w * 12}px)`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            opacity: 0,
            willChange: "transform, opacity, filter",
            zIndex: 4,
          }}
        >
          {/* Gold glow halo behind product */}
          <div
            ref={(el) => { glowRefs.current[i] = el; }}
            style={{
              position: "absolute", inset: "-35%", borderRadius: "50%", opacity: 0,
              background: `radial-gradient(ellipse at center, rgba(176,141,87,0.22) 0%, rgba(243,220,212,0.1) 35%, transparent 60%)`,
              pointerEvents: "none", willChange: "opacity, transform",
            }}
          />

          {/* Product image — transparent PNG */}
          <Image
            src={item.src}
            alt={item.label}
            width={480}
            height={480}
            sizes="(max-width: 767px) 30vw, 15vw"
            draggable={false}
            unoptimized={!canOptimize(item.src)}
            style={{
              position: "relative",
              width: "100%",
              height: "auto",
              display: "block",
              filter: "drop-shadow(0 6px 16px rgba(107,39,55,0.22)) drop-shadow(0 2px 4px rgba(0,0,0,0.08))",
            }}
          />

          {/* Product name */}
          <span
            className="product-label"
            style={{
              marginTop: "0.35rem",
              fontFamily: "var(--font-sora), sans-serif",
              fontSize: "clamp(0.42rem, 0.65vw, 0.6rem)",
              fontWeight: 500,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: BURGUNDY,
              whiteSpace: "nowrap",
              textAlign: "center",
              textShadow: "0 1px 3px rgba(251,243,234,0.8)",
              opacity: 0,
            }}
          >
            {item.label}
          </span>
        </div>
      ))}

      {/* ── Gold shimmer line ──────────────────────────────────────── */}
      <div
        ref={shimmerRef}
        style={{
          position: "absolute",
          bottom: "calc(50% - min(350px, 39vw) - 10px)",
          left: "50%", transform: "translateX(-50%)", opacity: 0,
          width: "min(550px, 65vw)", height: "1px",
          background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
          pointerEvents: "none", willChange: "transform, opacity",
        }}
      />

      {/* ── Subtitle ──────────────────────────────────────────────── */}
      <div
        ref={subtitleRef}
        style={{
          position: "absolute",
          bottom: "clamp(7rem, 14vh, 9.5rem)",
          left: "50%", transform: "translateX(-50%)", opacity: 0,
          zIndex: 10, willChange: "transform, opacity, filter",
        }}
      >
        <p style={{
          fontFamily: "var(--font-sora), sans-serif", fontSize: "0.6rem",
          letterSpacing: "0.25em", textTransform: "uppercase",
          color: GOLD, margin: 0, whiteSpace: "nowrap",
        }}>
          {subtitle}
        </p>
      </div>

      {/* ── Headline ──────────────────────────────────────────────── */}
      <div
        ref={titleRef}
        style={{
          position: "absolute",
          bottom: "clamp(3rem, 6vh, 5.5rem)",
          left: "50%", transform: "translateX(-50%)", opacity: 0,
          textAlign: "center", zIndex: 10,
          willChange: "transform, opacity, filter",
        }}
      >
        <h1 style={{
          fontFamily: "var(--font-fraunces), serif",
          fontSize: "clamp(1.4rem, 3vw, 2.5rem)",
          fontWeight: 300, fontStyle: "italic",
          color: BURGUNDY, lineHeight: 1.15,
          margin: 0, whiteSpace: "nowrap",
        }}>
          {title}
        </h1>
      </div>

      {/* ── SCROLL TO OPEN ────────────────────────────────────────── */}
      <div
        ref={cueRef}
        style={{
          position: "absolute", bottom: "1.5rem",
          left: "50%", transform: "translateX(-50%)",
          display: "flex", flexDirection: "column",
          alignItems: "center", gap: "0.5rem",
          zIndex: 10, willChange: "opacity, transform",
        }}
      >
        <span style={{
          fontFamily: "var(--font-sora), sans-serif", fontSize: "0.56rem",
          letterSpacing: "0.3em", textTransform: "uppercase",
          color: GOLD, fontWeight: 500,
        }}>
          Scroll to open
        </span>
        <div style={{
          width: "1px", height: "30px",
          background: `linear-gradient(to bottom, ${GOLD}, transparent)`,
          animation: "scrollPulse 2s ease-in-out infinite",
        }} />
      </div>
    </section>
  );
}
