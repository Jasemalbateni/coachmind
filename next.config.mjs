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
  experimental: {
    /**
     * Restore the user's scroll position when they navigate back to a list
     * page (e.g. /drills) after editing a drill. Without this, App Router
     * snaps to top on Link navigation.
     */
    scrollRestoration: true,
  },
};

export default nextConfig;
