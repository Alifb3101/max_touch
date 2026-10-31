"use client";

import { useState } from "react";
import type { FormEvent, InputHTMLAttributes } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteProduct, saveProduct } from "@/app/admin/actions";
import { slugify } from "@/lib/format";
import { FEATURE_ICONS, draftToPayload, type FeatureIcon, type ProductDraft } from "@/lib/product-draft";
import ImageField from "./ImageField";

function TextInput({
  label,
  value,
  onChange,
  hint,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <label className="sp-field">
      <span className="sp-label">{label}</span>
      <input className="sp-input" value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
      {hint ? <span className="text-[0.75rem] text-taupe/70">{hint}</span> : null}
    </label>
  );
}

function Area({ label, value, onChange, hint, rows = 4 }: { label: string; value: string; onChange: (value: string) => void; hint?: string; rows?: number }) {
  return (
    <label className="sp-field">
      <span className="sp-label">{label}</span>
      <textarea className="sp-input" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
      {hint ? <span className="text-[0.75rem] text-taupe/70">{hint}</span> : null}
    </label>
  );
}

export default function ProductForm({
  initial,
  sizes,
  saved = false,
}: {
  initial: ProductDraft;
  sizes: { slug: string; label: string }[];
  saved?: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [slugEdited, setSlugEdited] = useState(Boolean(initial.slug));
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(saved ? "Saved. The shop updates within a few seconds." : null);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const onName = (name: string) => {
    setDraft((d) => ({ ...d, name, slug: slugEdited ? d.slug : slugify(name) }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    const result = await saveProduct(draftToPayload(draft));
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.id && result.id !== draft.id) {
      router.replace(`/admin/products/${result.id}?saved=1`);
      router.refresh();
      return;
    }
    setMessage("Saved. The shop updates within a few seconds.");
    router.refresh();
  };

  const onDelete = async () => {
    if (!draft.id) return;
    if (!window.confirm("Delete this kit? Orders that already include it keep their own copy of the name and price.")) return;
    setPending(true);
    const result = await deleteProduct(draft.id);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.replace("/admin/products");
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {error ? <p className="sp-alert sp-alert-error">{error}</p> : null}
      {message ? <p className="sp-alert sp-alert-ok">{message}</p> : null}

      <section className="sp-panel p-6 sm:p-8">
        <p className="sp-eyebrow">The kit</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <TextInput label="Name" value={draft.name} onChange={onName} required />
          <TextInput
            label="Link"
            value={draft.slug}
            onChange={(slug) => {
              setSlugEdited(true);
              set("slug", slugify(slug));
            }}
            hint="The page address, for example rose-vault-2026."
            required
          />
          <label className="sp-field">
            <span className="sp-label">Size</span>
            <select className="sp-input" value={draft.sizeSlug} onChange={(e) => set("sizeSlug", e.target.value)}>
              {sizes.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <TextInput label="SKU" value={draft.sku} onChange={(v) => set("sku", v)} hint="Optional. Your own stock code." />
          <TextInput label="Price (AED)" value={draft.price} onChange={(v) => set("price", v)} inputMode="decimal" required />
          <TextInput label="Compare-at price" value={draft.compareAtPrice} onChange={(v) => set("compareAtPrice", v)} inputMode="decimal" hint="Optional. Shown crossed out when it is higher." />
          <TextInput label="Stock" value={draft.stock} onChange={(v) => set("stock", v)} inputMode="numeric" required />
          <TextInput label="Piece count" value={draft.pieces} onChange={(v) => set("pieces", v)} inputMode="numeric" />
          <TextInput label="Sort order" value={draft.sortOrder} onChange={(v) => set("sortOrder", v)} inputMode="numeric" hint="Lower numbers appear first inside a size." />
          <label className="flex items-center gap-3 pt-6 text-[0.9rem] text-burgundy">
            <input type="checkbox" checked={draft.isActive} onChange={(e) => set("isActive", e.target.checked)} className="h-4 w-4 accent-[#6B2737]" />
            On sale
          </label>
        </div>
        <p className="mt-4 text-[0.78rem] text-taupe/70">A new kit stays hidden until you tick On sale, so a half-finished page never appears in the shop.</p>
      </section>

      <section className="sp-panel p-6 sm:p-8">
        <p className="sp-eyebrow">Words</p>
        <div className="mt-5 grid gap-5">
          <TextInput label="Tagline" value={draft.tagline} onChange={(v) => set("tagline", v)} />
          <TextInput label="Small label" value={draft.eyebrow} onChange={(v) => set("eyebrow", v)} hint="The short line above the title." />
          <Area label="Drawer title" value={draft.titleLines} onChange={(v) => set("titleLines", v)} rows={3} hint="One line per row. Leave blank to use the kit name." />
          <Area label="Description" value={draft.description} onChange={(v) => set("description", v)} />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextInput label="Hero subtitle" value={draft.heroSubtitle} onChange={(v) => set("heroSubtitle", v)} />
            <TextInput label="Caption" value={draft.caption} onChange={(v) => set("caption", v)} />
            <TextInput label="Button label" value={draft.ctaLabel} onChange={(v) => set("ctaLabel", v)} hint="Defaults to Add to bag." />
            <TextInput label="Inside heading" value={draft.includedTitle} onChange={(v) => set("includedTitle", v)} />
            <TextInput label="Case heading" value={draft.extrasTitle} onChange={(v) => set("extrasTitle", v)} />
          </div>
          <Area label="Perfect for" value={draft.perfectFor} onChange={(v) => set("perfectFor", v)} rows={3} hint="One idea per line." />
        </div>
      </section>

      <section className="sp-panel p-6 sm:p-8">
        <p className="sp-eyebrow">Google</p>
        <div className="mt-5 grid gap-5">
          <TextInput label="Page title" value={draft.seoTitle} onChange={(v) => set("seoTitle", v)} hint="Leave blank and the shop writes one from the kit name and size." />
          <Area label="Page description" value={draft.seoDescription} onChange={(v) => set("seoDescription", v)} rows={3} hint="The sentence under the title in Google. About 150 characters works best." />
        </div>
      </section>

      <section className="sp-panel space-y-5 p-6 sm:p-8">
        <p className="sp-eyebrow">Photos</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <ImageField label="Card photo" value={draft.thumbnailUrl} onChange={(v) => set("thumbnailUrl", v)} hint="Shown on the wheel and in the bag." />
          <ImageField label="Case photo" value={draft.imageUrl} onChange={(v) => set("imageUrl", v)} hint="The cut-out in the product drawer." />
        </div>
        <TextInput label="Photo description" value={draft.imageAlt} onChange={(v) => set("imageAlt", v)} hint="For screen readers and Google Images." />
        <div className="space-y-3">
          <p className="sp-label">Opening sequence</p>
          <p className="text-[0.75rem] text-taupe/70">Played in order while the customer scrolls. The first frame is the closed case.</p>
          {draft.frames.map((url, i) => (
            <div key={i} className="flex items-end gap-3">
              <div className="min-w-0 flex-1">
                <ImageField label={`Frame ${i + 1}`} value={url} onChange={(v) => set("frames", draft.frames.map((f, n) => (n === i ? v : f)))} />
              </div>
              <button type="button" className="sp-btn sp-btn-ghost sp-btn-sm mb-1" onClick={() => set("frames", draft.frames.filter((_, n) => n !== i))}>
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="sp-btn sp-btn-ghost sp-btn-sm" onClick={() => set("frames", [...draft.frames, ""])}>
            Add frame
          </button>
        </div>
        <div className="space-y-3">
          <p className="sp-label">Extra photos</p>
          {draft.gallery.map((photo, i) => (
            <div key={i} className="grid gap-4 sm:grid-cols-[2fr_1fr_auto]">
              <ImageField label={`Photo ${i + 1}`} value={photo.url} onChange={(v) => set("gallery", draft.gallery.map((g, n) => (n === i ? { ...g, url: v } : g)))} />
              <TextInput label="Description" value={photo.alt} onChange={(v) => set("gallery", draft.gallery.map((g, n) => (n === i ? { ...g, alt: v } : g)))} />
              <button type="button" className="sp-btn sp-btn-ghost sp-btn-sm self-end" onClick={() => set("gallery", draft.gallery.filter((_, n) => n !== i))}>
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="sp-btn sp-btn-ghost sp-btn-sm" onClick={() => set("gallery", [...draft.gallery, { url: "", alt: "" }])}>
            Add photo
          </button>
        </div>
      </section>

      <section className="sp-panel space-y-4 p-6 sm:p-8">
        <div>
          <p className="sp-eyebrow">Items that fly out</p>
          <p className="mt-2 text-[0.75rem] text-taupe/70">Up to 7 cut-outs, each with a short label.</p>
        </div>
        {draft.showcase.map((item, i) => (
          <div key={i} className="grid gap-4 border-t border-mauve/50 pt-4 sm:grid-cols-[1fr_2fr_auto]">
            <TextInput label="Label" value={item.label} onChange={(v) => set("showcase", draft.showcase.map((s, n) => (n === i ? { ...s, label: v } : s)))} />
            <ImageField label="Cut-out" value={item.imageUrl} onChange={(v) => set("showcase", draft.showcase.map((s, n) => (n === i ? { ...s, imageUrl: v } : s)))} />
            <button type="button" className="sp-btn sp-btn-ghost sp-btn-sm self-end" onClick={() => set("showcase", draft.showcase.filter((_, n) => n !== i))}>
              Remove
            </button>
          </div>
        ))}
        {draft.showcase.length < 7 ? (
          <button type="button" className="sp-btn sp-btn-ghost sp-btn-sm" onClick={() => set("showcase", [...draft.showcase, { label: "", imageUrl: "" }])}>
            Add item
          </button>
        ) : null}
      </section>

      <section className="sp-panel space-y-4 p-6 sm:p-8">
        <p className="sp-eyebrow">Drawer numbers</p>
        {draft.stats.map((item, i) => (
          <div key={i} className="grid gap-4 sm:grid-cols-[8rem_1fr_auto]">
            <TextInput label="Number" value={item.value} onChange={(v) => set("stats", draft.stats.map((s, n) => (n === i ? { ...s, value: v } : s)))} inputMode="numeric" />
            <TextInput label="Label" value={item.label} onChange={(v) => set("stats", draft.stats.map((s, n) => (n === i ? { ...s, label: v } : s)))} />
            <button type="button" className="sp-btn sp-btn-ghost sp-btn-sm self-end" onClick={() => set("stats", draft.stats.filter((_, n) => n !== i))}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="sp-btn sp-btn-ghost sp-btn-sm" onClick={() => set("stats", [...draft.stats, { value: "", label: "" }])}>
          Add number
        </button>
      </section>

      <section className="sp-panel space-y-4 p-6 sm:p-8">
        <p className="sp-eyebrow">What is inside</p>
        {draft.contents.map((item, i) => (
          <div key={i} className="grid gap-4 border-t border-mauve/50 pt-4 sm:grid-cols-2">
            <TextInput label="Name" value={item.name} onChange={(v) => set("contents", draft.contents.map((c, n) => (n === i ? { ...c, name: v } : c)))} />
            <TextInput label="Quantity" value={item.quantity} onChange={(v) => set("contents", draft.contents.map((c, n) => (n === i ? { ...c, quantity: v } : c)))} inputMode="numeric" />
            <TextInput label="Note" value={item.note} onChange={(v) => set("contents", draft.contents.map((c, n) => (n === i ? { ...c, note: v } : c)))} />
            <ImageField label="Photo" value={item.imageUrl} onChange={(v) => set("contents", draft.contents.map((c, n) => (n === i ? { ...c, imageUrl: v } : c)))} />
            <button type="button" className="sp-btn sp-btn-ghost sp-btn-sm" onClick={() => set("contents", draft.contents.filter((_, n) => n !== i))}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="sp-btn sp-btn-ghost sp-btn-sm" onClick={() => set("contents", [...draft.contents, { name: "", quantity: "1", note: "", imageUrl: "" }])}>
          Add piece
        </button>
      </section>

      <section className="sp-panel space-y-4 p-6 sm:p-8">
        <p className="sp-eyebrow">Built into the case</p>
        {draft.features.map((item, i) => (
          <div key={i} className="grid gap-4 border-t border-mauve/50 pt-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
              <TextInput label="Title" value={item.title} onChange={(v) => set("features", draft.features.map((f, n) => (n === i ? { ...f, title: v } : f)))} />
              <label className="sp-field">
                <span className="sp-label">Icon</span>
                <select
                  className="sp-input"
                  value={item.icon}
                  onChange={(e) => set("features", draft.features.map((f, n) => (n === i ? { ...f, icon: e.target.value as FeatureIcon } : f)))}
                >
                  {FEATURE_ICONS.map((icon) => (
                    <option key={icon} value={icon}>
                      {icon}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <Area label="Text" value={item.body} onChange={(v) => set("features", draft.features.map((f, n) => (n === i ? { ...f, body: v } : f)))} rows={2} />
            <button type="button" className="sp-btn sp-btn-ghost sp-btn-sm" onClick={() => set("features", draft.features.filter((_, n) => n !== i))}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="sp-btn sp-btn-ghost sp-btn-sm" onClick={() => set("features", [...draft.features, { title: "", body: "", icon: "gift" }])}>
          Add feature
        </button>
      </section>

      <section className="sp-panel space-y-4 p-6 sm:p-8">
        <div>
          <p className="sp-eyebrow">Questions</p>
          <p className="mt-2 text-[0.75rem] text-taupe/70">Also published for Google as questions and answers.</p>
        </div>
        {draft.faqs.map((item, i) => (
          <div key={i} className="grid gap-4 border-t border-mauve/50 pt-4">
            <TextInput label="Question" value={item.question} onChange={(v) => set("faqs", draft.faqs.map((f, n) => (n === i ? { ...f, question: v } : f)))} />
            <Area label="Answer" value={item.answer} onChange={(v) => set("faqs", draft.faqs.map((f, n) => (n === i ? { ...f, answer: v } : f)))} rows={3} />
            <button type="button" className="sp-btn sp-btn-ghost sp-btn-sm" onClick={() => set("faqs", draft.faqs.filter((_, n) => n !== i))}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="sp-btn sp-btn-ghost sp-btn-sm" onClick={() => set("faqs", [...draft.faqs, { question: "", answer: "" }])}>
          Add question
        </button>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="sp-btn" disabled={pending}>
          {pending ? "Saving…" : "Save kit"}
        </button>
        {draft.id ? (
          <button type="button" className="sp-btn sp-btn-ghost" disabled={pending} onClick={onDelete}>
            Delete kit
          </button>
        ) : null}
        {draft.isActive && draft.slug ? (
          <Link href={`/kits/${draft.slug}`} className="sp-link text-[0.85rem]" target="_blank">
            Open the live page
          </Link>
        ) : null}
      </div>
    </form>
  );
}
