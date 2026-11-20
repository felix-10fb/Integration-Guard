/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        graphite: {
          950: '#05070c',
          900: '#080c14',
          850: '#0d1220',
          800: '#12192c',
          750: '#182238',
          700: '#1f2d47',
          600: '#2a3d60',
        },
        cyber: {
          cyan:    '#00f0ff',
          blue:    '#0070f3',
          violet:  '#a855f7',
          amber:   '#f59e0b',
          crimson: '#ef4444',
          emerald: '#10b981',
          pink:    '#ec4899',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'neon-cyan':   '0 0 20px rgba(0,240,255,0.4), 0 0 40px rgba(0,240,255,0.15)',
        'neon-red':    '0 0 20px rgba(239,68,68,0.5), 0 0 40px rgba(239,68,68,0.2)',
        'neon-amber':  '0 0 20px rgba(245,158,11,0.4), 0 0 40px rgba(245,158,11,0.15)',
        'neon-blue':   '0 0 20px rgba(0,112,243,0.4), 0 0 40px rgba(0,112,243,0.15)',
        'neon-violet': '0 0 20px rgba(168,85,247,0.4), 0 0 40px rgba(168,85,247,0.15)',
        'neon-green':  '0 0 20px rgba(16,185,129,0.4), 0 0 40px rgba(16,185,129,0.15)',
        'panel':       '0 4px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'float':     'float 3s ease-in-out infinite',
        'glow-pulse':'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%':     { transform: 'translateY(-4px)' },
        },
        glowPulse: {
          '0%,100%': { boxShadow: '0 0 8px rgba(0,240,255,0.4)' },
          '50%':     { boxShadow: '0 0 24px rgba(0,240,255,0.8)' },
        },
      },
      backgroundImage: {
        'gradient-cyber': 'linear-gradient(135deg, #00f0ff22 0%, #0070f322 50%, #a855f722 100%)',
        'gradient-threat':'linear-gradient(135deg, #ef444422 0%, #f59e0b22 100%)',
      },
    },
  },
  plugins: [],
}
