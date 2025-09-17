#!/bin/bash

# Deploy script for featuring system
# Run this on the production/staging server

echo "🚀 Deploying Product & Menu Item Featuring System..."

# Run database migrations
echo "📦 Running migrations for menu app..."
python manage.py migrate menu

echo "📦 Running migrations for inventory app..."
python manage.py migrate inventory

echo "📦 Running migrations for marketplace app..."
python manage.py migrate marketplace

# Create initial featuring scores (optional)
echo "📊 Calculating initial featuring scores..."
python manage.py calculate_featuring_scores --days 30

echo "✅ Featuring system deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Monitor the featured_items endpoint: /api/marketplace/consumer/featured_items/"
echo "2. Set up a daily cron job to run: python manage.py calculate_featuring_scores"
echo "3. Mark specific items as featured in Django admin if needed"