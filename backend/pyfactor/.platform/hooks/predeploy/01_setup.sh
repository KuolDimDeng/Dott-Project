#!/bin/bash
# Platform hook for additional setup
echo "Running predeploy setup..."
# Ensure proper permissions
chmod -R 755 /var/app/staging/
