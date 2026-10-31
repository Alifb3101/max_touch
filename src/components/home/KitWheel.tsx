"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import CartButton from "@/components/layout/CartButton";
import { pad } from "@/lib/format";
import { canOptimize } from "@/lib/media";
import type { KitCard, Size } from "@/lib/types";

// ── Wheel geometry ────────────────────────────────────────────────────────────
// Kits sit on a large circle whose centre is below the screen; the active kit
// is at the top of the circle. `step` is the angle between neighbouring kits.
interface Layout {
  mobile: boolean;
  kit: number;
  radius: number;
  step: number;
  cy: number;
  dialR: number;
}

function computeLayout(vw: number, vh: number): Layout {
  if (vw < 768) {
    const kit = Math.min(vw * 0.82, vh * 0.42);
    const radius = vw * 1.15;
    return { mobile: true, kit, radius, step: 30, cy: vh * 0.44, dialR: radius - kit * 0.6 };
  }
  const kit = Math.min(vh * 0.56, vw * 0.36, 660);
  const radius = Math.max(vw * 0.64, kit * 1.6);
  return { mobile: false, kit, radius, step: 24, cy: vh * 0.5, dialR: radius - kit * 0.6 };
}

// Used for the server render; replaced by the real viewport before first paint after hydration.
const SSR_LAYOUT = computeLayout(1440, 900);

const SPARKLES = [
  { x: 8, y: 22, sz: 14, d: 0 },
  { x: 92, y: 18, sz: 12, d: 0.6 },
  { x: 30, y: 16, sz: 10, d: 1.2 },
  { x: 70, y: 13, sz: 11, d: 0.3 },
  { x: 96, y: 52, sz: 13, d: 1.6 },
  { x: 4, y: 64, sz: 11, d: 0.9 },
  { x: 24, y: 78, sz: 10, d: 1.9 },
  { x: 78, y: 74, sz: 12, d: 0.4 },
  { x: 60, y: 30, sz: 9, d: 2.2 },
  { x: 38, y: 34, sz: 9, d: 1.4 },
];
const SPARKLE_COLORS = ["#B08D57", "#6B2737", "#D8C4BC"];

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const clamp01 = (v: number) => clamp(v, 0, 1);
const wrap = (v: number, n: number) => {
  const r = ((v % n) + n) % n;
  return r > n / 2 ? r - n : r;
};

interface KitWheelProps {
  sizes: Size[];
  kits: KitCard[];
}

