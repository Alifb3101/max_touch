import type { Metadata } from "next";
import KitWheel from "@/components/home/KitWheel";
import JsonLd from "@/components/seo/JsonLd";
import { getKits, getSizes } from "@/lib/catalog";
import { itemListJsonLd } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: SITE.title },
  description: SITE.description,
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [sizes, kits] = await Promise.all([getSizes(), getKits()]);
  return (
    <>
      {kits.length > 0 && <JsonLd data={itemListJsonLd(kits)} />}
      <KitWheel sizes={sizes} kits={kits} />
    </>
  );
}
