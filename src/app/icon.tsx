import { ImageResponse } from 'next/og';

/**
 * Default app icon — used as favicon AND as the manifest icon.
 * Generated as a 512×512 PNG at build time from this React tree.
 * Replace with a real designed icon when ready.
 *
 * Style: solid CoachMind orange (#FF6A00) on a rounded square with a bold "CM"
 * monogram in white — matches the logo used in the landing page header.
 */
// Edge runtime: sidesteps a Windows + Node prerender bug in @vercel/og where
// `fileURLToPath` fails on the bundled font path. Works identically on Vercel.
export const runtime = 'edge';
export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#FF6A00',
          borderRadius: 96,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 240,
          fontWeight: 900,
          letterSpacing: -8,
          fontFamily: 'sans-serif',
        }}
      >
        CM
      </div>
    ),
    { ...size },
  );
}
