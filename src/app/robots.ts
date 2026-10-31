import type { MetadataRoute } from "next";
import { SITE, absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/account", "/admin", "/cart", "/checkout", "/login", "/signup", "/forgot-password", "/reset-password", "/auth/", "/api/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE.url,
  };
}
