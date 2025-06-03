#!/bin/bash

# Script to install all necessary dependencies for the optimized backend
# This will fix the psutil module error and AWS SDK warning

echo "Installing dependencies for optimized backend..."

# Install psutil and other memory monitoring dependencies
pip install psutil pympler objgraph memory_profiler

# Install AWS SDK v3 to fix the warning
pip install boto3==1.34.0 botocore==1.34.0 

# Install other performance-related packages
pip install django-db-connection-pool django-redis

# Make the run_server.py script executable
chmod +x run_server.py

echo "Dependencies installed successfully!"
echo "You can now run the optimized server with: ./run_server.py"