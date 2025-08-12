#!/usr/bin/env python
"""
Security audit script to find dangerous patterns that bypass tenant isolation.
"""
import os
import re
from pathlib import Path

def audit_codebase():
    """Audit the codebase for security issues."""
    
    print("="*60)
    print("🔒 SECURITY AUDIT - Tenant Isolation Check")
    print("="*60)
    
    issues_found = []
    files_checked = 0
    
    # Patterns to look for
    dangerous_patterns = [
        (r'\.all_objects\.', 'Uses all_objects which bypasses tenant filtering'),
        (r'Customer\.objects\.all\(\)(?!.*super)', 'Customer.objects.all() without tenant filtering'),
        (r'Product\.objects\.all\(\)(?!.*super)', 'Product.objects.all() without tenant filtering'),
        (r'Service\.objects\.all\(\)(?!.*super)', 'Service.objects.all() without tenant filtering'),
        (r'Invoice\.objects\.all\(\)(?!.*super)', 'Invoice.objects.all() without tenant filtering'),
        (r'filter\(\)\.all\(\)', 'Empty filter() which returns all records'),
    ]
    
    # Directories to skip
    skip_dirs = ['migrations', '__pycache__', 'venv', '.git', 'static', 'media', 'node_modules']
    
    # File extensions to check
    check_extensions = ['.py']
    
    # Files to skip
    skip_files = ['security_audit.py', 'manage.py', 'settings.py', 'urls.py']
    
    base_path = Path('/Users/kuoldeng/projectx/backend/pyfactor')
    
    for root, dirs, files in os.walk(base_path):
        # Skip certain directories
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        
        for file in files:
            # Skip non-Python files
            if not any(file.endswith(ext) for ext in check_extensions):
                continue
            
            # Skip certain files
            if file in skip_files:
                continue
            
            # Skip test files and scripts (they might have legitimate uses)
            if 'test_' in file or file.startswith('test') or '/scripts/' in root:
                continue
                
            filepath = os.path.join(root, file)
            relative_path = Path(filepath).relative_to(base_path)
            
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    files_checked += 1
                    
                    # Check each line
                    for line_num, line in enumerate(content.splitlines(), 1):
                        # Skip comments
                        if line.strip().startswith('#'):
                            continue
                        
                        # Check for dangerous patterns
                        for pattern, description in dangerous_patterns:
                            if re.search(pattern, line):
                                # Skip if it's in a docstring or comment
                                if '"""' in line or "'''" in line or '#' in line:
                                    continue
                                
                                issues_found.append({
                                    'file': str(relative_path),
                                    'line': line_num,
                                    'issue': description,
                                    'code': line.strip()
                                })
                                
            except Exception as e:
                print(f"Error reading {relative_path}: {e}")
    
    # Report findings
    print(f"\n📊 Files checked: {files_checked}")
    print(f"🔍 Issues found: {len(issues_found)}")
    
    if issues_found:
        print("\n⚠️  SECURITY ISSUES FOUND:")
        print("-" * 60)
        
        # Group by file
        issues_by_file = {}
        for issue in issues_found:
            if issue['file'] not in issues_by_file:
                issues_by_file[issue['file']] = []
            issues_by_file[issue['file']].append(issue)
        
        for file, file_issues in issues_by_file.items():
            print(f"\n📄 {file}")
            for issue in file_issues:
                print(f"  Line {issue['line']}: {issue['issue']}")
                print(f"    Code: {issue['code'][:80]}...")
    else:
        print("\n✅ No security issues found!")
        print("All ViewSets and queries appear to properly filter by tenant.")
    
    # Additional checks
    print("\n" + "="*60)
    print("📋 ADDITIONAL SECURITY CHECKS")
    print("="*60)
    
    # Check for TenantIsolatedViewSet usage
    tenant_viewset_count = 0
    regular_viewset_count = 0
    
    for root, dirs, files in os.walk(base_path):
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        for file in files:
            if file.endswith('.py') and 'views' in file:
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r') as f:
                        content = f.read()
                        if 'TenantIsolatedViewSet' in content:
                            tenant_viewset_count += content.count('class ') 
                        elif 'ModelViewSet' in content and 'TenantIsolatedViewSet' not in content:
                            regular_viewset_count += content.count('ModelViewSet')
                except:
                    pass
    
    print(f"✅ ViewSets using TenantIsolatedViewSet: ~{tenant_viewset_count}")
    print(f"⚠️  ViewSets NOT using TenantIsolatedViewSet: ~{regular_viewset_count}")
    
    return len(issues_found) == 0

if __name__ == "__main__":
    success = audit_codebase()
    exit(0 if success else 1)