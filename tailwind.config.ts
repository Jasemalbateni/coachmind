import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Custom breakpoints:
      //  - `nav` (900 px): NavBar text/labels collapse below this width.
      //  - `desktop`: real desktop signal — wide viewport AND mouse-class input
      //    (hover + fine pointer). iPad Pro 12.9" in landscape is 1366 × 1024,
      //    which exceeds the default `xl` (1280 px) — so width-only checks let
      //    the desktop sidebar slip back in on iPad. Layering the pointer/hover
      //    media query filters that case out without changing real desktop.
      screens: {
        nav: '900px',
        desktop: { raw: '(min-width: 1280px) and (hover: hover) and (pointer: fine)' },
      },
      colors: {
        brand: {
          orange: '#FF6A00',
          cyan:   '#00B8D4',
          yellow: '#FFC857',
          dark:   '#263238',
          bg:     '#F4F4F4',
        },
        pitch: {
          green: '#2d6a4f',
          light: '#40916c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.12), 0 2px 4px -1px rgb(0 0 0 / 0.08)',
      },
    },
  },
  plugins: [],
};
export default config;
