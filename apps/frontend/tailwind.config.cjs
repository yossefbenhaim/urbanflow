module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'sc-primary': '#1E5F8A',
        'sc-primary-light': '#2A7AB0',
        'sc-gold': '#C4A962',
        'sc-gold-dark': '#D4A853',
        'sc-navy': '#1A3A5C',
        'sc-teal': '#4DB6C4',
        'sc-light-blue': '#E8F4F8',
        'sc-cream': '#F5F0E6',
        'sc-bg': '#F8F9FA',
        'sc-border': '#E5E7EB',
        'sc-text': '#374151',
        'sc-text-light': '#6B7280',
        'sc-success': '#22C55E',
        'sc-error': '#B94A48',
      },
      fontFamily: { heebo: ['Heebo', 'sans-serif'] },
      boxShadow: {
        'sm': '0 2px 8px rgba(0,0,0,0.04)',
        'card': '0 4px 20px rgba(0,0,0,0.06)',
        'lg': '0 8px 32px rgba(0,0,0,0.1)',
        'xl': '0 16px 48px rgba(0,0,0,0.12)',
      },
      borderRadius: {
        'card': '16px',
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
