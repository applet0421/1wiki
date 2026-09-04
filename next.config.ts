import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/", destination: "/zh-tw", permanent: true },
      { source: "/ai", destination: "/zh-tw/ai", permanent: true },
      { source: "/software", destination: "/zh-tw/software", permanent: true },
      { source: "/social", destination: "/zh-tw/social", permanent: true },
      { source: "/articles/:slug", destination: "/zh-tw/articles/:slug", permanent: true },
      { source: "/category/:slug", destination: "/zh-tw/category/:slug", permanent: true },
      { source: "/about", destination: "/zh-tw/about", permanent: true },
      { source: "/contact", destination: "/zh-tw/contact", permanent: true },
      { source: "/privacy", destination: "/zh-tw/privacy", permanent: true },
      { source: "/terms", destination: "/zh-tw/terms", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
