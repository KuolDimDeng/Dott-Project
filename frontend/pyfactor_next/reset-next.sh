#!/bin/bash

echo "Stopping Next.js server if running..."
pkill -f "next dev" || true

echo "Clearing Next.js cache..."
rm -rf .next
rm -rf node_modules/.cache

echo "Clearing package manager cache..."
npm cache clean --force

echo "Reinstalling node modules..."
npm install

echo "Starting Next.js in development mode..."
npm run dev 