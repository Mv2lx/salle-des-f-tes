import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Disables Next's built-in image-optimization pipeline (which depends on
    // the native "sharp" library, compiled per-OS/CPU). The app only serves
    // a handful of static images (logo, icons), so optimization isn't
    // needed, and this keeps the dependency tree free of a second native
    // module beyond better-sqlite3.
    unoptimized: true,
  },
};

export default nextConfig;
