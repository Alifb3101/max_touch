import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes every cached page after catalog edits. Point a Supabase Database
 * Webhook (products / product_* tables) at:
 *   POST {SITE_URL}/api/revalidate   with header  x-revalidate-secret: <REVALIDATE_SECRET>
 */
export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  const provided = request.headers.get("x-revalidate-secret") ?? request.nextUrl.searchParams.get("secret");
  if (!secret || secret.startsWith("change-me") || provided !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, revalidated: true });
}
