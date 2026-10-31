# maxtouch-web

Max Touch storefront — luxury makeup kits (sizes: big, medium, small). Next.js 16 App Router + React 19 + Tailwind CSS v4, backed by Supabase (Postgres, Auth, Storage).

## Development

- `npm run dev` — dev server on http://localhost:8443
- `npm run build` / `npm start` — production build / serve
- `npm run typecheck` — TypeScript check
- Environment lives in `.env.local` (template: `.env.example`). With placeholder Supabase values the site still renders, showing empty states.

## Next.js 16 notes

- Request interception lives in `src/proxy.ts` (formerly `middleware.ts`); the exported function is `proxy`.
- `params` / `searchParams` are Promises — always `await` them.
- `next/image`: use `preload` (not the deprecated `priority`); allowed qualities are set in `next.config.ts`.

## Project structure

- `src/app/` — routes
  - `page.tsx` home (kit wheel), `makeup-kits/` category + `[size]` listings, `kits/[slug]` product page
  - `cart/`, `checkout/` (+ `actions.ts` server actions, `success/`)
  - `login/`, `signup/`, `forgot-password/`, `reset-password/`, `auth/confirm/route.ts` (email link handler)
  - `account/` profile, addresses, orders, `account/orders/[number]`
  - `sitemap.ts`, `robots.ts`, `manifest.ts`, `opengraph-image.tsx`, `icon.svg`, `not-found.tsx`
  - `api/revalidate/route.ts` — on-demand cache refresh (header `x-revalidate-secret`)
- `src/components/` — `home/KitWheel` (animated wheel), `product/` (Hero scroll sequence, ProductDrawer, ProductExperience, ProductDetails), `cart/`, `checkout/`, `account/`, `auth/`, `layout/`, `shop/`, `seo/`, `ui/`
- `src/lib/`
  - `catalog.ts` — server-only cached catalog reads (cookie-less client so pages stay ISR)
  - `supabase/` — `client.ts` (browser), `server.ts` (cookies, `getCurrentUser`), `public.ts` (anonymous), `config.ts`
  - `seo.ts` (JSON-LD builders), `site.ts` (site constants), `pricing.ts` (mirrors SQL totals), `format.ts`, `media.ts`, `types.ts`
- `supabase/migrations/` — database schema, RLS policies, RPCs (`place_order`, `validate_coupon`, `get_order_by_token`), storage bucket, seed rows
- `design-assets/` — original demo imagery and design references (not shipped)

## Data rules

- All catalog content comes from Supabase. Never hardcode products.
- Prices, stock and totals are authoritative only inside `place_order`; `src/lib/pricing.ts` must stay in sync with it.
- Product images live in the public `products` storage bucket; DB columns may hold either a bucket path or a full URL (`src/lib/media.ts`).

## Styling

Tailwind CSS v4 via `@tailwindcss/postcss`. Global CSS, theme tokens and the hand-tuned animation styles live in `src/app/globals.css`. Fonts are loaded with `next/font` in `src/app/layout.tsx` and exposed as `--font-fraunces`, `--font-sora`, `--font-jakarta`.

## Code quality

- Use double quotes for strings containing apostrophes, or escape them in JSX (`&apos;`).
- Ensure JSX tags are closed and braces are balanced.
- Export page/components as default exports unless a file intentionally exports several components.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
