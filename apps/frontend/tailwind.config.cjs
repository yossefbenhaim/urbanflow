module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'sc-blue-deep': '#1E3A5F',
        'sc-blue': '#3B6B9C',
        'sc-blue-light': '#5A8DB8',
        'sc-blue-pale': '#EBF1F7',
        'sc-brown': '#8B6F47',
        'sc-brown-light': '#A6895F',
        'sc-brown-pale': '#F5F0E8',
        'sc-dark': '#212121',
        'sc-gray': '#757575',
        'sc-gray-light': '#EEEEEE',
        'sc-bg': '#F8F9FA',
        'sc-success': '#4A8C5C',
        'sc-warning': '#C4841D',
        'sc-error': '#B94A48',
      },
      fontFamily: { heebo: ['Heebo', 'sans-serif'] },
      keyframes: {
        'slide-up': { '0%': { transform: 'translateY(100%)' }, '100%': { transform: 'translateY(0)' } },
      },
      animation: {
        'slide-up': 'slide-up 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
