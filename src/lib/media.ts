import { SUPABASE_URL } from "./supabase/config";

const BUCKET = "products";

/** Accepts a full URL, a local path (starting with /), or a path inside the `products` storage bucket. */
export function mediaUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  // If it's already a full URL, return as-is
  if (/^https?:\/\//i.test(v)) return v;
  // If it starts with /, treat it as a local public path (e.g., /big/MT-2022.png)
  if (v.startsWith("/")) return v;
  // Otherwise, construct Supabase storage URL
  const base = SUPABASE_URL.replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${BUCKET}/${v.replace(/^\/+/, "").replace(new RegExp(`^${BUCKET}/`), "")}`;
}

/** next/image can only optimise hosts listed in next.config.ts → images.remotePatterns. */
export function canOptimize(src: string) {
  try {
    // Local paths (starting with /) can be optimized by Next.js
    if (src.startsWith("/")) return true;
    
    const { hostname, pathname } = new URL(src);
    const supabaseHost = SUPABASE_URL ? new URL(SUPABASE_URL).hostname : "";
    return (
      (hostname.endsWith(".supabase.co") || hostname === supabaseHost) &&
      pathname.startsWith("/storage/v1/object/public/")
    );
  } catch {
    return false;
  }
}
