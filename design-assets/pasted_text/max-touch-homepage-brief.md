# Max Touch — Homepage Design Brief (Figma)

## What this is for
A premium, modern homepage design for Max Touch. The signature moment is the hero: the actual makeup vanity kit shown in `max-touch-reference-kit.png` (attached alongside this brief), animated to open on scroll exactly as it does in real life, with real products revealed one by one. This doc is the brief to hand your designer, or paste into a Figma AI drafting tool.

**Hard constraint: no black or near-black backgrounds anywhere on the page.** This is a cosmetics brand — the palette should feel warm, soft, and tactile, not tech/luxury-watch dark mode.

---

## 1. Hero — the vanity kit reveal (this is the centerpiece)

**Subject — use the reference photo provided (`max-touch-reference-kit.png`), not a generic kit.** This is a real multi-tier fold-out train case, so the animation should follow how it actually opens, not a simple box-lid concept:

1. **Lid lifts** — reveals the mirror, the brush set (4–5 brushes + 2 sponge tips), and the row of eye/lip pencils built into the lid.
2. **Side wings fold outward** on both left and right — each wing has two tiers of lip gloss tubes, lipstick tubes, and a foundation/concealer stick.
3. **Bottom drawers slide open** — left drawer reveals a grid of eyeshadow/blush pots, right drawer reveals a grid of lip-color pots, and the center-bottom tray reveals more lip wands and pencils.
4. The large center eyeshadow palette (visible once the case is fully open) gets its own dedicated pop/scale moment — it's the single most eye-catching item in the kit.

**On "one by one":** with 40+ individual items in this kit, animating every single one as a separate flying object will look busy rather than premium. Recommend: pick 8–10 hero items (palette, brush set, mirror, 2–3 standout lipsticks/glosses, one blush pot, one lip pot) and animate *those* individually, one after another, while each drawer/wing reveals its remaining contents as a single grouped motion when it opens. This keeps the "products coming out one by one" feeling you want without turning into visual clutter. If you'd rather every item fly out individually regardless, that's buildable too — flag it and the designer can plan for a longer/slower scroll sequence to fit it all in.

**Non-negotiable:** every product shown must be cut from the actual reference photo (or a fresh photo of the same physical kit), not an icon, illustration, or stand-in product.

**Design deliverable for this section:** at least 5 key frames — closed case, lid open, wings folded out, drawers open (full reveal), and final settled state with hero items called out — so the motion intent is unambiguous to whoever builds it. If your Figma has Smart Animate / prototype support, wire these as a scroll-triggered prototype flow.

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