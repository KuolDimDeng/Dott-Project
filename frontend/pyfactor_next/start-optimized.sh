#!/bin/bash

# Memory-optimized Next.js start script

# Set Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Use the memory-optimized Next.js config
cp next.config.memory.js next.config.js

# Start Next.js with memory optimizations
echo "Starting Next.js with memory optimizations..."
pnpm run dev
