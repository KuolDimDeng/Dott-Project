#!/bin/bash
echo "Restarting nginx to apply new configuration..."
sudo systemctl restart nginx
echo "Nginx restarted successfully"
