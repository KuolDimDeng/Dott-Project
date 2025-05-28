#!/bin/bash

# Deploy Monorepo Fix Script
# This script properly configures Vercel for the monorepo structure

echo "🔧 Configuring Vercel for Monorepo Structure..."

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel@latest
fi

# Login to Vercel (if not already logged in)
echo "Checking Vercel authentication..."
vercel whoami || vercel login

# Navigate to the frontend directory
cd frontend/pyfactor_next

echo "📁 Setting up Vercel project from frontend/pyfactor_next directory..."

# Link or create the project from the correct directory
vercel link --yes

# Set the project settings via CLI
echo "⚙️ Configuring project settings..."

# Deploy from the correct directory
echo "🚀 Deploying from frontend/pyfactor_next..."
vercel --prod

echo "✅ Deployment complete!"
echo ""
echo "📋 Manual Configuration Required:"
echo "1. Go to your Vercel Dashboard"
echo "2. Navigate to Project Settings > General"
echo "3. Set Root Directory to: frontend/pyfactor_next"
echo "4. Save the settings"
echo ""
echo "This ensures Vercel builds from the correct directory where the Next.js app is located." 