"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mediaUrl } from "@/lib/media";

export default function ImageField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preview = mediaUrl(value);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const supabase = createClient();
    if (!supabase) {
      setError("Storage is not connected.");
      return;
    }
    setBusy(true);
    setError(null);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `kits/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("products").upload(path, file, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });
    setBusy(false);
    if (uploadError) {
      setError("Upload failed. Sign in as the store owner after the latest SQL file has been run.");
      return;
    }
    onChange(path);
  };

  return (
    <label className="sp-field">
      <span className="sp-label">{label}</span>
      <div className="flex items-start gap-3">
        {preview ? (
          // Admin previews are dynamic storage paths, so a plain image is the right fit.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-16 w-16 shrink-0 rounded-xl border border-mauve/70 object-cover" />
        ) : (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-dashed border-mauve text-[0.6rem] tracking-wide text-taupe/50 uppercase">
            Photo
          </span>
        )}
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <input className="sp-input" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Upload, or paste a link" />
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            disabled={busy}
            onChange={(e) => onFile(e.target.files?.[0])}
            className="text-[0.75rem] text-taupe file:mr-3 file:rounded-full file:border-0 file:bg-blush file:px-3 file:py-1.5 file:text-[0.68rem] file:font-semibold file:tracking-wide file:text-burgundy file:uppercase"
          />
        </span>
      </div>
      {hint ? <span className="text-[0.75rem] text-taupe/70">{hint}</span> : null}
      {busy ? <span className="text-[0.75rem] text-burgundy">Uploading…</span> : null}
      {error ? <span className="text-[0.75rem] text-[#b23a48]">{error}</span> : null}
    </label>
  );
}
