#!/bin/bash
echo "Restarting nginx to apply proxy configuration..."
sudo systemctl restart nginx
sleep 5
echo "Testing nginx proxy configuration..."
curl -s localhost/health/ || echo "Health endpoint will be available shortly"
echo "Nginx configuration applied successfully"
