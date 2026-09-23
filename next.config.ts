import fs from "node:fs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The project is reached through a junction (Downloads\rare-bookie); pin the root to the real folder.
  turbopack: { root: fs.realpathSync(process.cwd()) },
};

export default nextConfig;
