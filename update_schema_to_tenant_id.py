#!/usr/bin/env python
"""
Script to update code from schema_name to tenant_id with RLS approach.

This script:
1. Identifies places that use schema_name in Python code
2. Updates database queries to use the RLS approach
3. Creates patch files for parts that need manual review
"""

import os
import re
import argparse
import logging
from pathlib import Path
import datetime

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Define the replacement patterns
REPLACEMENTS = [
    # Search path replacements
    {
        'pattern': r'SET\s+search_path\s+TO\s+(["\']?)(\w+)(["\']?)',
        'replacement': '-- RLS: No need to set search_path with tenant-aware context\n    -- Original: SET search_path TO \\1\\2\\3',
        'description': 'Set search_path to schema replacements'
    },
    # Tenant.schema_name replacements
    {
        'pattern': r'(tenant|t)\.schema_name',
        'replacement': ' \\1.id',
        'description': 'tenant.schema_name references'
    },
    # Functions that use schema_name
    {
        'pattern': r'def\s+([a-zA-Z_]+)\s*\(\s*.*?schema_name\s*:?\s*.*?\)',
        'replacement': 'def \\1(tenant_id: uuid.UUID',
        'description': 'Function signatures with schema_name parameter'
    },
    # SQL table references in tenant schemas
    {
        'pattern': r'"([^"]+)"\.([^\.]+)',
        'replacement': '/* RLS: Use tenant_id filtering */ \\2',
        'description': 'Schema-specific table references in SQL'
    }
]

# Files to skip (scripts, migrations, etc.)
SKIP_DIRS = [
    'migrations',
    '.git',
    'static',
    'media',
    '__pycache__',
    'node_modules',
    'venv',
    '.venv',
    'complete_rls_migration.sh',
]

# File patterns to include
INCLUDE_PATTERNS = [
    r'.*\.py$',
    r'.*\.js$',
]

def should_process_file(file_path):
    """Determine if a file should be processed based on patterns"""
    # Skip directories in the skip list
    parts = file_path.parts
    for skip_dir in SKIP_DIRS:
        if skip_dir in parts:
            return False
            
    # Check if the file matches include patterns
    file_str = str(file_path)
    return any(re.match(pattern, file_str) for pattern in INCLUDE_PATTERNS)

def create_rls_replacement(file_path, dry_run=True):
    """Process a file and create replacements for schema_name references"""
    path = Path(file_path)
    if not path.exists() or not path.is_file():
        logger.warning(f"File not found: {file_path}")
        return False
        
    try:
        with open(file_path, 'r') as f:
            content = f.read()
            
        # Create a backup of the original file
        if not dry_run:
            backup_file = f"{file_path}.bak-{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
            with open(backup_file, 'w') as f:
                f.write(content)
                
        # Keep track of whether any replacements were made
        made_replacements = False
            
        # Apply the replacements
        for replacement in REPLACEMENTS:
            pattern = replacement['pattern']
            replace_with = replacement['replacement']
            description = replacement['description']
            
            # Count matches before replacement
            matches = re.findall(pattern, content)
            if matches:
                logger.info(f"Found {len(matches)} {description} in {file_path}")
                made_replacements = True
                
                # Apply replacement
                if not dry_run:
                    content = re.sub(pattern, replace_with, content)
                    
        # Special case to fix search_path with tenant_id
        if 'SET search_path TO' in content and made_replacements and not dry_run:
            # Add RLS import if not present
            if 'from custom_auth.rls import' not in content:
                if 'import ' in content:
                    # Add after the last import
                    import_pattern = r'((?:from|import).*?\n)'
                    last_import = list(re.finditer(import_pattern, content))[-1]
                    insert_pos = last_import.end()
                    content = (
                        content[:insert_pos] + 
                        '\n# RLS: Importing tenant context functions\n'
                        'from custom_auth.rls import set_current_tenant_id, tenant_context\n' + 
                        content[insert_pos:]
                    )
                    
            # Replace schema-specific context with tenant context
            search_path_pattern = r'cursor\.execute\(f[\'"]SET search_path TO [\'"]?{(?:schema_name|tenant\.schema_name)}[\'"]?'
            if re.search(search_path_pattern, content):
                content = re.sub(
                    search_path_pattern,
                    '# RLS: Use tenant context instead of schema\n'
                    '        # cursor.execute(f\'SET search_path TO {schema_name}\')\n'
                    '        set_current_tenant_id(tenant_id)',
                    content
                )
                    
        # Write the modified content back to the file
        if made_replacements and not dry_run:
            with open(file_path, 'w') as f:
                f.write(content)
                
        return made_replacements
    except Exception as e:
        logger.error(f"Error processing {file_path}: {str(e)}")
        return False

def process_directory(directory, dry_run=True):
    """Recursively process all files in a directory"""
    logger.info(f"Processing directory: {directory}")
    path = Path(directory)
    
    # Process all files in the directory and subdirectories
    count_processed = 0
    count_modified = 0
    
    for file_path in path.glob('**/*'):
        if file_path.is_file() and should_process_file(file_path):
            count_processed += 1
            if create_rls_replacement(file_path, dry_run):
                count_modified += 1
                
    logger.info(f"Processed {count_processed} files, modified {count_modified} files")
    return count_processed, count_modified

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='Update code from schema_name to tenant_id with RLS approach'
    )
    parser.add_argument(
        'directory', 
        help='Directory to process'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Dry run - do not modify files'
    )
    args = parser.parse_args()
    
    if args.dry_run:
        logger.info("Running in dry-run mode - no files will be modified")
        
    process_directory(args.directory, args.dry_run)
    
    if args.dry_run:
        logger.info("Dry run complete. Run without --dry-run to apply changes.")
    else:
        logger.info("Processing complete. Please review changes.")
        logger.info("Backup files have been created with .bak-YYYYMMDDHHMMSS extension.")
    
if __name__ == '__main__':
    main() 