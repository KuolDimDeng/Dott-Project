#!/usr/bin/env python3
"""
Script: get_current_date.py
Purpose: Utility script to get the correct date format for script naming
Date: 2025-04-19
Version: v1.0

This script outputs the current date in the format YYYYMMDD used for script naming.
It helps maintain consistency in script naming conventions.

Execution:
    cd /Users/kuoldeng/projectx/backend/pyfactor
    python scripts/get_current_date.py

Output:
    YYYYMMDD (e.g., 20250419)
"""

import datetime
import sys

def get_date_format():
    """Get the current date in YYYYMMDD format"""
    today = datetime.datetime.now()
    formatted_date = today.strftime("%Y%m%d")
    return formatted_date

def main():
    """Main function to print the formatted date"""
    date_format = get_date_format()
    print(f"Current date in YYYYMMDD format: {date_format}")
    print(f"Use this prefix for your script names: {date_format}_")
    print(f"Example: {date_format}_script_name.py")
    return date_format

if __name__ == "__main__":
    date_string = main()
    # Return just the date string if the script is called with the --raw flag
    if len(sys.argv) > 1 and sys.argv[1] == "--raw":
        print(date_string)
        sys.exit(0) 