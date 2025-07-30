#!/bin/bash

echo "Installing TDZ fix dependencies..."

# Install esbuild-loader for alternative minification
pnpm add -D esbuild-loader

# Install babel plugins for code transformation
pnpm add -D @babel/plugin-transform-block-scoping
pnpm add -D babel-plugin-transform-es2015-block-scoping
pnpm add -D @babel/plugin-transform-parameters
pnpm add -D babel-plugin-transform-remove-console

echo "Dependencies installed successfully!"
echo "Please run 'pnpm run build' to test the new configuration."