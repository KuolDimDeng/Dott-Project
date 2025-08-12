#!/usr/bin/env python3
"""
Version0007_fix_hr_api_authentication.py

This script fixes authentication issues in the HR API by updating the health check endpoint
and ensuring proper handling of business ID headers. The main issue involves CORS headers
and authentication requirements for the HR API endpoints.

The script does the following:
1. Updates the health check endpoint to explicitly not require authentication
2. Ensures proper CORS headers are returned in the health check response
3. Modifies the RLS middleware to handle x-business-id headers properly
4. Updates the enhanced tenant middleware to access the business ID from request headers

Author: System Administrator
Version: 1.0
Date: 2025-04-23
"""

import os
import sys
import re
import shutil
import logging
import subprocess
from datetime import datetime

# Configure logging
log_filename = "hr_api_auth_fix.log"
logging.basicConfig(
    filename=log_filename,
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# Define paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HR_VIEWS_FILE = os.path.join(BASE_DIR, 'hr', 'views.py')
ENHANCED_RLS_MIDDLEWARE_FILE = os.path.join(BASE_DIR, 'custom_auth', 'enhanced_rls_middleware.py')
BACKUP_DIR = os.path.join(BASE_DIR, 'backups')
HR_VIEWS_BACKUP = os.path.join(BACKUP_DIR, f'views.py.hr_api_auth_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}')
MIDDLEWARE_BACKUP = os.path.join(BACKUP_DIR, f'enhanced_rls_middleware.py.backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}')

def ensure_directory_exists(directory_path):
    """Ensure the specified directory exists, creating it if necessary."""
    if not os.path.exists(directory_path):
        os.makedirs(directory_path)
        logging.info(f"Created directory: {directory_path}")
    return directory_path

def create_backup(source_file, backup_file):
    """Create a backup of the specified file."""
    try:
        ensure_directory_exists(os.path.dirname(backup_file))
        shutil.copy2(source_file, backup_file)
        logging.info(f"Created backup: {backup_file}")
        print(f"✅ Created backup: {backup_file}")
        return True
    except Exception as e:
        logging.error(f"Failed to create backup: {str(e)}")
        print(f"❌ Failed to create backup: {str(e)}")
        return False

def update_hr_health_check(file_path):
    """Update the HR health check endpoint to not require authentication and handle CORS properly."""
    try:
        with open(file_path, 'r') as file:
            content = file.read()
        
        # Find the health_check function
        health_check_pattern = r'@api_view\(\[.*?\]\)\ndef health_check\(request\):'
        health_check_match = re.search(health_check_pattern, content, re.DOTALL)
        
        if not health_check_match:
            logging.error("Could not find health_check function in views.py")
            print("❌ Could not find health_check function in views.py")
            return False
        
        # Update the health check function to explicitly handle all headers
        new_health_check = """@api_view(['GET', 'OPTIONS', 'HEAD'])
def health_check(request):
    \"\"\"Health check endpoint for the HR module that doesn't require tenant ID or authentication\"\"\"
    from rest_framework.permissions import AllowAny
    from rest_framework.decorators import permission_classes
    from rest_framework.response import Response
    from rest_framework import status
    from datetime import datetime
    
    # Respond to preflight requests
    if request.method == 'OPTIONS':
        response = Response()
        # Always allow any origin for the health check endpoint
        origin = request.headers.get('Origin', '*')
        response["Access-Control-Allow-Origin"] = origin
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS, HEAD"
        response["Access-Control-Allow-Headers"] = (
            "Content-Type, Authorization, x-tenant-id, X-Tenant-ID, X-TENANT-ID, "
            "x-business-id, X-Business-ID, X-BUSINESS-ID, "
            "access-control-allow-headers, Access-Control-Allow-Headers, "
            "access-control-allow-origin, Access-Control-Allow-Origin, "
            "access-control-allow-methods, Access-Control-Allow-Methods, "
            "x-request-id, cache-control, x-user-id, x-id-token, "
            "X-Requires-Auth, x-schema-name, X-Schema-Name"
        )
        response["Access-Control-Allow-Credentials"] = "true"
        response["Access-Control-Max-Age"] = "86400"
        return response
    
    # Handle HEAD requests
    if request.method == 'HEAD':
        response = Response(status=status.HTTP_200_OK)
        origin = request.headers.get('Origin', '*')
        response["Access-Control-Allow-Origin"] = origin
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS, HEAD"
        response["Access-Control-Allow-Credentials"] = "true"
        return response

    # Get tenant ID from request if available
    tenant_id = getattr(request, 'tenant_id', None)
    if not tenant_id:
        tenant_id = request.headers.get('X-Tenant-ID') or request.headers.get('x-tenant-id')

    # Create explicit response with CORS headers
    response = Response({
        "status": "healthy",
        "module": "hr",
        "timestamp": datetime.now().isoformat(),
        "auth_required": False,
        "tenant_id": tenant_id
    }, status=status.HTTP_200_OK)
    
    # Add CORS headers
    origin = request.headers.get('Origin', '*')
    response["Access-Control-Allow-Origin"] = origin
    response["Access-Control-Allow-Methods"] = "GET, OPTIONS, HEAD"
    response["Access-Control-Allow-Headers"] = (
        "Content-Type, Authorization, x-tenant-id, X-Tenant-ID, "
        "x-business-id, X-Business-ID, X-BUSINESS-ID, "
        "access-control-allow-headers, Access-Control-Allow-Headers, "
        "access-control-allow-origin, Access-Control-Allow-Origin, "
        "access-control-allow-methods, Access-Control-Allow-Methods, "
        "x-request-id, cache-control, x-user-id, x-id-token, "
        "X-Requires-Auth, x-schema-name, X-Schema-Name"
    )
    response["Access-Control-Allow-Credentials"] = "true"
    
    return response"""
        
        # Replace the health_check function
        updated_content = re.sub(r'@api_view\(\[.*?\]\).*?def health_check\(request\):.*?return response', 
                                new_health_check, 
                                content, 
                                flags=re.DOTALL)
        
        # Write the updated content back to the file
        with open(file_path, 'w') as file:
            file.write(updated_content)
        
        logging.info("Successfully updated HR health check endpoint")
        print("✅ Successfully updated HR health check endpoint")
        return True
    
    except Exception as e:
        logging.error(f"Error updating HR health check: {str(e)}")
        print(f"❌ Error updating HR health check: {str(e)}")
        return False

def update_rls_middleware(file_path):
    """Update the Enhanced RLS Middleware to properly handle business ID headers."""
    try:
        with open(file_path, 'r') as file:
            content = file.read()
        
        # Find the _get_tenant_from_headers method
        headers_method_pattern = r'def _get_tenant_from_headers\(self, request\):.*?return tenant_id'
        headers_method_match = re.search(headers_method_pattern, content, re.DOTALL)
        
        if not headers_method_match:
            logging.error("Could not find _get_tenant_from_headers method in enhanced_rls_middleware.py")
            print("❌ Could not find _get_tenant_from_headers method in enhanced_rls_middleware.py")
            return False
        
        # Update the method to handle business ID headers
        new_headers_method = """    def _get_tenant_from_headers(self, request):
        \"\"\"Extract tenant ID from request headers\"\"\"
        # Try standard header first
        tenant_id = request.headers.get('X-Tenant-ID')
        
        # Try alternative headers if needed
        if not tenant_id:
            tenant_id = request.headers.get('x-tenant-id')
        
        if not tenant_id:
            tenant_id = request.headers.get('Tenant-ID')
            
        if not tenant_id:
            tenant_id = request.headers.get('x-tenant')
            
        # Try business ID headers as fallback (they are often the same as tenant ID)
        if not tenant_id:
            tenant_id = request.headers.get('X-Business-ID') or request.headers.get('x-business-id')
            
        return tenant_id"""
        
        # Replace the method
        updated_content = re.sub(headers_method_pattern, new_headers_method, content, flags=re.DOTALL)
        
        # Also update the public paths to include OPTIONS and HEAD requests for health endpoints
        public_paths_pattern = r'self\.public_paths = \[.*?\]'
        public_paths_match = re.search(public_paths_pattern, content, re.DOTALL)
        
        if public_paths_match:
            current_paths = public_paths_match.group(0)
            if "'/api/hr/health/'," in current_paths:
                # If health endpoint is already there, make sure we have all variations
                if "'/api/hr/health'," not in current_paths:
                    # Add the version without trailing slash
                    new_paths = current_paths.replace("'/api/hr/health/',", "'/api/hr/health/',\n            '/api/hr/health',")
                    updated_content = updated_content.replace(current_paths, new_paths)
            else:
                # If health endpoint is not there, add it
                new_paths = current_paths.replace("]", ",\n            '/api/hr/health/',\n            '/api/hr/health'\n        ]")
                updated_content = updated_content.replace(current_paths, new_paths)
        
        # Write the updated content back to the file
        with open(file_path, 'w') as file:
            file.write(updated_content)
        
        logging.info("Successfully updated RLS middleware to handle business ID headers")
        print("✅ Successfully updated RLS middleware to handle business ID headers")
        return True
    
    except Exception as e:
        logging.error(f"Error updating RLS middleware: {str(e)}")
        print(f"❌ Error updating RLS middleware: {str(e)}")
        return False

def restart_django_server():
    """Restart the Django server to apply changes."""
    try:
        # Print instructions
        print("\n📋 To apply the changes, please restart the Django server manually:")
        print("1. Stop the current Django server (Ctrl+C)")
        print("2. Run: python run_server.py\n")
        
        logging.info("Instructed user to restart Django server manually")
        return True
    
    except Exception as e:
        logging.error(f"Error providing restart instructions: {str(e)}")
        print(f"❌ Error providing restart instructions: {str(e)}")
        return False

def update_script_registry():
    """Update the script registry with the execution of this script."""
    registry_path = os.path.join(BASE_DIR, 'scripts', 'script_registry.md')
    try:
        if os.path.exists(registry_path):
            with open(registry_path, 'r') as file:
                content = file.read()
            
            # Add entry to the script registry
            script_name = os.path.basename(__file__)
            today = datetime.now().strftime('%Y-%m-%d')
            
            if "| " + script_name + " |" not in content:
                table_marker = "| Script Name | Version | Purpose | Status | Date |"
                table_entry = f"| {script_name} | 1.0 | Fix HR API authentication and business ID header handling | Completed | {today} |"
                
                # Insert after table header
                if table_marker in content:
                    new_content = content.replace(table_marker, table_marker + "\n" + table_entry)
                else:
                    # If table not found, append to end of file
                    new_content = content + "\n\n## New Scripts\n\n" + table_marker + "\n" + table_entry
                
                with open(registry_path, 'w') as file:
                    file.write(new_content)
                
                logging.info(f"Updated script registry at {registry_path}")
                print(f"✅ Updated script registry at {registry_path}")
            else:
                logging.info(f"Script already registered in {registry_path}")
                print(f"ℹ️ Script already registered in {registry_path}")
        else:
            logging.warning(f"Script registry not found at {registry_path}")
            print(f"⚠️ Script registry not found at {registry_path}")
    
    except Exception as e:
        logging.error(f"Error updating script registry: {str(e)}")
        print(f"❌ Error updating script registry: {str(e)}")

def main():
    """Main function to fix HR API authentication and business ID header handling."""
    print("\n" + "="*80)
    print("🔧 HR API Authentication and Business ID Header Fix")
    print("="*80 + "\n")
    
    # Create backup of HR views file
    if not create_backup(HR_VIEWS_FILE, HR_VIEWS_BACKUP):
        print("❌ Aborting script due to views backup failure")
        return False
    
    # Create backup of middleware file
    if not create_backup(ENHANCED_RLS_MIDDLEWARE_FILE, MIDDLEWARE_BACKUP):
        print("❌ Aborting script due to middleware backup failure")
        return False
    
    # Update HR health check endpoint
    if not update_hr_health_check(HR_VIEWS_FILE):
        print("❌ Failed to update HR health check endpoint")
        # Restore backup
        shutil.copy2(HR_VIEWS_BACKUP, HR_VIEWS_FILE)
        print(f"✅ Restored original HR views from backup: {HR_VIEWS_BACKUP}")
        return False
    
    # Update RLS middleware
    if not update_rls_middleware(ENHANCED_RLS_MIDDLEWARE_FILE):
        print("❌ Failed to update RLS middleware")
        # Restore backup
        shutil.copy2(MIDDLEWARE_BACKUP, ENHANCED_RLS_MIDDLEWARE_FILE)
        print(f"✅ Restored original middleware from backup: {MIDDLEWARE_BACKUP}")
        return False
    
    # Update script registry
    update_script_registry()
    
    # Provide restart instructions
    restart_django_server()
    
    print("\n" + "="*80)
    print("✅ HR API Authentication and Business ID Header Fix completed successfully!")
    print("="*80 + "\n")
    
    return True

if __name__ == "__main__":
    main() 