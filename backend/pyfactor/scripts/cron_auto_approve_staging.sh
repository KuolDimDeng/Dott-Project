#!/bin/bash
# Cron job script for auto-approving staging items
# Add to crontab: 0 */6 * * * /app/backend/pyfactor/scripts/cron_auto_approve_staging.sh

# Set up environment
export DJANGO_SETTINGS_MODULE=pyfactor.settings

# Navigate to Django project directory
cd /app/backend/pyfactor || exit 1

# Log file
LOG_FILE="/app/logs/auto_approve_staging.log"

# Create log directory if it doesn't exist
mkdir -p /app/logs

echo "========================================" >> "$LOG_FILE"
echo "Auto-approval cron job started at $(date)" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

# Run the auto-approval command
python manage.py auto_approve_staging --verbose >> "$LOG_FILE" 2>&1

# Check exit status
if [ $? -eq 0 ]; then
    echo "Auto-approval completed successfully at $(date)" >> "$LOG_FILE"
else
    echo "Auto-approval failed at $(date)" >> "$LOG_FILE"
fi

echo "" >> "$LOG_FILE"