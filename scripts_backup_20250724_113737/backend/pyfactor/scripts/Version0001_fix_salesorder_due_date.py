#!/usr/bin/env python
"""
Script: Version0001_fix_salesorder_due_date.py
Purpose: Add missing due_date column to sales_salesorder table
Author: Claude
Date: 2025-06-26

This script provides instructions for applying the migration that adds
the missing due_date field to the SalesOrder model.

The field is defined as:
- Column name: due_date
- Type: DateField
- Default: current date + 30 days
"""

import os
import sys

def main():
    print("=" * 60)
    print("SalesOrder due_date Migration Script")
    print("=" * 60)
    print()
    print("This script adds the missing 'due_date' column to the sales_salesorder table.")
    print()
    print("Migration Details:")
    print("- Field: due_date")
    print("- Type: DateField")
    print("- Default: current date + 30 days")
    print("- Migration file: sales/migrations/0004_add_salesorder_due_date.py")
    print()
    print("To apply this migration on the backend:")
    print()
    print("1. First, check the current migration status:")
    print("   python manage.py showmigrations sales")
    print()
    print("2. Apply the migration:")
    print("   python manage.py migrate sales 0004")
    print()
    print("3. If you're on Render, use the shell:")
    print("   - Go to the Render dashboard")
    print("   - Navigate to your backend service (dott-api)")
    print("   - Click on 'Shell' tab")
    print("   - Run the commands above")
    print()
    print("4. Verify the migration was applied:")
    print("   python manage.py dbshell")
    print("   \\d sales_salesorder")
    print("   (Look for the due_date column)")
    print()
    print("Note: The migration will add the column with a default value")
    print("of 30 days from the current date for all existing records.")
    print("=" * 60)

if __name__ == "__main__":
    main()