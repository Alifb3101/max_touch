# Max Touch — Homepage Design Brief (Figma)

## What this is for
A premium, modern homepage design for Max Touch. The signature moment is the hero: a vanity/makeup kit that visually opens as the user scrolls, with real products photographed and revealed one by one. This doc is the brief to hand your designer, or paste into a Figma AI drafting tool.

**Hard constraint: no black or near-black backgrounds anywhere on the page.** This is a cosmetics brand — the palette should feel warm, soft, and tactile, not tech/luxury-watch dark mode.

---

## 1. Hero — the vanity kit reveal (this is the centerpiece)

**Subject:** Use one of the actual makeup kits Max Touch sells as the hero product — a real, proper makeup kit, not a generic placeholder box. This should look and feel like an actual product the customer can buy right after watching it unbox.

**Critical: the products that float out must match what is actually inside that specific kit.** Don't design generic filler items (a random lipstick, a random brush) — photograph the real kit, open it, and the products revealed on scroll should be exactly the items that customer receives. If the kit has 6 items, show those 6 items; if it's a 12-piece set, show those 12 (grouped/staged sensibly if that's too many to spread individually).

**The sequence, tied to scroll position:**
1. Kit sits closed, centered, on a soft studio backdrop (see palette below).
2. As the user scrolls, the lid lifts open (photographed open-lid shot, not an illustration).
3. Products from inside the kit float out and land one at a time — real photography of the actual items in that kit, each landing with a soft contact shadow, a short label, and price.
4. Section settles into a "Shop this kit" CTA once all products have landed.

**Non-negotiable:** every product shown must be an actual photographed product cutout of a real item from the kit, not an icon, illustration, or stand-in product. Icons will read cheap against a "crazy premium" brief — the whole effect depends on it looking like real photography moving, not a graphic.

**Design deliverable for this section:** at least 4 key frames showing the sequence at 0%, ~25%, ~70%, and 100% scroll progress, so the motion intent is unambiguous to whoever builds it. If your Figma has Smart Animate / prototype support, wire these as a scroll-triggered prototype flow.

**Mobile behavior:** the full fanned-out spread won't fit a narrow screen. Design a simplified mobile version — products can reveal in a vertical stack or a tighter cluster instead of spreading wide. Include a separate mobile frame for the hero, don't assume the desktop layout just shrinks.

---

## 2. Color palette — warm, cosmetics-forward, no black

Use these as a starting point, adjust to taste:

| Role | Color | Hex |
|---|---|---|
| Base background | Warm ivory | `#FBF3EA` |
| Secondary background / section break | Soft blush | `#F3DCD4` |
| Accent (buttons, highlights) | Warm metallic gold | `#B08D57` |
| Deep contrast (headlines, CTAs) | Deep wine/burgundy | `#6B2737` |
| Body text | Warm taupe | `#5A4A42` |
| Product shadow/backdrop | Muted mauve-grey | `#D8C4BC` |

Gold should read as a metallic accent (foil, product packaging, button borders) — not as the dominant color of every section. Burgundy carries the premium weight instead of black.

## 3. Typography

- **Display/headlines:** an elegant, slightly characterful serif — something like Fraunces or a comparable display serif with personality, not the default Playfair-everywhere look.
- **Body/UI:** a clean, modern sans (Inter, Sora, or similar) for labels, prices, and body copy — keep it simple so it doesn't compete with the serif.
- Avoid tracked-out all-caps labels on every heading — use them sparingly, only where it earns its place (e.g. a small "SCROLL TO OPEN" cue, not on every section title).

## 4. Homepage structure (below the hero)

1. **Trust strip** — thin band: cruelty-free, UAE-formulated/registered, fast Dubai delivery, whatever's actually true for the brand.
2. **Bestsellers shelf** — real product photography, horizontal scroll or grid, 4–6 kits.
3. **Shop by category** — Lips / Eyes / Face / Kits — editorial-style photography tiles, not icons.
4. **Brand/quality story** — one large photographic moment (ingredients, texture close-up, or lifestyle shot), restrained motion (a single fade/scale on scroll-into-view, nothing busier).
5. **Reviews / social proof** — real customer quotes/ratings if available.
6. **Newsletter signup** — a small reveal-style animation on submit (e.g. a gift/box opening motif) styled to the palette below.
7. **Footer** — standard.

## 5. Motion principles for the whole page

- One big orchestrated moment (the hero) — everything else should be quiet by comparison. Don't add fade-slide-up entrances to every section; that reads generic.
- Motion elsewhere should respond to scroll-into-view once, not loop or repeat.
- Respect `prefers-reduced-motion` — static fallback layout for every animated section.

## 6. What to hand back

- Desktop + mobile frames for the full homepage.
- The 4 key hero states described above, at both breakpoints.
- Exported color styles and text styles as Figma variables/styles (not just visually consistent — actually tokenized) so dev can pull exact values.
- A short annotation on the hero frame describing the scroll-to-progress mapping (what % of scroll = what visual state), so it translates directly into the scroll-animation build.