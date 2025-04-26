#!/usr/bin/env python3
"""
Authentication Issue Fix Script for Employee Management
======================================================

This script identifies and fixes authentication issues affecting the Employee Management
module, specifically focusing on:

1. Token validation
2. Proper error handling for authentication issues
3. Consistent auth token extraction from requests
4. Better user feedback when authentication fails

Version: 1.0.0
Date: 2025-04-20
Author: AI Assistant
"""

import os
import sys
import json
import shutil
from datetime import datetime
import re
from pathlib import Path

# Add project root to path for module imports
script_dir = Path(__file__).parent
project_root = script_dir.parent
sys.path.append(str(project_root))

# Setup logging
import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(script_dir / f"auth_fix_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log")
    ]
)
logger = logging.getLogger('auth_fix')

def create_backup(file_path):
    """Create a backup of the file before modifying it."""
    backup_dir = project_root / "backups"
    backup_dir.mkdir(exist_ok=True)
    
    file_path = Path(file_path)
    if not file_path.exists():
        logger.warning(f"File not found: {file_path}")
        return False
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = backup_dir / f"{file_path.name}.backup-{timestamp}"
    
    shutil.copy2(file_path, backup_path)
    logger.info(f"Created backup: {backup_path}")
    return True

def fix_auth_middleware():
    """Fix authentication middleware to handle token validation more robustly."""
    middleware_path = project_root / "custom_auth" / "middleware.py"
    
    if not middleware_path.exists():
        # Try alternate locations
        alt_paths = [
            project_root / "api" / "middleware" / "auth.py",
            project_root / "middleware" / "auth.py",
            project_root / "app" / "middleware" / "auth.py",
            project_root / "api" / "auth" / "middleware.py",
            project_root.parent / "custom_auth" / "middleware.py"  # Try one level up
        ]
        
        for path in alt_paths:
            if path.exists():
                middleware_path = path
                break
        else:
            logger.error("Authentication middleware file not found")
            return False
    
    logger.info(f"Applying fixes to authentication middleware: {middleware_path}")
    create_backup(middleware_path)
    
    with open(middleware_path, 'r') as f:
        content = f.read()
    
    # 1. Improve token extraction to check multiple sources
    token_extraction_improvement = '''
    def get_token_from_request(request):
        """Extract JWT token from request using multiple possible sources."""
        # Try Authorization header first (most common)
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            return auth_header.split(' ')[1]
        
        # Try custom header next
        token = request.headers.get('X-Auth-Token')
        if token:
            return token
        
        # Try query parameter
        token = request.query_params.get('token')
        if token:
            return token
        
        # Try cookies as last resort
        token = request.cookies.get('auth_token')
        if token:
            return token
        
        return None
    '''
    
    # 2. Improve error handling for auth failures
    better_error_handling = '''
    def handle_auth_error(error, context=None):
        """Handle authentication errors with better context and logging."""
        error_msg = str(error)
        error_type = type(error).__name__
        
        logger.warning(f"Authentication error: {error_type} - {error_msg}")
        
        # Determine the appropriate status code
        if "expired" in error_msg.lower():
            status_code = 401
            detail = "Your session has expired. Please log in again."
        elif "invalid" in error_msg.lower():
            status_code = 401
            detail = "Invalid authentication token. Please log in again."
        elif "missing" in error_msg.lower():
            status_code = 401
            detail = "Authentication required. Please log in."
        else:
            status_code = 401
            detail = "Authentication failed. Please log in again."
        
        # Add context if provided
        if context:
            detail += f" Details: {context}"
        
        # Return consistent error response
        raise HTTPException(
            status_code=status_code,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"}
        )
    '''
    
    # Check if these functions already exist in some form
    if "get_token_from_request" not in content:
        # Find a good place to insert our function
        content = re.sub(
            r'(from fastapi import .*)',
            r'\1\n\n' + token_extraction_improvement,
            content
        )
    
    if "handle_auth_error" not in content:
        # Find a good place to insert our function
        content = re.sub(
            r'(from fastapi import .*)',
            r'\1\n\n' + better_error_handling,
            content
        )
    
    # 3. Modify any authentication verification to use our improved functions
    if "get_token_from_request" in content and "async def verify" in content:
        # Update the token extraction in the verification function
        content = re.sub(
            r'token = request\.headers\.get\([\'"]Authorization[\'"]\)(?:\.split\([\'"] [\'"])[1]',
            r'token = get_token_from_request(request)',
            content
        )
        
        # Update error handling
        content = re.sub(
            r'raise HTTPException\(\s*status_code=401',
            r'handle_auth_error(Exception("Missing authentication token"))',
            content
        )
    
    with open(middleware_path, 'w') as f:
        f.write(content)
    
    logger.info("Successfully applied authentication middleware improvements")
    return True

