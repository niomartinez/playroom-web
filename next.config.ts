import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  experimental: {
    // Serve back/forward + recent revisits from the client router cache so OCMS
    // panel navigation feels instant (Pattern B). `dynamic` covers the
    // authenticated per-operator RSC pages; `static` the rarely-changing ones.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
