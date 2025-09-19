#!/bin/bash
# Fix migration dependencies for marketplace

echo "Fixing migration dependencies..."

# First, fake the couriers initial migration
echo "1. Faking couriers.0001_initial..."
python manage.py migrate couriers 0001_initial --fake

# Then run marketplace migrations
echo "2. Running marketplace migrations..."
python manage.py migrate marketplace

# Finally, ensure couriers migrations are up to date
echo "3. Ensuring couriers migrations are complete..."
python manage.py migrate couriers

echo "Migration dependencies fixed!"