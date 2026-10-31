export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** False while `.env.local` still holds the placeholder values. */
export const isSupabaseConfigured =
  /^https?:\/\/.+/.test(SUPABASE_URL) &&
  !SUPABASE_URL.includes("your-project-ref") &&
  SUPABASE_KEY.length > 20 &&
  !SUPABASE_KEY.startsWith("your-");
