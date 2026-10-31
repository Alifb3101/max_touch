"use client";

import { useState } from "react";
import type { FormEvent, InputHTMLAttributes } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SITE } from "@/lib/site";
import type { Address } from "@/lib/types";

type Status = { kind: "error" | "ok"; message: string } | null;

function Field({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="sp-field">
      <span className="sp-label">{label}</span>
      <input className="sp-input" {...props} />
    </label>
  );
}

function Notice({ status }: { status: Status }) {
  if (!status) return null;
  return <p className={`sp-alert ${status.kind === "error" ? "sp-alert-error" : "sp-alert-ok"}`}>{status.message}</p>;
}

// ── Sign out ─────────────────────────────────────────────────────────────────
export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      className="sp-btn sp-btn-ghost sp-btn-sm"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await createClient()?.auth.signOut();
        router.replace("/");
        router.refresh();
      }}
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}

// ── Profile ──────────────────────────────────────────────────────────────────
export function ProfileForm({ userId, fullName, phone }: { userId: string; fullName: string; phone: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setPending(true);
    const { error } = await createClient()!
      .from("profiles")
      .update({ full_name: String(f.get("fullName")).trim(), phone: String(f.get("phone")).trim() })
      .eq("id", userId);
    setPending(false);
    setStatus(error ? { kind: "error", message: "Couldn't save your details." } : { kind: "ok", message: "Details saved." });
    if (!error) router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Notice status={status} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" name="fullName" defaultValue={fullName} autoComplete="name" required />
        <Field label="Phone" name="phone" type="tel" defaultValue={phone} autoComplete="tel" />
      </div>
      <button type="submit" className="sp-btn sp-btn-sm" disabled={pending}>
        {pending ? "Saving…" : "Save details"}
      </button>
    </form>
  );
}

// ── Address book ─────────────────────────────────────────────────────────────
export function AddressBook({ userId, addresses }: { userId: string; addresses: Address[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(addresses.length === 0);
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<{ error: unknown }>) => {
    setBusy(key);
    const { error } = await fn();
    setBusy(null);
    if (error) setStatus({ kind: "error", message: "Something went wrong. Please try again." });
    else {
      setStatus(null);
      router.refresh();
    }
    return !error;
  };

  const makeDefault = (id: string) =>
    run(id, async () => {
      const supabase = createClient()!;
      const reset = await supabase.from("addresses").update({ is_default: false }).eq("user_id", userId).eq("is_default", true);
      if (reset.error) return reset;
      return supabase.from("addresses").update({ is_default: true }).eq("id", id);
    });

  const removeAddress = (id: string) => run(id, async () => createClient()!.from("addresses").delete().eq("id", id));

  const onAdd = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    const ok = await run("new", async () =>
      createClient()!
        .from("addresses")
        .insert({
          user_id: userId,
          label: get("label") || null,
          full_name: get("fullName"),
          phone: get("phone"),
          line1: get("line1"),
          line2: get("line2") || null,
          city: get("city"),
          region: get("region"),
          country: SITE.country,
          postal_code: get("postalCode") || null,
          is_default: addresses.length === 0,
        }),
    );
    if (ok) setAdding(false);
  };

  return (
    <div className="space-y-5">
      <Notice status={status} />
      {addresses.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className="rounded-2xl border border-mauve/80 bg-white/60 p-5 text-[0.85rem] leading-relaxed">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="font-semibold text-burgundy">{a.label || a.full_name}</span>
                {a.is_default && (
                  <span className="rounded-full bg-burgundy px-2.5 py-0.5 text-[0.6rem] font-semibold tracking-[0.14em] text-ivory uppercase">
                    Default
                  </span>
                )}
              </div>
              <p className="text-taupe">
                {a.full_name} · {a.phone}
                <br />
                {a.line1}
                {a.line2 ? `, ${a.line2}` : ""}
                <br />
                {a.city}, {a.region}
              </p>
              <div className="mt-3 flex gap-4 text-[0.7rem] font-semibold tracking-[0.14em] uppercase">
                {!a.is_default && (
                  <button type="button" className="text-gold hover:text-burgundy" disabled={busy === a.id} onClick={() => makeDefault(a.id)}>
                    Make default
                  </button>
                )}
                <button type="button" className="text-taupe/70 hover:text-burgundy" disabled={busy === a.id} onClick={() => removeAddress(a.id)}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <form onSubmit={onAdd} className="grid gap-5 rounded-2xl border border-mauve/80 bg-white/50 p-5 sm:grid-cols-2">
          <Field label="Label (optional)" name="label" placeholder="Home, Office…" />
          <Field label="Full name" name="fullName" autoComplete="name" required />
          <Field label="Phone" name="phone" type="tel" autoComplete="tel" required />
          <Field label="City / area" name="city" autoComplete="address-level2" required />
          <div className="sm:col-span-2">
            <Field label="Street address, building, flat" name="line1" autoComplete="address-line1" required />
          </div>
          <Field label="Landmark (optional)" name="line2" autoComplete="address-line2" />
          <label className="sp-field">
            <span className="sp-label">Emirate</span>
            <select name="region" className="sp-input" defaultValue="" required>
              <option value="" disabled>
                Choose…
              </option>
              {SITE.regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <Field label="Postal code (optional)" name="postalCode" autoComplete="postal-code" />
          <div className="flex items-end gap-3">
            <button type="submit" className="sp-btn sp-btn-sm" disabled={busy === "new"}>
              {busy === "new" ? "Saving…" : "Save address"}
            </button>
            {addresses.length > 0 && (
              <button type="button" className="sp-btn sp-btn-ghost sp-btn-sm" onClick={() => setAdding(false)}>
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : (
        <button type="button" className="sp-btn sp-btn-ghost sp-btn-sm" onClick={() => setAdding(true)}>
          + Add address
        </button>
      )}
    </div>
  );
}
