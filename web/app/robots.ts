import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteUrl";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Personal/auth surfaces carry no SEO value and shouldn't be indexed.
      disallow: ["/api/", "/login", "/signup", "/profile", "/watchlist", "/auth/"],
    },
    // Points at our hand-rolled index (app/sitemap_index.xml), which links
    // every /sitemap/<id>.xml chunk. Next does not publish /sitemap.xml itself
    // when generateSitemaps() is used, so we must not advertise that 404 path.
    sitemap: `${SITE_URL}/sitemap_index.xml`,
    host: SITE_URL,
  };
}
