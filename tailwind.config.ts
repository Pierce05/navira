import type { Config } from 'tailwindcss';
const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)', surface: 'var(--surface)', surface2: 'var(--surface-2)',
        blush: 'var(--blush)', accent: 'var(--accent)', 'accent-strong': 'var(--accent-strong)',
        'on-accent': 'var(--on-accent)', sage: 'var(--sage)', sky: 'var(--sky)',
        ink: 'var(--ink)', muted: 'var(--muted)', line: 'var(--line)', danger: 'var(--danger)',
      },
      fontFamily: { display: ['Fraunces', 'Georgia', 'serif'], sans: ['"DM Sans"', 'system-ui', 'sans-serif'] },
      borderRadius: { xl2: '20px', xl3: '28px' },
    },
  },
  plugins: [],
};
export default config;
