#!/bin/bash
# Daily settlement processing cron job
# Add to crontab: 0 2 * * * /path/to/daily_settlement_cron.sh

# Set environment
export DJANGO_SETTINGS_MODULE=pyfactor.settings
cd /app/backend/pyfactor

# Log file
LOG_FILE="/var/log/settlement_processing.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] Starting daily settlement processing" >> $LOG_FILE

# Process settlements
python manage.py process_settlements --minimum 10 >> $LOG_FILE 2>&1

# Retry failed settlements from last 7 days
python manage.py process_settlements --retry-failed --minimum 10 >> $LOG_FILE 2>&1

echo "[$DATE] Settlement processing completed" >> $LOG_FILE
echo "----------------------------------------" >> $LOG_FILE