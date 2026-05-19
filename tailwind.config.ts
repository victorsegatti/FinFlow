import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg:       'var(--c-bg)',
        'bg-elev':'var(--c-bg-elev)',
        card:     'var(--c-card)',
        ink: {
          DEFAULT: 'var(--c-ink)',
          2:       'var(--c-ink-2)',
        },
        muted:   'var(--c-muted)',
        faint:   'var(--c-faint)',
        border: {
          DEFAULT: 'var(--c-border)',
          2:       'var(--c-border-2)',
        },
        brand: {
          DEFAULT: 'var(--c-brand)',
          2:       'var(--c-brand-2)',
          fg:      'var(--c-brand-fg)',
          soft:    'var(--c-brand-soft)',
          on:      'var(--c-on-brand)',
        },
        success: {
          DEFAULT: 'var(--c-success)',
          soft:    'var(--c-success-soft)',
        },
        danger: {
          DEFAULT: 'var(--c-danger)',
          soft:    'var(--c-danger-soft)',
        },
        warning: {
          DEFAULT: 'var(--c-warning)',
          soft:    'var(--c-warning-soft)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui'],
        ui:      ['var(--font-ui)',      'system-ui'],
      },
      borderRadius: {
        xs:   'var(--r-xs)',
        sm:   'var(--r-sm)',
        md:   'var(--r-md)',
        lg:   'var(--r-lg)',
        xl:   'var(--r-xl)',
        pill: 'var(--r-pill)',
      },
      boxShadow: {
        1: 'var(--shadow-1)',
        2: 'var(--shadow-2)',
        3: 'var(--shadow-3)',
      },
    },
  },
  plugins: [],
};
export default config;
