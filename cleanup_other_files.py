#!/usr/bin/env python3
"""
Clean up other non-essential files that slow down Render builds.
"""

import os
import shutil
from datetime import datetime
from pathlib import Path

def cleanup_other_files(dry_run=True):
    """Clean up non-essential files."""
    backup_dir = Path('/Users/kuoldeng/projectx/other_files_backup_' + datetime.now().strftime('%Y%m%d_%H%M%S'))
    if not dry_run:
        backup_dir.mkdir(exist_ok=True)
    
    projectx_path = Path('/Users/kuoldeng/projectx')
    files_to_delete = []
    
    # Find files to delete
    patterns_to_delete = [
        # Log files
        '**/*.log',
        # Backup files
        '**/*.bak',
        '**/*_backup*',
        '**/*_old*',
        # Version directories (empty ones)
        '**/Version*/',
        # Temporary files
        '**/*.tmp',
        '**/*.temp',
        # Python cache
        '**/__pycache__/',
        '**/*.pyc',
        '**/*.pyo',
        # Old migration SQL files
        '**/old_migrations/',
        '**/migration_backups/',
        # Test data files
        '**/test_data/',
        '**/test_*.json',
        '**/test_*.csv',
    ]
    
    for pattern in patterns_to_delete:
        for path in projectx_path.glob(pattern):
            # Skip node_modules and .git
            if 'node_modules' in str(path) or '.git' in str(path):
                continue
            # Skip the backup directories we just created
            if 'scripts_backup' in str(path) or 'other_files_backup' in str(path):
                continue
            
            files_to_delete.append(path)
    
    print(f"\n=== Other Files Cleanup Summary ===")
    print(f"Files/directories to clean: {len(files_to_delete)}")
    
    if dry_run:
        print("\n=== DRY RUN MODE ===")
        print("\nFiles to delete (first 30):")
        for f in sorted(files_to_delete)[:30]:
            print(f"  {f.relative_to(projectx_path)}")
        if len(files_to_delete) > 30:
            print(f"  ... and {len(files_to_delete) - 30} more")
    else:
        print(f"\n=== Moving files to: {backup_dir} ===")
        for filepath in files_to_delete:
            try:
                rel_path = filepath.relative_to(projectx_path)
                backup_path = backup_dir / rel_path
                
                if filepath.is_dir():
                    # For directories, create parent and move
                    backup_path.parent.mkdir(parents=True, exist_ok=True)
                    shutil.move(str(filepath), str(backup_path))
                    print(f"  Moved directory: {rel_path}")
                else:
                    # For files
                    backup_path.parent.mkdir(parents=True, exist_ok=True)
                    shutil.move(str(filepath), str(backup_path))
                    print(f"  Moved file: {rel_path}")
            except Exception as e:
                print(f"  ERROR: {filepath} - {e}")
    
    print(f"\n=== Cleanup {'Preview' if dry_run else 'Complete'} ===")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == '--execute':
        cleanup_other_files(dry_run=False)
    else:
        cleanup_other_files(dry_run=True)