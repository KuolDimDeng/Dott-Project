module.exports = {
  plugins: {
    'tailwindcss': {},
    'autoprefixer': {
      overrideBrowserslist: [
        'last 2 versions',
        'Chrome > 60',
        'Firefox > 60',
        'Safari > 10',
        'Edge > 79'
      ],
      grid: process.env.NODE_ENV === 'production',
    },
  },
}
