#!/bin/bash
# Settlement processing script for Render cron job

cd /app/backend/pyfactor
python manage.py process_settlements --minimum 10