export default function KitWheel({ sizes, kits: allKits }: KitWheelProps) {
  const router = useRouter();

  const kitsBySize = useMemo(() => {
    const map: Record<string, KitCard[]> = {};
    for (const s of sizes) map[s.slug] = [];
    for (const k of allKits) (map[k.sizeSlug] ??= []).push(k);
    return map;
  }, [sizes, allKits]);

  const initialSize = useMemo(() => {
    if (kitsBySize.medium?.length) return "medium";
    return sizes.find((s) => kitsBySize[s.slug]?.length)?.slug ?? sizes[0]?.slug ?? "";
  }, [sizes, kitsBySize]);

  const [tab, setTab] = useState(initialSize);
  const [size, setSize] = useState(initialSize);
  const [active, setActive] = useState(0);
  const [layout, setLayout] = useState<Layout>(SSR_LAYOUT);
  const [mounted, setMounted] = useState(false);
  const [touched, setTouched] = useState(false);

  const kits = kitsBySize[size] ?? [];

  const stageRef = useRef<HTMLDivElement>(null);
  const dialRef = useRef<HTMLDivElement>(null);
  const pulseRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const kitsRef = useRef(kits);
  kitsRef.current = kits;
  const tabRef = useRef(tab);
  const activeRef = useRef(0);

  // `current` chases `target`; `spin` and `out` are driven by GSAP for the
  // intro and tab-switch transitions.
  const motion = useRef({
    current: 0,
    target: 0,
    anchor: 0,
    spin: -3,
    out: 1,
    vel: 0,
    lastPos: -3,
    resetVel: false,
    dirty: true,
  }).current;

  const openKit = useCallback(
    (kit: KitCard) => {
      router.push(`/kits/${kit.slug}`);
    },
    [router],
  );

  useLayoutEffect(() => {
    setLayout(computeLayout(window.innerWidth, window.innerHeight));
    setMounted(true);
  }, []);

  // ── Render loop: the only place kit transforms are written ──────────────
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lerpRate = reduced ? 40 : 6.5;
    let last = performance.now();
    let lastSig = "";

    const tick = () => {
      const now = performance.now();
      const dt = clamp((now - last) / 1000, 0.001, 0.05);
      last = now;

      const L = layoutRef.current;
      const n = kitsRef.current.length;
      if (n === 0) return;

      motion.current += (motion.target - motion.current) * (1 - Math.exp(-dt * lerpRate));
      if (Math.abs(motion.target - motion.current) < 0.0004) motion.current = motion.target;

      const pos = motion.current + motion.spin;
      if (motion.resetVel) {
        motion.lastPos = pos;
        motion.vel = 0;
        motion.resetVel = false;
      }
      const rawVel = (pos - motion.lastPos) / dt;
      motion.lastPos = pos;
      motion.vel += (rawVel - motion.vel) * (1 - Math.exp(-dt * 8));
      if (Math.abs(motion.vel) < 0.002) motion.vel = 0;

      const idx = ((Math.round(motion.current) % n) + n) % n;
      if (idx !== activeRef.current) {
        activeRef.current = idx;
        setActive(idx);
      }

      const sig = `${pos.toFixed(5)}|${motion.out.toFixed(4)}|${motion.vel.toFixed(3)}`;
      if (sig === lastSig && !motion.dirty) return;
      lastSig = sig;
      motion.dirty = false;

      const stepRad = (L.step * Math.PI) / 180;
      const speed = Math.abs(motion.vel);
      const velTilt = reduced ? 0 : clamp(motion.vel * 2.4, -16, 16);
      const squash = reduced ? 1 : 1 - Math.min(speed * 0.012, 0.08);

      for (let i = 0; i < n; i++) {
        const el = itemRefs.current[i];
        if (!el) continue;

        const rel = wrap(i - pos, n);
        const a = Math.abs(rel);
        const near = Math.exp(-a * a * 1.15);
        const o = clamp01(motion.out * 1.6 - a * 0.15);
        const vis = clamp01((2.6 - a) / 0.8) * (1 - o);

        if (vis < 0.004) {
          if (el.style.visibility !== "hidden") el.style.visibility = "hidden";
          continue;
        }
        if (el.style.visibility !== "visible") el.style.visibility = "visible";

        const th = rel * stepRad;
        const x = Math.sin(th) * L.radius;
        const y = (1 - Math.cos(th)) * L.radius + o * L.kit * 0.6;
        const s = (0.5 + 0.5 * near) * (1 - o * 0.5) * squash;
        const rz = rel * L.step + velTilt * (0.35 + 0.65 * near) + o * rel * 32;
        const ry = clamp(-rel * 30, -65, 65);

        el.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) rotate(${rz.toFixed(3)}deg) perspective(1400px) rotateY(${ry.toFixed(3)}deg) scale(${s.toFixed(4)})`;
        el.style.opacity = (vis * (0.62 + 0.38 * near)).toFixed(3);
        el.style.zIndex = String(100 - Math.round(a * 10));
      }

      if (dialRef.current) {
        dialRef.current.style.transform = `rotate(${(-pos * L.step).toFixed(3)}deg)`;
        dialRef.current.style.opacity = (1 - motion.out * 0.7).toFixed(3);
      }
    };

    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [motion]);

  // ── Intro: the wheel spins the first set of kits into place ─────────────
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    motion.spin = -3;
    motion.out = 1;
    motion.resetVel = true;
    const tween = gsap.to(motion, {
      spin: 0,
      out: 0,
      duration: reduced ? 0.01 : 1.9,
      delay: reduced ? 0 : 0.25,
      ease: "expo.out",
    });
    return () => {
      tween.kill();
    };
  }, [motion]);

  useEffect(() => {
    const onResize = () => {
      setLayout(computeLayout(window.innerWidth, window.innerHeight));
      motion.dirty = true;
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [motion]);

  // New kits mount hidden; force the loop to place them on the next frame.
  useLayoutEffect(() => {
    motion.dirty = true;
  }, [size, layout, motion]);

  // Warm up the product page of the kit in focus.
  const focusedSlug = kits[active]?.slug;
  useEffect(() => {
    if (focusedSlug) router.prefetch(`/kits/${focusedSlug}`);
  }, [focusedSlug, router]);

  // ── Tab switch: spin the current set out, swap, spin the new set in ─────
  const switchSize = useCallback(
    (next: string) => {
      if (next === tabRef.current) return;
      tabRef.current = next;
      setTab(next);
      setTouched(true);

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      tlRef.current?.kill();
      const tl = gsap.timeline();
      tl.to(motion, { spin: motion.spin + 2.4, out: 1, duration: reduced ? 0.01 : 0.55, ease: "power3.in" });
      tl.add(() => {
        setSize(next);
        activeRef.current = 0;
        setActive(0);
        motion.current = 0;
        motion.target = 0;
        motion.anchor = 0;
        motion.spin = -2.8;
        motion.resetVel = true;
        motion.dirty = true;
        if (pulseRef.current && !reduced) {
          gsap.fromTo(
            pulseRef.current,
            { scale: 0.35, opacity: 0.9 },
            { scale: 2.8, opacity: 0, duration: 1.3, ease: "expo.out" },
          );
        }
      });
      tl.to(motion, { spin: 0, out: 0, duration: reduced ? 0.01 : 1.5, ease: "expo.out" }, "+=0.05");
      tlRef.current = tl;
    },
    [motion],
  );

  useEffect(() => () => void tlRef.current?.kill(), []);

  // ── Input: wheel / trackpad, drag & swipe, keyboard, click ──────────────
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let snapTimer = 0;

    const snap = () => {
      const diff = motion.target - motion.anchor;
      const next =
        Math.abs(diff) < 0.12
          ? motion.anchor
          : motion.anchor + Math.sign(diff) * Math.max(1, Math.round(Math.abs(diff)));
      motion.target = next;
      motion.anchor = next;
    };
    const scheduleSnap = (ms: number) => {
      window.clearTimeout(snapTimer);
      snapTimer = window.setTimeout(snap, ms);
    };
    const go = (steps: number) => {
      motion.anchor = Math.round(motion.target) + steps;
      motion.target = motion.anchor;
      setTouched(true);
    };
    const nudge = (delta: number) => {
      motion.target = clamp(motion.target + delta, motion.current - 3, motion.current + 3);
      setTouched(true);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      let d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (e.deltaMode === 1) d *= 33;
      else if (e.deltaMode === 2) d *= window.innerHeight;
      nudge(clamp(d, -140, 140) / 360);
      scheduleSnap(140);
    };

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select")) return;
      if (["ArrowRight", "ArrowDown", "PageDown"].includes(e.key)) {
        e.preventDefault();
        go(1);
      } else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault();
        go(-1);
      }
    };

    let drag: { id: number; x: number; y: number; start: number; moved: boolean; t: number; d: number; v: number } | null = null;

    const dragDistance = (e: PointerEvent) => {
      if (!drag) return 0;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      return Math.abs(dx) >= Math.abs(dy) ? dx : dy;
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      window.clearTimeout(snapTimer);
      motion.anchor = Math.round(motion.target);
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, start: motion.target, moved: false, t: performance.now(), d: 0, v: 0 };
      stage.setPointerCapture(e.pointerId);
    };

    const onMove = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = dragDistance(e);
      if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) {
        drag.moved = true;
        stage.classList.add("is-dragging");
        setTouched(true);
      }
      if (!drag.moved) return;
      const now = performance.now();
      const dt = Math.max(1, now - drag.t);
      drag.v = drag.v * 0.6 + ((d - drag.d) / dt) * 0.4;
      drag.t = now;
      drag.d = d;
      motion.target = drag.start - d / (layoutRef.current.kit * 0.75);
    };

    const onUp = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const wasDrag = drag.moved;
      const v = drag.v;
      drag = null;
      stage.classList.remove("is-dragging");
      if (stage.hasPointerCapture(e.pointerId)) stage.releasePointerCapture(e.pointerId);

      if (wasDrag) {
        const fling = (-v * 1000 * 0.22) / (layoutRef.current.kit * 0.75);
        motion.target += clamp(fling, -3, 3);
        snap();
        return;
      }

      const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-kit]");
      if (!hit) return;
      const n = kitsRef.current.length;
      if (n === 0) return;
      const rel = Math.round(wrap(Number(hit.dataset.kit) - Math.round(motion.target), n));
      if (rel === 0) openKit(kitsRef.current[Number(hit.dataset.kit)]);
      else go(rel);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerup", onUp);
    stage.addEventListener("pointercancel", onUp);
    return () => {
      window.clearTimeout(snapTimer);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerup", onUp);
      stage.removeEventListener("pointercancel", onUp);
    };
  }, [motion, openKit]);

  // Kit links stay crawlable, but pointer clicks are handled by the stage above.
  const preventNativeClick = useCallback((e: ReactMouseEvent<HTMLAnchorElement>) => {
    if (e.detail > 0) e.preventDefault();
  }, []);

  // ── Sliding tab indicator ────────────────────────────────────────────────
  const [indicator, setIndicator] = useState({ x: 0, w: 0 });
  useLayoutEffect(() => {
    const measure = () => {
      const b = tabRefs.current[tab];
      if (b) setIndicator({ x: b.offsetLeft, w: b.offsetWidth });
    };
    measure();
    document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [tab]);

  const kit = kits[active] ?? kits[0];
  const sizeLabel = sizes.find((s) => s.slug === size)?.label ?? "";
  const tagSize = Math.max(11, layout.kit * 0.03);
  const kitSizes = layout.mobile ? "82vw" : `${Math.round(layout.kit)}px`;

  return (
    <div className="mt-home" style={{ "--cy": `${layout.cy}px`, "--kit": `${layout.kit}px` } as CSSProperties}>
      <h1 className="sr-only">Max Touch makeup kits and gift kits — big, medium and small</h1>

      {/* ── NAV ─────────────────────────────────────────────────────── */}
      <nav className="mt-nav">
        <Link href="/" className="mt-logo" aria-label="Max Touch — home">
          Max <em>Touch</em>
        </Link>
        <div className="mt-tabs" role="tablist" aria-label="Kit size"
          style={sizes.length ? undefined : { visibility: "hidden" }}
        >
          <span
            className="mt-tab-ind"
            style={{ width: indicator.w, transform: `translateX(${indicator.x}px)` }}
          />
          {sizes.map((s) => (
            <button
              key={s.id}
              ref={(el) => {
                tabRefs.current[s.slug] = el;
              }}
              role="tab"
              aria-selected={tab === s.slug}
              className={`mt-tab${tab === s.slug ? " is-active" : ""}`}
              onClick={() => switchSize(s.slug)}
            >
              {s.label}
              <span className="mt-tab-count">{kitsBySize[s.slug]?.length ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="mt-actions">
          <Link href="/makeup-kits" className="mt-shop-all">
            Shop all
          </Link>
          <CartButton />
        </div>
      </nav>

      {/* ── WHEEL ───────────────────────────────────────────────────── */}
      <div ref={stageRef} className="mt-stage">
        <div className="mt-bg" />
        <div className="mt-grain" />
        <div className="mt-sparkles" aria-hidden>
          {SPARKLES.map((sp, i) => (
            <span
              key={i}
              style={{
                left: `${sp.x}%`,
                top: `${sp.y}%`,
                fontSize: sp.sz,
                color: SPARKLE_COLORS[i % SPARKLE_COLORS.length],
                animationDelay: `${sp.d}s`,
              }}
            >
              ✦
            </span>
          ))}
        </div>
        <div className="mt-floor" />
        {mounted && (
          <>
            <div
              className="mt-dial-wrap"
              style={{
                top: layout.cy + layout.radius,
                width: (layout.dialR + 48) * 2,
                height: (layout.dialR + 48) * 2,
              }}
            >
              <div ref={dialRef} className="mt-dial" style={{ opacity: 0.3 }}>
                <Dial r={layout.dialR} step={layout.step} />
              </div>
            </div>
            <div className="mt-pointer" style={{ top: layout.cy + layout.kit * 0.6 - 18 }} />
          </>
        )}
        <div
          ref={pulseRef}
          className="mt-pulse"
          style={{ width: layout.kit, height: layout.kit, top: layout.cy - layout.kit / 2 }}
        />

        <div key={size} className="mt-wheel">
          {kits.map((k, i) => (
            <a
              key={k.id}
              href={`/kits/${k.slug}`}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              data-kit={i}
              tabIndex={-1}
              draggable={false}
              onClick={preventNativeClick}
              className="mt-kit"
              style={{ width: layout.kit, height: layout.kit, top: layout.cy - layout.kit / 2 }}
            >
              {k.image ? (
                <Image
                  src={k.image}
                  alt={`${k.name} makeup kit`}
                  fill
                  sizes={kitSizes}
                  draggable={false}
                  preload={i === 0 && size === initialSize}
                  unoptimized={!canOptimize(k.image)}
                />
              ) : (
                <div className="mt-kit-fallback" />
              )}
              <span className="mt-tag" style={{ fontSize: tagSize }}>
                {k.name}
              </span>
            </a>
          ))}
        </div>

        {kits.length === 0 && (
          <div className="mt-empty">
            <p>New kits are on their way</p>
            <p>Check back soon</p>
          </div>
        )}
      </div>

      <div className="mt-vignette" />

      {kit && (
        <>
          {/* ── ACTIVE KIT CARD ─────────────────────────────────────────── */}
          <aside className="mt-card" aria-live="polite">
            <div key={`${size}-${active}`}>
              <p className="mt-eyebrow mt-rise" style={{ "--d": "0ms" } as CSSProperties}>
                <span>{pad(active + 1)}</span>
                <i />
                {sizeLabel} kit
                <span className="mt-eyebrow-total">/ {pad(kits.length)}</span>
              </p>
              <h2 className="mt-title" aria-label={kit.name}>
                <SplitTitle text={kit.name} />
              </h2>
              {kit.sku && (
                <p className="mt-model mt-rise" style={{ "--d": "80ms" } as CSSProperties}>
                  Model No. <b>{kit.sku}</b>
                </p>
              )}
              {kit.tagline && (
                <p className="mt-tagline mt-rise" style={{ "--d": "120ms" } as CSSProperties}>
                  {kit.tagline}
                </p>
              )}
              <div className="mt-card-foot mt-rise" style={{ "--d": "200ms" } as CSSProperties}>
                <span className="mt-pieces">
                  {kit.pieces ? (
                    <>
                      <b>{kit.pieces}</b> pieces
                    </>
                  ) : null}
                </span>
                <Link href={`/kits/${kit.slug}`} className="mt-view">
                  View kit
                  <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden>
                    <path d="M0 5h16M12 1l4 4-4 4" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                </Link>
              </div>
            </div>
          </aside>

          {/* ── COUNTER ─────────────────────────────────────────────────── */}
          <div className="mt-counter" aria-hidden>
            <div className="mt-counter-num">
              <span key={`${size}-${active}`} className="mt-counter-cur">
                {pad(active + 1)}
              </span>
              <span className="mt-counter-total">/ {pad(kits.length)}</span>
            </div>
            <div className="mt-counter-bar">
              <span style={{ transform: `scaleX(${(active + 1) / kits.length})` }} />
            </div>
          </div>

          <div className={`mt-hint${touched ? " is-hidden" : ""}`} aria-hidden>
            <span className="mt-hint-mouse" />
            Scroll to rotate
          </div>
        </>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SplitTitle({ text }: { text: string }) {
  let i = 0;
  return (
    <>
      {text.split(" ").map((word, w) => (
        <span key={w} className="mt-word" aria-hidden>
          {[...word].map((ch) => (
            <span key={i} className="mt-char" style={{ "--i": i++ } as CSSProperties}>
              {ch}
            </span>
          ))}
        </span>
      ))}
    </>
  );
}

function Dial({ r, step }: { r: number; step: number }) {
  const size = (r + 48) * 2;
  const c = size / 2;
  const ticks = useMemo(() => {
    const per = step / 12;
    const count = Math.round(360 / per);
    let minor = "";
    let major = "";
    for (let k = 0; k < count; k++) {
      const ang = (k * per * Math.PI) / 180;
      const isMajor = k % 12 === 0;
      const len = isMajor ? 22 : k % 6 === 0 ? 12 : 6;
      const sin = Math.sin(ang);
      const cos = Math.cos(ang);
      const seg = `M${(c + sin * r).toFixed(1)} ${(c - cos * r).toFixed(1)}L${(c + sin * (r + len)).toFixed(1)} ${(c - cos * (r + len)).toFixed(1)}`;
      if (isMajor) major += seg;
      else minor += seg;
    }
    return { minor, major };
  }, [r, step, c]);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(176,141,87,0.55)" strokeWidth="1" />
      <circle cx={c} cy={c} r={r + 36} fill="none" stroke="rgba(176,141,87,0.35)" strokeWidth="1" strokeDasharray="2 7" />
      <path d={ticks.minor} stroke="rgba(176,141,87,0.6)" strokeWidth="1" />
      <path d={ticks.major} stroke="#6B2737" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
