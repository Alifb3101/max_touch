export const SITE = {
  name: "Max Touch",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:8443").replace(/\/+$/, ""),
  title: "Max Touch — Luxury Makeup Kits & Gift Kits",
  description:
    "Shop Max Touch makeup kits and gift kits in big, medium and small sizes. Complete beauty sets with eyeshadows, blush, lip colours and brushes in keepsake cases — delivered across the UAE.",
  keywords: [
    "makeup kits",
    "makeup kit",
    "gift kits",
    "makeup gift set",
    "makeup gift box",
    "beauty kit",
    "makeup kit UAE",
    "makeup kit Dubai",
    "bridal makeup kit",
    "eyeshadow palette kit",
    "Max Touch",
  ],
  locale: "en_AE",
  language: "en",
  country: "AE",
  currency: "AED",
  regions: ["Abu Dhabi", "Dubai", "Sharjah", "Ajman", "Umm Al Quwain", "Ras Al Khaimah", "Fujairah"],
  themeColor: "#FBF3EA",
} as const;

export const absoluteUrl = (path = "/") => `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
