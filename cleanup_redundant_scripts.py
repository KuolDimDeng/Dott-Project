#!/usr/bin/env python3
"""
Script to clean up redundant scripts that are slowing down Render builds.
This will move redundant scripts to a backup directory for safety.
"""

import os
import shutil
from datetime import datetime
from pathlib import Path

# Scripts to KEEP (essential for operations)
KEEP_SCRIPTS = {
    # User management
    'interactive_user_cleanup.py',
    'comprehensive_user_cleanup.py',
    'user_deletion_utils.py',
    
    # Data seeding and setup
    'seed_local_data.py',
    'setup_local_testing.py',
    
    # Onboarding fixes (referenced in CLAUDE.md)
    'fix_all_incomplete_onboarding.py',
    
    # Recent important migrations
    'migrate_existing_ssns_to_stripe.py',
    
    # RLS management
    'rls_manager.py',
    
    # Admin utilities
    'create_admin_user.py',
    'reset_db.py',
    'reset_db_fixed.py',
    
    # Script management
    'script_registry.json',
    'create_script.py',
    
    # Current utilities
    'register_whatsapp_phone.py',
    
    # Build scripts (frontend)
    'render-build.sh',
    'optimize-build.js',
    'setup-stripe-products.js',
}

def should_delete_script(filepath):
    """Determine if a script should be deleted based on patterns."""
    filename = os.path.basename(filepath)
    
    # Keep essential scripts
    if filename in KEEP_SCRIPTS:
        return False
    
    # Delete patterns
    delete_patterns = [
        # Version fixes (one-time migrations)
        lambda f: f.startswith('Version') and '_fix_' in f,
        lambda f: f.startswith('Version') and f[7:11].isdigit(),
        
        # Old fixes (already applied)
        lambda f: f.startswith('fix_') and f.endswith('.py'),
        lambda f: f.startswith('20') and len(f) > 8 and f[0:8].isdigit(),  # Date prefixed
        
        # Test and debug scripts
        lambda f: f.startswith('test_') and f.endswith('.py'),
        lambda f: f.startswith('debug_') and f.endswith('.py'),
        lambda f: f.startswith('check_') and f.endswith('.py'),
        lambda f: f.startswith('simulate_') and f.endswith('.py'),
        
        # Apply scripts (one-time)
        lambda f: f.startswith('apply_'),
        
        # Documentation (not scripts)
        lambda f: f.endswith('.md'),
        lambda f: f.endswith('.log'),
        lambda f: f.endswith('.sql') and 'check' in f,
        
        # Backup files
        lambda f: f.endswith('.bak'),
        lambda f: '_backup' in f or '_old' in f,
        
        # Auth migration scripts
        lambda f: 'AUTH0_' in f,
        lambda f: 'auth_migration' in f.lower(),
        
        # Other one-time scripts
        lambda f: 'consolidate_' in f,
        lambda f: 'force_' in f and 'fix' in f,
        lambda f: 'mark_' in f and 'applied' in f,
    ]
    
    for pattern in delete_patterns:
        if pattern(filename):
            return True
    
    return False

def cleanup_scripts(dry_run=True):
    """Clean up redundant scripts."""
    # Create backup directory
    backup_dir = Path('/Users/kuoldeng/projectx/scripts_backup_' + datetime.now().strftime('%Y%m%d_%H%M%S'))
    if not dry_run:
        backup_dir.mkdir(exist_ok=True)
    
    # Directories to scan
    script_dirs = [
        '/Users/kuoldeng/projectx/backend/pyfactor/scripts',
        '/Users/kuoldeng/projectx/backend/scripts',
        '/Users/kuoldeng/projectx/frontend/pyfactor_next/scripts',
    ]
    
    total_files = 0
    files_to_delete = []
    files_to_keep = []
    
    for script_dir in script_dirs:
        if not os.path.exists(script_dir):
            continue
            
        for root, dirs, files in os.walk(script_dir):
            for file in files:
                if file.endswith(('.py', '.sh', '.js', '.md', '.log', '.sql')):
                    filepath = os.path.join(root, file)
                    total_files += 1
                    
                    if should_delete_script(filepath):
                        files_to_delete.append(filepath)
                    else:
                        files_to_keep.append(filepath)
    
    # Print summary
    print(f"\n=== Script Cleanup Summary ===")
    print(f"Total scripts found: {total_files}")
    print(f"Scripts to delete: {len(files_to_delete)}")
    print(f"Scripts to keep: {len(files_to_keep)}")
    print(f"Space to be freed: ~{len(files_to_delete) * 10}KB (estimated)")
    
    if dry_run:
        print("\n=== DRY RUN MODE - No files will be moved ===")
        
        print("\n=== Scripts to KEEP ===")
        for f in sorted(files_to_keep):
            print(f"  KEEP: {os.path.basename(f)}")
        
        print("\n=== Scripts to DELETE (first 20) ===")
        for f in sorted(files_to_delete)[:20]:
            print(f"  DELETE: {os.path.basename(f)}")
        
        if len(files_to_delete) > 20:
            print(f"  ... and {len(files_to_delete) - 20} more files")
    else:
        print(f"\n=== Moving files to backup: {backup_dir} ===")
        
        for filepath in files_to_delete:
            try:
                # Create relative directory structure in backup
                rel_path = os.path.relpath(filepath, '/Users/kuoldeng/projectx')
                backup_path = backup_dir / rel_path
                backup_path.parent.mkdir(parents=True, exist_ok=True)
                
                # Move file
                shutil.move(filepath, backup_path)
                print(f"  Moved: {os.path.basename(filepath)}")
            except Exception as e:
                print(f"  ERROR moving {filepath}: {e}")
    
    print(f"\n=== Cleanup {'Preview' if dry_run else 'Complete'} ===")
    print(f"This will speed up your Render builds significantly!")
    
    if dry_run:
        print("\nTo actually move the files, run:")
        print("  python cleanup_redundant_scripts.py --execute")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == '--execute':
        print("Executing cleanup...")
        cleanup_scripts(dry_run=False)
    else:
        print("Running in DRY RUN mode...")
        cleanup_scripts(dry_run=True)