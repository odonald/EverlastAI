/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Tauri expects a static export
  distDir: 'out',
  // Skip type checking on build (we run it separately)
  typescript: {
    ignoreBuildErrors: false,
  },
  // Skip ESLint on build (we run it separately)
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Exclude API routes that use dynamic features from static export
  // These routes only work in development mode
  experimental: {
    // This helps with static export by not failing on dynamic API routes
  },
};

export default nextConfig;
