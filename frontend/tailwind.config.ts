import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        bg: '#f5f6f8',
        panel: '#ffffff',
        ink: '#121316',
        muted: '#657083',
        accent: '#0f766e'
      },
      boxShadow: {
        soft: '0 8px 24px rgba(16, 24, 40, 0.06)'
      }
    }
  },
  plugins: []
};

export default config;
