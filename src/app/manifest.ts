import type { MetadataRoute } from 'next';

/**
 * PWA manifest — served at /manifest.webmanifest.
 *
 * Why these values:
 *   - `start_url: '/drills'` matches the redirect we already do from `/`.
 *     Skips the marketing landing page when launching from the home-screen icon.
 *   - `display: 'standalone'` gives us the full-screen, no-Safari-chrome experience
 *     when added to the iPad home screen.
 *   - `theme_color` and `background_color` both match the app's dark surface
 *     so the splash/transition is seamless.
 *   - Icons are pulled from the Next-generated /icon and /apple-icon routes
 *     so we don't have to ship binary PNGs in /public.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CoachMind — Professional Coaching Platform',
    short_name: 'CoachMind',
    description: 'The professional coaching platform for modern football coaches',
    start_url: '/drills',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#080c14',
    theme_color: '#080c14',
    categories: ['sports', 'productivity', 'education'],
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png', purpose: 'any' },
    ],
  };
}
