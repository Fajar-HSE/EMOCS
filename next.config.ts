import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // lucide-react ships 1500+ icon modules behind one barrel export —
  // without this, every client chunk pays the transform cost of all of them.
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
