import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@huggingface/transformers"],
};

export default nextConfig;
