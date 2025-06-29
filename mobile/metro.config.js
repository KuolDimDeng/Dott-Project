const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add the parent directory to the watch folders for shared code
config.watchFolders = [
  path.resolve(__dirname, '../shared'),
  path.resolve(__dirname, '../'),
];

// Ensure babel runtime can be resolved
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '../node_modules'),
];

module.exports = config;