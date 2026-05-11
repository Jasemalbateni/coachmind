/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Standalone output bundles the Next.js server + its minimal node_modules
   * into .next/standalone/server.js — required for the Electron desktop build.
   *
   * In development (next dev) this has no effect; the setting only changes
   * what `next build` produces.
   */
  output: 'standalone',
};

export default nextConfig;