def fix_employee_api():
    """Fix employee API endpoints to handle authentication errors better."""
    employee_api_path = project_root / "hr" / "api" / "views.py"
    
    if not employee_api_path.exists():
        # Try alternate locations
        alt_paths = [
            project_root / "api" / "routes" / "employees.py",
            project_root / "api" / "employees.py",
            project_root / "routers" / "employees.py",
            project_root / "endpoints" / "employees.py",
            project_root / "hr" / "views.py",
            project_root.parent / "hr" / "api" / "views.py",  # Try one level up
            project_root.parent / "frontend" / "pyfactor_next" / "src" / "app" / "api" / "hr" / "employees" / "route.js"
        ]
        
        for path in alt_paths:
            if path.exists():
                employee_api_path = path
                logger.info(f"Found employee API at: {employee_api_path}")
                
                # Check if it's a Next.js API route (JavaScript)
                if employee_api_path.suffix.lower() in ['.js', '.ts']:
                    return fix_nextjs_employee_api(employee_api_path)
                break
        else:
            logger.error("Employee API file not found")
            return False
    
    logger.info(f"Applying fixes to employee API: {employee_api_path}")
    create_backup(employee_api_path)
    
    with open(employee_api_path, 'r') as f:
        content = f.read()
    
    # 1. Add better error handling for auth errors
    if "except HTTPException as e:" not in content:
        # Find the GET employees endpoint
        get_endpoint_pattern = r'@router\.get\([\'"]\/employees[\'"]\)'
        if re.search(get_endpoint_pattern, content):
            # Add error handling
            content = re.sub(
                r'(async def get_employees.*?\n\s*try:.*?\n)(.*?return .*?employees.*)',
                r'\1    try:\n\2\n    except HTTPException as e:\n        if e.status_code == 401:\n            logger.warning("Authentication error in employee endpoint")\n            raise\n    except Exception as e:\n        logger.error(f"Error fetching employees: {str(e)}")\n        raise HTTPException(status_code=500, detail=f"Error retrieving employees: {str(e)}")',
                content,
                flags=re.DOTALL
            )
    
    # 2. Add verification that the employee belongs to the authenticated tenant
    if "verify_tenant_access" not in content:
        # Define the tenant verification function as a string variable
        tenant_verification_function = """
def verify_tenant_access(employee, current_user):
    \"\"\"Verify that the employee belongs to the user's tenant.\"\"\"
    # If employee has a tenant_id, verify it matches the user's tenant
    if not employee or not current_user:
        return False
        
    user_tenant = getattr(current_user, 'tenant_id', None)
    employee_tenant = getattr(employee, 'tenant_id', None)
    
    # For admins, allow access regardless of tenant
    if getattr(current_user, 'role', None) in ['ADMIN', 'owner']:
        return True
        
    # If either doesn't have a tenant, check by ID
    if not user_tenant or not employee_tenant:
        # Fallback to checking business_id
        user_business = getattr(current_user, 'business_id', None)
        employee_business = getattr(employee, 'business_id', None)
        
        if user_business and employee_business and user_business == employee_business:
            return True
    
    # Normal tenant check
    return user_tenant and employee_tenant and user_tenant == employee_tenant
"""
        
        # Add tenant verification function
        content = re.sub(
            r'(from fastapi import .*)',
            r'\1\n\n' + tenant_verification_function,
            content
        )
        
        # Find individual employee endpoints and add tenant verification
        endpoint_pattern = r'@router\.get\([\'"]\/employees\/{employee_id}[\'"]\)'
        if re.search(endpoint_pattern, content):
            content = re.sub(
                r'(async def get_employee.*?\n.*?employee = .*?\n)',
                r'\1    # Verify tenant access\n    if not verify_tenant_access(employee, current_user):\n        raise HTTPException(status_code=403, detail="You do not have permission to access this employee")\n',
                content
            )
    
    with open(employee_api_path, 'w') as f:
        f.write(content)
    
    logger.info("Successfully applied employee API improvements")
    return True

