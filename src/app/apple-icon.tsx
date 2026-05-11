import { ImageResponse } from 'next/og';

/**
 * Apple-touch-icon (180×180) — what shows up on the iPad home screen.
 *
 * Apple ignores the `purpose: 'maskable'` hint, so we draw a full-bleed
 * background (no transparency) — iOS rounds the corners itself.
 * Replace with a designed asset when ready.
 */
// Edge runtime: same reasoning as src/app/icon.tsx — sidesteps a Windows-only
// build error in @vercel/og's Node runtime font loader.
export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#FF6A00',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 96,
          fontWeight: 900,
          letterSpacing: -3,
          fontFamily: 'sans-serif',
        }}
      >
        CM
      </div>
    ),
    { ...size },
  );
}
