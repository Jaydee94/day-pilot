import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

/**
 * DayPilot Tailwind config.
 *
 * Implements Material 3 (Material You) inspired tokens:
 *   - Tonal palette mapped to CSS variables in `src/index.css`
 *   - M3 Shape Scale
 *   - M3 Type Scale
 *   - M3 Elevation tokens
 *   - M3 Motion / Easing tokens
 *
 * Light / Dark theme is switched via the `class="dark"` strategy on <html>.
 */
const config: Config = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // M3 tonal palette — backed by CSS vars (HSL channels) in index.css
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',

        surface: {
          DEFAULT: 'hsl(var(--surface) / <alpha-value>)',
          dim: 'hsl(var(--surface-dim) / <alpha-value>)',
          bright: 'hsl(var(--surface-bright) / <alpha-value>)',
          variant: 'hsl(var(--surface-variant) / <alpha-value>)',
          container: {
            lowest: 'hsl(var(--surface-container-lowest) / <alpha-value>)',
            low: 'hsl(var(--surface-container-low) / <alpha-value>)',
            DEFAULT: 'hsl(var(--surface-container) / <alpha-value>)',
            high: 'hsl(var(--surface-container-high) / <alpha-value>)',
            highest: 'hsl(var(--surface-container-highest) / <alpha-value>)',
          },
        },

        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
          container: 'hsl(var(--primary-container) / <alpha-value>)',
          'container-foreground': 'hsl(var(--primary-container-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
          foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)',
          container: 'hsl(var(--secondary-container) / <alpha-value>)',
          'container-foreground': 'hsl(var(--secondary-container-foreground) / <alpha-value>)',
        },
        tertiary: {
          DEFAULT: 'hsl(var(--tertiary) / <alpha-value>)',
          foreground: 'hsl(var(--tertiary-foreground) / <alpha-value>)',
          container: 'hsl(var(--tertiary-container) / <alpha-value>)',
          'container-foreground': 'hsl(var(--tertiary-container-foreground) / <alpha-value>)',
        },
        error: {
          DEFAULT: 'hsl(var(--error) / <alpha-value>)',
          foreground: 'hsl(var(--error-foreground) / <alpha-value>)',
          container: 'hsl(var(--error-container) / <alpha-value>)',
          'container-foreground': 'hsl(var(--error-container-foreground) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'hsl(var(--success) / <alpha-value>)',
          foreground: 'hsl(var(--success-foreground) / <alpha-value>)',
          container: 'hsl(var(--success-container) / <alpha-value>)',
          'container-foreground': 'hsl(var(--success-container-foreground) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning) / <alpha-value>)',
          foreground: 'hsl(var(--warning-foreground) / <alpha-value>)',
          container: 'hsl(var(--warning-container) / <alpha-value>)',
          'container-foreground': 'hsl(var(--warning-container-foreground) / <alpha-value>)',
        },

        outline: {
          DEFAULT: 'hsl(var(--outline) / <alpha-value>)',
          variant: 'hsl(var(--outline-variant) / <alpha-value>)',
        },

        // shadcn aliases (compat with shadcn-cli generated components)
        border: 'hsl(var(--outline-variant) / <alpha-value>)',
        input: 'hsl(var(--outline-variant) / <alpha-value>)',
        ring: 'hsl(var(--primary) / <alpha-value>)',
        muted: {
          DEFAULT: 'hsl(var(--surface-variant) / <alpha-value>)',
          foreground: 'hsl(var(--on-surface-variant) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsl(var(--surface-container-high) / <alpha-value>)',
          foreground: 'hsl(var(--foreground) / <alpha-value>)',
        },
        card: {
          DEFAULT: 'hsl(var(--surface-container) / <alpha-value>)',
          foreground: 'hsl(var(--foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'hsl(var(--surface-container-high) / <alpha-value>)',
          foreground: 'hsl(var(--foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'hsl(var(--error) / <alpha-value>)',
          foreground: 'hsl(var(--error-foreground) / <alpha-value>)',
        },
      },

      // M3 Shape Scale
      borderRadius: {
        none: '0',
        xs: '4px',
        sm: '8px',
        DEFAULT: '12px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '28px',
        '3xl': '36px',
        full: '9999px',
      },

      // M3 Type Scale (utility classes via @layer in index.css)
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },

      // M3 Elevation (subtle tonal shadows; respect dark mode by referencing primary tone)
      boxShadow: {
        elev1: '0 1px 2px 0 hsl(var(--shadow) / 0.30), 0 1px 3px 1px hsl(var(--shadow) / 0.15)',
        elev2: '0 1px 2px 0 hsl(var(--shadow) / 0.30), 0 2px 6px 2px hsl(var(--shadow) / 0.15)',
        elev3: '0 4px 8px 3px hsl(var(--shadow) / 0.15), 0 1px 3px 0 hsl(var(--shadow) / 0.30)',
        elev4: '0 6px 10px 4px hsl(var(--shadow) / 0.15), 0 2px 3px 0 hsl(var(--shadow) / 0.30)',
        elev5: '0 8px 12px 6px hsl(var(--shadow) / 0.15), 0 4px 4px 0 hsl(var(--shadow) / 0.30)',
      },

      // M3 Motion
      transitionTimingFunction: {
        emphasized: 'cubic-bezier(0.2, 0.0, 0, 1.0)',
        'emphasized-decelerate': 'cubic-bezier(0.05, 0.7, 0.1, 1.0)',
        'emphasized-accelerate': 'cubic-bezier(0.3, 0.0, 0.8, 0.15)',
        standard: 'cubic-bezier(0.2, 0.0, 0, 1.0)',
      },
      transitionDuration: {
        short1: '50ms',
        short2: '100ms',
        short3: '150ms',
        short4: '200ms',
        medium1: '250ms',
        medium2: '300ms',
        medium3: '350ms',
        medium4: '400ms',
        long1: '450ms',
        long2: '500ms',
        long3: '550ms',
        long4: '600ms',
      },

      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-in-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms cubic-bezier(0.2, 0.0, 0, 1.0)',
        'fade-in-up': 'fade-in-up 300ms cubic-bezier(0.05, 0.7, 0.1, 1.0)',
        'slide-in-right': 'slide-in-right 300ms cubic-bezier(0.05, 0.7, 0.1, 1.0)',
        'slide-in-up': 'slide-in-up 350ms cubic-bezier(0.05, 0.7, 0.1, 1.0)',
        shimmer: 'shimmer 2s infinite linear',
      },
    },
  },
  plugins: [animate],
}

export default config