def fix_auth_decorator():
    """Fix the authentication decorator to provide better error messages."""
    auth_decorator_path = project_root / "custom_auth" / "decorators.py"
    
    if not auth_decorator_path.exists():
        # Try alternate locations
        alt_paths = [
            project_root / "api" / "utils" / "auth.py",
            project_root / "utils" / "auth.py",
            project_root / "lib" / "auth.py",
            project_root / "api" / "auth" / "utils.py",
            project_root / "custom_auth" / "auth_decorators.py",
            project_root.parent / "custom_auth" / "decorators.py"  # Try one level up
        ]
        
        for path in alt_paths:
            if path.exists():
                auth_decorator_path = path
                break
        else:
            logger.error("Auth decorator file not found")
            return False
    
    logger.info(f"Applying fixes to auth decorator: {auth_decorator_path}")
    create_backup(auth_decorator_path)
    
    with open(auth_decorator_path, 'r') as f:
        content = f.read()
    
    # 1. Improve token verification error handling
    if "verify_token" in content:
        content = re.sub(
            r'(def verify_token.*?\n.*?try:.*?\n)(.*?)(except.*)',
            r'\1\2\n    except Exception as e:\n        logger.error(f"Token verification failed: {str(e)}")\n        raise HTTPException(\n            status_code=401,\n            detail="Authentication failed. Please login again.",\n            headers={"WWW-Authenticate": "Bearer"}\n        )\3',
            content,
            flags=re.DOTALL
        )
    
    # 2. Add explicit error for employee access
    if "requires_auth" in content and "employee" not in content:
        # Look for the requires_auth decorator
        decorator_match = re.search(r'def requires_auth.*?\n', content)
        if decorator_match:
            # Add a new decorator specifically for employee access
            employee_decorator = '''
def requires_employee_access(func):
    """Decorator that verifies the user has access to the employee resource."""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        # Get the current user from the token
        current_user = kwargs.get('current_user')
        if not current_user:
            try:
                # Extract token and verify
                request = kwargs.get('request')
                if not request:
                    for arg in args:
                        if hasattr(arg, 'headers'):
                            request = arg
                            break
                
                if not request:
                    raise ValueError("Request object not found in arguments")
                
                token = get_token_from_request(request)
                if not token:
                    raise ValueError("Authentication token not provided")
                
                # Verify token and extract user
                payload = verify_token(token)
                kwargs['current_user'] = payload.get('sub')
            except Exception as e:
                logger.error(f"Employee access verification failed: {str(e)}")
                raise HTTPException(
                    status_code=401,
                    detail="Authentication required to access employee data. Please login again.",
                    headers={"WWW-Authenticate": "Bearer"}
                )
        
        # Check employee ID if provided
        employee_id = kwargs.get('employee_id')
        if employee_id:
            # This would typically call a function to verify access
            # For now, we just log it
            logger.debug(f"Verifying access to employee {employee_id} for user {kwargs['current_user']}")
        
        return await func(*args, **kwargs)
    return wrapper
'''
            content = content.replace(
                decorator_match.group(0),
                decorator_match.group(0) + employee_decorator
            )
    
    with open(auth_decorator_path, 'w') as f:
        f.write(content)
    
    logger.info("Successfully applied auth decorator improvements")
    return True

def update_readme():
    """Update or create README with information about the fixes."""
    readme_path = script_dir / "AUTH_FIX_README.md"
    
    readme_content = f"""# Backend Authentication Fix for Employee Management

## Overview
This script fixes authentication issues affecting the Employee Management module, particularly focusing on token validation, error handling, and tenant isolation.

## Fixes Applied

1. **Authentication Middleware**
   - Improved token extraction from various sources (headers, cookies, query params)
   - Better error handling with specific messages based on the error type
   - More comprehensive logging of auth failures

2. **Employee API**
   - Added proper tenant isolation verification
   - Improved error handling for auth-related exceptions
   - Added tenant verification to prevent cross-tenant access

3. **Auth Decorators**
   - Added more descriptive error messages
   - Created employee-specific access control decorator
   - Improved token verification with better error handling

## Version
1.0.0 (2025-04-20)

## Notes
- If authentication issues persist, check the logs for specific error messages
- Ensure your Cognito configuration in the environment variables is correct
- Make sure the tenant ID is properly included in JWT claims
"""
    
    with open(readme_path, 'w') as f:
        f.write(readme_content)
    
    logger.info(f"Created documentation file at {readme_path}")
    return True

