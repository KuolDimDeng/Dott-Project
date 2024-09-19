module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@': '.',
            '@app': './app',
            '@components': './components',
            '@constants': './constants',
            '@hooks': './hooks',
            '@assets': './assets',
          },
        },
      ],
    ],
  };
};