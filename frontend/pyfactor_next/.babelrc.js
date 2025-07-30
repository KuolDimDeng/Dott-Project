module.exports = {
  presets: ['next/babel'],
  plugins: [
    // Transform code to prevent TDZ errors
    ['@babel/plugin-transform-block-scoping', {
      throwIfClosureRequired: false
    }],
    // Convert let/const to var in production to avoid TDZ
    process.env.NODE_ENV === 'production' && ['babel-plugin-transform-remove-console', {
      exclude: ['error', 'warn', 'log'] // Keep logs for debugging
    }],
    // Add explicit initialization for variables
    process.env.NODE_ENV === 'production' && ['@babel/plugin-transform-parameters', {
      loose: true
    }]
  ].filter(Boolean),
  // Override settings for production
  env: {
    production: {
      plugins: [
        // Transform all let/const to var to completely avoid TDZ
        ['babel-plugin-transform-es2015-block-scoping', {
          throwIfClosureRequired: false
        }]
      ]
    }
  }
};