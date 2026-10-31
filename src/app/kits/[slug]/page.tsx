import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteFooter from "@/components/layout/SiteFooter";
import ProductDetails from "@/components/product/ProductDetails";
import ProductExperience from "@/components/product/ProductExperience";
import JsonLd from "@/components/seo/JsonLd";
import { getKitsBySize, getProduct, getProductSlugs } from "@/lib/catalog";
import { money } from "@/lib/format";
import { breadcrumbJsonLd, faqJsonLd, productJsonLd } from "@/lib/seo";

export const revalidate = 300;

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getProductSlugs()).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Kit not found", robots: { index: false } };

  const title = product.seoTitle ?? `${product.name} — ${product.size.label} Makeup Kit`;
  const description =
    product.seoDescription ??
    [
      product.description ?? product.tagline,
      product.pieces ? `${product.pieces} pieces.` : null,
      `${money(product.price, product.currency)}.`,
    ]
      .filter(Boolean)
      .join(" ")
      .slice(0, 300);
  const image = product.image ?? product.thumbnail;

  return {
    title,
    description,
    alternates: { canonical: `/kits/${product.slug}` },
    openGraph: {
      type: "website",
      title,
      description,
      url: `/kits/${product.slug}`,
      images: image ? [{ url: image, alt: product.imageAlt }] : undefined,
    },
    twitter: { card: "summary_large_image", title, description, images: image ? [image] : undefined },
  };
}

export default async function KitPage({ params }: Params) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const related = (await getKitsBySize(product.size.slug)).filter((k) => k.id !== product.id).slice(0, 3);

  const structuredData = [
    productJsonLd(product),
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: product.category.name, path: "/makeup-kits" },
      ...(product.size.slug ? [{ name: `${product.size.label} kits`, path: `/makeup-kits/${product.size.slug}` }] : []),
      { name: product.name, path: `/kits/${product.slug}` },
    ]),
    ...(product.details.length ? [faqJsonLd(product.details)] : []),
  ];

  return (
    <>
      <JsonLd data={structuredData} />
      <ProductExperience product={product}>
        <ProductDetails product={product} related={related} />
        <SiteFooter />
      </ProductExperience>
    </>
  );
}
