#!/usr/bin/env python3
"""
Version0001_update_script_registry_subscription_billing.py

This script updates the script registry to document the migration of
Subscription and Billing History tabs from My Account to Settings page.

Version: 1.0.0
Date: 2025-04-23
"""

import json
import os
import sys
from datetime import datetime

def main():
    """Update the script registry with information about the tab migration."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    registry_path = os.path.join(script_dir, 'script_registry.json')
    
    # Get current date in YYYY-MM-DD format
    current_date = datetime.now().strftime('%Y-%m-%d')
    
    try:
        # Read the existing registry
        with open(registry_path, 'r') as f:
            registry = json.load(f)
        
        # Create new script entry
        script_entry = {
            "id": "UI-001",
            "name": "Move Subscription and Billing Tabs",
            "description": "Updates backend registry for the migration of Subscription and Billing History tabs from My Account page to Settings page",
            "script_path": "Version0001_update_script_registry_subscription_billing.py",
            "version": "1.0.0",
            "date_created": current_date,
            "date_executed": current_date,
            "status": "completed",
            "affected_files": [
                "frontend/pyfactor_next/src/app/Settings/components/MyAccount.js",
                "frontend/pyfactor_next/src/app/Settings/components/SettingsManagement.js"
            ]
        }
        
        # Add to scripts array
        if "scripts" in registry:
            registry["scripts"].append(script_entry)
        else:
            registry["scripts"] = [script_entry]
        
        # Write updated registry back to file
        with open(registry_path, 'w') as f:
            json.dump(registry, f, indent=2)
        
        print("Updated backend script registry successfully")
        
        # Create documentation file
        doc_content = f"""# Subscription and Billing History Tabs Migration

## Overview
This document describes the migration of the Subscription and Billing History tabs from the My Account page to the Settings page.

## Changes Made
- Moved the Subscription Management tab from My Account to Settings
- Moved the Billing History tab from My Account to Settings
- Added new navigation items in the Settings sidebar
- Added necessary utility functions and icons
- Removed the tabs from the My Account page

## Files Modified
- `frontend/pyfactor_next/src/app/Settings/components/MyAccount.js` - Removed Subscription and Billing History tabs
- `frontend/pyfactor_next/src/app/Settings/components/SettingsManagement.js` - Added Subscription and Billing History tabs

## Date
{current_date}

## Version
1.0.0
"""
        
        doc_path = os.path.join(script_dir, 'SUBSCRIPTION_BILLING_MIGRATION.md')
        with open(doc_path, 'w') as f:
            f.write(doc_content)
        
        print(f"Created documentation file at {doc_path}")
        
        return 0
    except Exception as e:
        print(f"Error updating script registry: {e}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(main())