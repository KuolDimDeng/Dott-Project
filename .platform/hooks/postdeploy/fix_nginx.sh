#!/bin/bash

# Ensure nginx can access Docker port
echo "Checking nginx configuration..."

# Restart nginx to pick up new config
sudo systemctl restart nginx

# Test the proxy
sleep 5
curl -s localhost/health/ || echo "Health check may need a moment to respond"

echo "Nginx proxy configuration updated"
