module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'sc-primary': '#3b6b9c',
        'sc-primary-light': '#5A8DB8',
        'sc-gold': '#8b6f47',
        'sc-gold-dark': '#8b6f47',
        'sc-navy': '#1e3a5f',
        'sc-teal': '#4DB6C4',
        'sc-light-blue': '#ebf1f7',
        'sc-cream': '#f5f0e8',
        'sc-bg': '#f8f9fa',
        'sc-border': '#eeeeee',
        'sc-text': '#212121',
        'sc-text-light': '#5a5a6e',
        'sc-text-muted': '#8e8e9e',
        'sc-success': '#4a8c5c',
        'sc-success-bg': '#edf5ef',
        'sc-error': '#B94A48',
        'sc-warning': '#c4841d',
        'sc-brown-light': '#A6895F',
        'sc-gray': '#757575',
        'sc-warning-bg': '#fcf4e7',
      },
      fontFamily: { heebo: ['Heebo', 'sans-serif'] },
      boxShadow: {
        'sm': '0 2px 8px rgba(0,0,0,0.04)',
        'card': '0 2px 12px rgba(0,0,0,0.06)',
        'lg': '0 8px 32px rgba(0,0,0,0.1)',
        'xl': '0 16px 48px rgba(0,0,0,0.12)',
      },
      borderRadius: {
        'card': '14px',
        'btn': '8px',
      },
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
