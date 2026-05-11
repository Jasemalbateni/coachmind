import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Custom breakpoint at 900px so the NavBar can collapse to icon-only on
      // iPad portrait while staying full-width on desktop. Used as `nav:` modifier.
      screens: {
        nav: '900px',
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
