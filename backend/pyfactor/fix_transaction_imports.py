#!/usr/bin/env python3
"""
Script to fix all transaction imports in the codebase.
Changes 'from django.db import transaction' to 'from django.db import transaction as db_transaction'
and updates all usage of db_transaction.atomic() to db_transaction.atomic()
"""

import os
import re
import sys

def fix_transaction_imports(file_path):
    """Fix transaction imports in a single file."""
    with open(file_path, 'r') as f:
        content = f.read()
    
    original_content = content
    
    # Pattern to find imports with transaction
    # Match: from django.db import ..., transaction, ...
    # But not: from django.db import ... transaction as db_transaction
    
    # First, handle the simple case: from django.db import transaction
    if re.search(r'^from django\.db import transaction$', content, re.MULTILINE):
        content = re.sub(
            r'^from django\.db import transaction$',
            'from django.db import transaction as db_transaction',
            content,
            flags=re.MULTILINE
        )
        # Replace all db_transaction. with db_transaction.
        content = re.sub(r'\btransaction\.', 'db_transaction.', content)
        # Replace @db_transaction with @db_transaction
        content = re.sub(r'@db_transaction\b', '@db_transaction', content)
    
    # Handle case where transaction is part of a larger import
    elif re.search(r'from django\.db import.*\btransaction\b(?!\s+as\s+db_transaction)', content):
        # Complex case - transaction is imported with other things
        lines = content.split('\n')
        new_lines = []
        
        for line in lines:
            if line.strip().startswith('from django.db import') and 'transaction' in line and 'as db_transaction' not in line:
                # Replace transaction with transaction as db_transaction in the import
                line = re.sub(r'\btransaction\b', 'transaction as db_transaction', line)
            new_lines.append(line)
        
        content = '\n'.join(new_lines)
        
        # Replace all db_transaction. with db_transaction.
        content = re.sub(r'\btransaction\.', 'db_transaction.', content)
        # Replace @db_transaction with @db_transaction
        content = re.sub(r'@db_transaction\b', '@db_transaction', content)
    
    if content != original_content:
        with open(file_path, 'w') as f:
            f.write(content)
        return True
    return False

def main():
    """Find and fix all Python files with incorrect transaction imports."""
    fixed_files = []
    
    # Find all Python files
    for root, dirs, files in os.walk('.'):
        # Skip virtual environments and common ignore directories
        dirs[:] = [d for d in dirs if d not in ['venv', 'env', '.env', '__pycache__', '.git', 'node_modules']]
        
        for file in files:
            if file.endswith('.py'):
                file_path = os.path.join(root, file)
                
                # Check if file needs fixing
                try:
                    with open(file_path, 'r') as f:
                        content = f.read()
                    
                    # Check if file imports transaction without alias
                    if re.search(r'from django\.db import.*\btransaction\b(?!\s+as\s+db_transaction)', content):
                        if fix_transaction_imports(file_path):
                            fixed_files.append(file_path)
                            print(f"Fixed: {file_path}")
                except Exception as e:
                    print(f"Error processing {file_path}: {e}")
    
    print(f"\nTotal files fixed: {len(fixed_files)}")
    if fixed_files:
        print("\nFixed files:")
        for f in sorted(fixed_files):
            print(f"  {f}")

if __name__ == '__main__':
    main()