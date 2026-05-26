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
    ],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
