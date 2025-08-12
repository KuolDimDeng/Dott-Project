#!/usr/bin/env python3
"""
Test CSP Security Configuration
Verifies that Content Security Policy is properly configured without unsafe directives
"""

import os
import sys
import re
from pathlib import Path

# Add project to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / 'backend' / 'pyfactor'))

def check_settings_file():
    """Check Django settings for unsafe CSP directives"""
    settings_path = project_root / 'backend' / 'pyfactor' / 'pyfactor' / 'settings.py'
    
    print("🔍 Checking Django settings.py...")
    
    with open(settings_path, 'r') as f:
        content = f.read()
    
    issues = []
    
    # Check for unsafe-inline in script-src
    if re.search(r"CSP_SCRIPT_SRC.*unsafe-inline", content):
        issues.append("❌ Found 'unsafe-inline' in CSP_SCRIPT_SRC")
    else:
        print("✅ No 'unsafe-inline' in CSP_SCRIPT_SRC")
    
    # Check for unsafe-eval in script-src
    if re.search(r"CSP_SCRIPT_SRC.*unsafe-eval", content):
        issues.append("❌ Found 'unsafe-eval' in CSP_SCRIPT_SRC")
    else:
        print("✅ No 'unsafe-eval' in CSP_SCRIPT_SRC")
    
    # Note about style-src (temporarily allowed)
    if re.search(r"CSP_STYLE_SRC.*unsafe-inline", content):
        print("⚠️  'unsafe-inline' in CSP_STYLE_SRC (temporarily allowed for CSS frameworks)")
    
    return issues

def check_middleware():
    """Check SecurityHeadersMiddleware for unsafe CSP"""
    middleware_path = project_root / 'backend' / 'pyfactor' / 'custom_auth' / 'unified_middleware.py'
    
    print("\n🔍 Checking SecurityHeadersMiddleware...")
    
    with open(middleware_path, 'r') as f:
        content = f.read()
    
    issues = []
    
    # Check for unsafe-inline in script-src
    if re.search(r"script-src.*unsafe-inline", content):
        issues.append("❌ Found 'unsafe-inline' in middleware CSP script-src")
    else:
        print("✅ No 'unsafe-inline' in middleware CSP script-src")
    
    # Check for unsafe-eval
    if re.search(r"script-src.*unsafe-eval", content):
        issues.append("❌ Found 'unsafe-eval' in middleware CSP script-src")
    else:
        print("✅ No 'unsafe-eval' in middleware CSP script-src")
    
    return issues

def check_admin_security():
    """Check admin security configuration"""
    admin_path = project_root / 'backend' / 'pyfactor' / 'notifications' / 'admin_security.py'
    
    print("\n🔍 Checking Admin Security Configuration...")
    
    with open(admin_path, 'r') as f:
        content = f.read()
    
    issues = []
    
    # Check for unsafe directives in admin CSP
    if re.search(r"script-src.*unsafe-inline", content):
        issues.append("❌ Found 'unsafe-inline' in admin CSP script-src")
    else:
        print("✅ No 'unsafe-inline' in admin CSP script-src")
    
    if re.search(r"script-src.*unsafe-eval", content):
        issues.append("❌ Found 'unsafe-eval' in admin CSP script-src")
    else:
        print("✅ No 'unsafe-eval' in admin CSP script-src")
    
    return issues

def check_frontend_csp():
    """Check Next.js CSP configuration"""
    nextconfig_path = project_root / 'frontend' / 'pyfactor_next' / 'next.config.js'
    
    print("\n🔍 Checking Next.js Configuration...")
    
    with open(nextconfig_path, 'r') as f:
        content = f.read()
    
    issues = []
    
    # Check for unsafe-inline in script-src
    if re.search(r"script-src.*unsafe-inline", content):
        issues.append("❌ Found 'unsafe-inline' in Next.js CSP script-src")
    else:
        print("✅ No 'unsafe-inline' in Next.js CSP script-src")
    
    # Check for unsafe-eval
    if re.search(r"script-src.*unsafe-eval", content):
        issues.append("❌ Found 'unsafe-eval' in Next.js CSP script-src")
    else:
        print("✅ No 'unsafe-eval' in Next.js CSP script-src")
    
    return issues

def check_inline_scripts():
    """Check for inline scripts in templates"""
    print("\n🔍 Checking for inline scripts in templates...")
    
    # Check Django templates
    django_templates = project_root / 'backend' / 'pyfactor'
    inline_count = 0
    
    for template in django_templates.rglob('*.html'):
        with open(template, 'r') as f:
            content = f.read()
        
        # Check for inline scripts
        if '<script>' in content and 'nonce=' not in content:
            inline_count += 1
            rel_path = template.relative_to(project_root)
            print(f"⚠️  Inline script without nonce in: {rel_path}")
    
    if inline_count == 0:
        print("✅ No inline scripts without nonces found in Django templates")
    else:
        print(f"⚠️  Found {inline_count} templates with inline scripts")
    
    return []

def main():
    """Run all CSP security checks"""
    print("=" * 60)
    print("🛡️  CSP SECURITY CONFIGURATION TEST")
    print("=" * 60)
    
    all_issues = []
    
    # Run all checks
    all_issues.extend(check_settings_file())
    all_issues.extend(check_middleware())
    all_issues.extend(check_admin_security())
    all_issues.extend(check_frontend_csp())
    check_inline_scripts()
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 SUMMARY")
    print("=" * 60)
    
    if not all_issues:
        print("✅ CSP configuration is secure!")
        print("✅ No unsafe-inline or unsafe-eval in script-src directives")
        print("\n🎉 All security checks passed!")
        return 0
    else:
        print("❌ Security issues found:")
        for issue in all_issues:
            print(f"  {issue}")
        print("\n⚠️  Please fix these issues before deploying to production")
        return 1

if __name__ == "__main__":
    sys.exit(main())