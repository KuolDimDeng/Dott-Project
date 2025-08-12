#!/bin/bash

echo "=== Fixing Geofence Assignment Database Schema ==="
echo "This script will fix the assigned_by_id column type mismatch"
echo ""

# Run the Python fix script
echo "Running database schema fix..."
python /app/fix_assigned_by_column.py

echo ""
echo "Fix complete! The geofence employee assignment feature should now work properly."
echo "Users can now assign employees to geofences and the assignments will persist."