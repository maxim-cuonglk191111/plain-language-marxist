import type { NextConfig } from "next";

// Fully static site (SDD §4.1, D2): reading needs no server.
const config: NextConfig = {
  output: "export",
  trailingSlash: false,
  images: { unoptimized: true },
  transpilePackages: ["@plm/schema", "@plm/terms"],
  poweredByHeader: false,
};

export default config;
