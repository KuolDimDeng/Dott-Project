#!/usr/bin/env python3
"""
Simple script to verify the migration file syntax without needing Django installed.
"""

import ast
import sys
from pathlib import Path

def check_migration_syntax():
    """Check if the migration file has valid Python syntax"""
    migration_file = Path(__file__).parent.parent / 'session_manager' / 'migrations' / '0002_enhanced_security.py'
    
    print(f"Checking migration file: {migration_file}")
    
    if not migration_file.exists():
        print("❌ Migration file not found!")
        return False
    
    try:
        with open(migration_file, 'r') as f:
            content = f.read()
        
        # Try to parse the Python file
        ast.parse(content)
        print("✅ Migration file has valid Python syntax")
        
        # Check for the correct references
        if "'custom_auth.user'" in content:
            count = content.count("'custom_auth.user'")
            print(f"✅ Found {count} references to 'custom_auth.user' (correct)")
        
        if "'custom_auth.customuser'" in content:
            count = content.count("'custom_auth.customuser'")
            print(f"❌ Found {count} references to 'custom_auth.customuser' (incorrect)")
            return False
            
        return True
        
    except SyntaxError as e:
        print(f"❌ Syntax error in migration file: {e}")
        return False
    except Exception as e:
        print(f"❌ Error checking migration file: {e}")
        return False

if __name__ == '__main__':
    sys.exit(0 if check_migration_syntax() else 1)