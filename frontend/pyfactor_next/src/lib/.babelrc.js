module.exports = {
  presets: [
    [
      'next/babel',
      {
        'preset-env': {
          targets: {
            browsers: ['>0.3%', 'not dead', 'not op_mini all']
          },
          useBuiltIns: 'usage',
          corejs: 3,
          modules: 'commonjs' // Force CommonJS modules
        }
      }
    ]
  ],
  plugins: [
    ['@babel/plugin-transform-modules-commonjs', { loose: true }],
    '@babel/plugin-transform-runtime',
    '@babel/plugin-syntax-dynamic-import'
  ]
}; 