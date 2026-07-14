/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: '#FAF5EE',
        parchment: '#F5EDE0',
        cocoa: {
          50: '#FAF5F1',
          100: '#E8DDD0',
          200: '#C7B49F',
          300: '#A68B6E',
          400: '#89694B',
          500: '#6B4728',
          600: '#543821',
          700: '#3D281A',
          800: '#2D1D13',
          900: '#1C120B',
        },
        copper: {
          DEFAULT: '#B87333',
          dark: '#8B5A28',
        },
        pistachio: '#93A267',
        raspberry: '#B8324C',
        'vanilla-cream': '#FFF8ED',
      },
      fontFamily: {
        // "… Variable" = the self-hosted @fontsource variable faces (see
        // src/main.tsx); plain names kept as fallback for safety.
        display: ['Fraunces Variable', 'Fraunces', 'ui-serif', 'Georgia', 'serif'],
        body: ['Inter Variable', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.5' }],
        'sm': ['0.875rem', { lineHeight: '1.5' }],
        'base': ['1rem', { lineHeight: '1.6' }],
        'lg': ['1.125rem', { lineHeight: '1.6' }],
        'xl': ['1.406rem', { lineHeight: '1.3' }],
        '2xl': ['1.758rem', { lineHeight: '1.2' }],
        '3xl': ['2.197rem', { lineHeight: '1.15' }],
        '4xl': ['2.747rem', { lineHeight: '1.1' }],
      },
    },
  },
  plugins: [],
}