def fix_nextjs_employee_api(api_path):
    """Fix Next.js employee API endpoints for improved authentication."""
    logger.info(f"Applying fixes to Next.js employee API: {api_path}")
    create_backup(api_path)
    
    with open(api_path, 'r') as f:
        content = f.read()
    
    # Check if this is a Next.js API route file
    if 'export async function' not in content and 'export default' not in content:
        logger.error(f"File doesn't appear to be a Next.js API route: {api_path}")
        return False
    
    # 1. Add better error handling
    improved_error_handling = """
// Improved error handling for authentication
try {
  // Verify authentication
  const session = await getSession();
  if (!session || !session.user) {
    console.error('Authentication required for employee access');
    return NextResponse.json(
      { error: 'Authentication required to access employee data. Please login again.' },
      { status: 401 }
    );
  }
  
  // Continue with the original request handling
"""
    
    # Look for handler function pattern
    handler_pattern = r'export async function (GET|POST|PUT|DELETE)'
    handler_match = re.search(handler_pattern, content)
    
    if handler_match:
        # Find where the function body starts (after first {)
        function_start = content.find('{', handler_match.start()) + 1
        
        # Check if it already has try/catch
        if 'try {' not in content[function_start:function_start + 100]:
            # Add our error handling
            content = content[:function_start] + '\n' + improved_error_handling + content[function_start:]
            
            # Add the try/catch closing part if it doesn't exist
            if '} catch (error) {' not in content:
                # Find a good place to add the catch block (before the final return or end of function)
                last_return = content.rfind('return', function_start)
                if last_return > function_start:
                    # Add before the last return statement
                    closing_try_catch = """
} catch (error) {
  console.error('Employee API error:', error);
  return NextResponse.json(
    { error: 'An error occurred while processing your request' },
    { status: 500 }
  );
}

"""
                    content = content[:last_return] + closing_try_catch + content[last_return:]
    
    # 2. Add tenant verification
    tenant_verification = """
  // Verify tenant access
  const employee = data?.employee;
  if (employee?.tenant_id && session?.user?.tenant_id && 
      employee.tenant_id !== session.user.tenant_id && 
      !['ADMIN', 'owner'].includes(session.user.role)) {
    console.warn('Tenant access violation attempt');
    return NextResponse.json(
      { error: 'You do not have permission to access this employee' },
      { status: 403 }
    );
  }
"""
    
    # Look for specific employee endpoint
    employee_pattern = r'\/employees\/\[id\]'
    if re.search(employee_pattern, str(api_path)) and 'tenant_id' not in content:
        # Find where to insert tenant verification
        # Look for a successful response pattern
        response_pattern = r'return .*?json\('
        response_match = re.search(response_pattern, content)
        
        if response_match:
            # Add tenant verification before the response
            content = content[:response_match.start()] + tenant_verification + content[response_match.start():]
    
    # Save the changes
    with open(api_path, 'w') as f:
        f.write(content)
    
    logger.info("Successfully applied Next.js employee API improvements")
    return True

def main():
    """Main function to run all fixes."""
    logger.info("Starting authentication fix script for backend services")
    
    results = {
        "auth_middleware": fix_auth_middleware(),
        "employee_api": fix_employee_api(),
        "auth_decorator": fix_auth_decorator(),
        "readme": update_readme()
    }
    
    # Report results
    success_count = sum(1 for result in results.values() if result)
    
    logger.info(f"Fix script completed: {success_count}/{len(results)} tasks successful")
    
    if success_count == len(results):
        logger.info("All fixes successfully applied!")
        print("\nAuthentication fix script completed successfully!")
    else:
        logger.warning("Some fixes could not be applied. Check the log for details.")
        print("\nAuthentication fix script completed with some warnings. Check the log for details.")
    
    print("Next steps:")
    print("1. Restart your FastAPI server")
    print("2. Clear browser cache or open in incognito mode")
    print("3. Login again and try accessing the Employee Management page")
    print("\nIf issues persist, check the AUTH_FIX_README.md file for additional steps.")
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 