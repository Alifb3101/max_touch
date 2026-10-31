import "server-only";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config";

let client: SupabaseClient | null = null;

/**
 * Cookie-less client for public catalog reads. Pages that only use this client
 * stay statically generated (ISR), which keeps product pages fast and crawlable.
 */
export function getPublicClient() {
  if (!isSupabaseConfigured) return null;
  client ??= createSupabaseClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
