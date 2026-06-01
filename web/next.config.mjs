// Supabase Storage public host (for user-uploaded avatars), derived from the
// project URL so it stays correct across environments.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // TMDB posters/backdrops + YouTube thumbnails. AVIF/WebP variants are
    // generated automatically by next/image. Pathnames are listed explicitly
    // because some Next.js versions require them in remotePatterns.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        port: "",
        pathname: "/t/p/**",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        port: "",
        pathname: "/vi/**",
      },
      // User-uploaded profile photos served from the public avatars bucket.
      ...(supabaseHost
        ? [
            {
              protocol: "https",
              hostname: supabaseHost,
              port: "",
              pathname: "/storage/v1/object/public/avatars/**",
            },
          ]
        : []),
    ],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
