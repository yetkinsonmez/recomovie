import { SITE_URL } from "@/lib/siteUrl";
import { sitemapChunkCounts } from "@/lib/sitemapChunks";

// Regenerate at most once a day, matching the chunk sitemaps.
export const revalidate = 86400;

// Sitemap index. Next's App Router serves the chunk sitemaps at
// /sitemap/<id>.xml (via generateSitemaps) but does NOT publish an index at
// /sitemap.xml, so that path 404s. Google needs a single entry point, so we
// emit the index here and point robots.txt at it.
export async function GET() {
  const { total } = await sitemapChunkCounts();

  const items = Array.from(
    { length: total },
    (_, i) => `  <sitemap><loc>${SITE_URL}/sitemap/${i}.xml</loc></sitemap>`,
  ).join("\n");

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${items}\n` +
    `</sitemapindex>\n`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=0, s-maxage=86400",
    },
  });
}
