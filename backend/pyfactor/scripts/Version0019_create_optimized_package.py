#!/usr/bin/env python
"""
Script: Version0019_create_optimized_package.py
Purpose: Create an optimized deployment package with health check fixes within AWS size limits
Issue: health-check-fixed-package.zip exceeds AWS Elastic Beanstalk size limits (500MB)
Author: System
Date: May 16, 2025
"""

import os
import sys
import shutil
import zipfile
import tempfile
import subprocess
from datetime import datetime

# Configuration paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HEALTH_CONFIG_PATH = os.path.join(PROJECT_ROOT, '.ebextensions/03_health_check.config')
OUTPUT_PATH = os.path.join(PROJECT_ROOT, 'optimized-health-check-package.zip')

# Directories and files to exclude from the package
EXCLUDE_PATTERNS = [
    '*.pyc',
    '__pycache__',
    '.git',
    '.github',
    '.elasticbeanstalk/app_versions',
    'node_modules',
    '.venv',
    'venv',
    'env',
    'backups',
    '*.log',
    '*.zip',
    '.DS_Store',
    '*.bak',
    'test_data',
    'tests/data',
    'docs',
]

def verify_health_check_config():
    """Verify that the health check config has the fix applied."""
    if not os.path.exists(HEALTH_CONFIG_PATH):
        print(f"Error: Health check config file not found at {HEALTH_CONFIG_PATH}")
        return False
    
    with open(HEALTH_CONFIG_PATH, 'r') as f:
        content = f.read()
    
    # Check if the fix has been applied (30-second interval)
    if 'HealthCheckInterval: \'30\'' in content:
        print("✅ Health check configuration has been fixed")
        return True
    
    print("❌ Health check configuration has NOT been fixed!")
    print("Please run Version0018_fix_health_check_config.py first")
    return False

def should_exclude(path):
    """Check if a path should be excluded from the package."""
    for pattern in EXCLUDE_PATTERNS:
        # Handle directory exclusions
        if pattern.endswith('/') and path.endswith(pattern):
            return True
        # Handle file pattern exclusions
        if '*.' in pattern:
            ext = pattern.replace('*.', '.')
            if path.endswith(ext):
                return True
        # Handle exact matches
        if pattern in path:
            return True
    return False

def create_optimized_package():
    """Create an optimized deployment package."""
    if os.path.exists(OUTPUT_PATH):
        print(f"Removing existing package at {OUTPUT_PATH}")
        os.remove(OUTPUT_PATH)
    
    print(f"Creating optimized package at {OUTPUT_PATH}")
    
    total_size = 0
    file_count = 0
    
    with zipfile.ZipFile(OUTPUT_PATH, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(PROJECT_ROOT):
            # Skip dirs that match exclude patterns
            dirs[:] = [d for d in dirs if not should_exclude(os.path.join(root, d))]
            
            for file in files:
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, PROJECT_ROOT)
                
                # Skip files that match exclude patterns
                if should_exclude(file_path) or should_exclude(rel_path):
                    continue
                
                # Skip the output file itself
                if file_path == OUTPUT_PATH:
                    continue
                
                # Add file to zip
                zipf.write(file_path, rel_path)
                
                # Update stats
                file_size = os.path.getsize(file_path)
                total_size += file_size
                file_count += 1
                
                # Print progress for large files
                if file_size > 1024 * 1024:  # 1MB
                    print(f"Added: {rel_path} ({file_size / (1024 * 1024):.2f} MB)")
    
    print(f"\nPackage created with {file_count} files")
    print(f"Total size: {total_size / (1024 * 1024):.2f} MB")
