#!/usr/bin/env python
"""
Script to fix all missing SalesOrder table columns
Version: 0002
Created: 2025-01-26
Issue: Sales order creation failing due to multiple missing columns

This script documents the migration needed to add all missing fields to the sales_salesorder table.
"""

# PROBLEM DESCRIPTION:
# ===================
# The sales_salesorder table is missing multiple columns that exist in the Django model:
# - payment_terms
# - due_date
# - subtotal
# - tax_total
# - tax_rate
# - discount_percentage
# - shipping_cost
# - total
# - total_amount
# - notes
# - estimate_id

# The sales_salesorderitem table is also missing columns:
# - item_type
# - product_id
# - service_id
# - item_id
# - description
# - quantity
# - unit_price
# - tax_rate
# - tax_amount
# - total

# SOLUTION:
# =========
# Run Django migrations 0005 and 0006 which safely add all missing columns

# COMMANDS TO RUN ON BACKEND:
# ==========================
"""
# 1. First, merge any conflicting migrations (if needed):
python manage.py makemigrations --merge

# 2. Apply any pending custom_auth migrations:
python manage.py migrate custom_auth

# 3. Check current sales migration status:
python manage.py showmigrations sales

# 4. Apply the comprehensive migrations:
python manage.py migrate sales 0005
python manage.py migrate sales 0006

# 5. Verify all columns were added:
python manage.py dbshell

# In PostgreSQL shell, run:
\d sales_salesorder

# You should see all these columns in sales_salesorder:
# - payment_terms (character varying(50))
# - due_date (date)
# - subtotal (numeric(19,4))
# - tax_total (numeric(19,4))
# - tax_rate (numeric(5,2))
# - discount_percentage (numeric(5,2))
# - shipping_cost (numeric(10,2))
# - total (numeric(19,4))
# - total_amount (numeric(19,4))
# - notes (text)
# - estimate_id (uuid)

# Also check sales_salesorderitem:
\d sales_salesorderitem

# You should see these columns:
# - item_type (character varying(20))
# - product_id (uuid)
# - service_id (uuid)
# - item_id (character varying(100))
# - description (character varying(200))
# - quantity (numeric(10,2))
# - unit_price (numeric(10,2))
# - tax_rate (numeric(5,2))
# - tax_amount (numeric(10,2))
# - total (numeric(10,2))

# Exit PostgreSQL:
\q
"""

# MIGRATION DETAILS:
# ==================
# File 1: /backend/pyfactor/sales/migrations/0005_add_missing_salesorder_fields.py
# - Adds all missing columns to sales_salesorder table
# 
# File 2: /backend/pyfactor/sales/migrations/0006_add_missing_salesorderitem_fields.py
# - Adds all missing columns to sales_salesorderitem table
# 
# Both migrations use conditional SQL to check if each column exists before adding it,
# making it safe to run multiple times. Each field has appropriate:
# - Data types matching the Django model
# - Default values for existing records
# - NULL handling as defined in the model

# VERIFICATION:
# =============
# After running the migration, test sales order creation in the frontend:
# 1. Navigate to Sales > Orders
# 2. Click "Create New Sales Order"
# 3. Fill in all required fields
# 4. Click "Create Sales Order"
# 5. Order should be created successfully without 500 errors

print("Sales Order Missing Fields Fix - Version 0002")
print("=" * 50)
print("This script documents the fix for missing database columns")
print("See comments in this file for migration commands")
print("\nNOTE: This is a comprehensive fix that adds ALL missing columns at once")