/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          600: '#16a34a',
          700: '#15803d',
          900: '#14532d',
        },
      },
      borderRadius: {
        'handmade': '47% 53% 48% 52% / 52% 48% 52% 48%',
        'blob': '60% 40% 30% 70% / 60% 30% 70% 40%',
        'squiggly': '30% 70% 70% 30% / 30% 30% 70% 70%',
      },
      boxShadow: {
        'handmade': '0 0 0 2px rgba(22, 163, 74, 0.15), 3px 8px 16px rgba(0, 0, 0, 0.08)',
        'sketch': '2px 2px 0 rgba(0, 0, 0, 0.1), -2px -2px 0 rgba(0, 0, 0, 0.05)',
      },
      backgroundImage: {
        'dots': 'radial-gradient(circle, rgba(22, 163, 74, 0.05) 1px, transparent 1px)',
      },
      backgroundSize: {
        'dots': '20px 20px',
      },
    },
  },
  plugins: [],
}

