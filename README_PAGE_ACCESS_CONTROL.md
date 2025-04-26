# Page-Level Access Control Implementation

## Overview

This implementation enhances the user management system by adding page-level access control. Previously, access was controlled at the menu items level. Now, the business owner can control user access at the individual page level and also grant specific employees the ability to manage other users.

## Files Modified/Created

### Backend Files

1. `/Users/kuoldeng/projectx/backend/pyfactor/scripts/Version0001_enhance_page_privileges_with_employees.py` - Script to enhance the UserPagePrivilege model to work with hr_employee table
2. `/Users/kuoldeng/projectx/backend/pyfactor/users/models.py` - Updated to add employee field to UserPagePrivilege model
3. `/Users/kuoldeng/projectx/backend/pyfactor/users/serializers.py` - Updated to include employee data in UserPagePrivilegeSerializer
4. `/Users/kuoldeng/projectx/backend/pyfactor/users/views.py` - Added methods for employee selection and invitation
5. `/Users/kuoldeng/projectx/backend/pyfactor/users/urls.py` - Updated to include new endpoints

### Frontend Files

1. `/Users/kuoldeng/projectx/frontend/pyfactor_next/scripts/Version0001_enhance_user_page_privileges.js` - Script to update frontend components
2. `/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/Settings/components/UserPagePrivileges.js` - Updated to use radio buttons and work with hr_employee table
3. `/Users/kuoldeng/projectx/frontend/pyfactor_next/src/utils/pageAccess.js` - Updated utility for page access checks
4. `/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/AccessRestricted.js` - Updated access denied message
5. `/Users/kuoldeng/projectx/frontend/pyfactor_next/src/utils/cognitoUtils.js` - New utility for Cognito email verification

## Features Implemented

1. **Employee Selection from HR Table**
   - Select existing employees from the hr_employee table
   - Option to invite employees who don't have user accounts yet
   - Option to invite new users who aren't employees yet

2. **Page Access Control with Radio Buttons**
   - Pages are organized by categories (Billing, Sales, etc.)
   - For each category, select which page the employee should have access to using radio buttons
   - Only one page per category can be selected (radio button behavior)

3. **User Registration with Cognito**
   - Send invitation emails to employees using Cognito
   - Allow employees to verify email and set password
   - Secure token-based verification process

4. **Access Restriction**
   - Updated access denied message
   - Integration with existing withPageAccess HOC
   - Support for checking user management permissions

## How to Use

### Setting Up Page Access

1. Navigate to Settings > User Management
2. Select an employee from the dropdown
3. For each category, select which page the employee should have access to using the radio buttons
4. Optionally allow them to manage other users
5. Click "Save Page Access" to save the changes

### Inviting Employees

1. Navigate to Settings > User Management
2. Select an employee who doesn't have a user account yet
3. Click "Send Invitation to Selected Employee"
4. The employee will receive an email with instructions to verify their email and set a password

### Inviting New Users

1. Navigate to Settings > User Management
2. Click "Invite New User"
3. Enter the email address, first name, and last name of the person you want to invite
4. Click "Send Invitation"
5. The person will receive an email with instructions to verify their email and set a password

### For Developers

- Use the `withPageAccess` HOC to protect pages
- Check user permissions with `hasPageAccess()` from pageAccess utility
- Check if user can manage others with `canManageUsers()`

## Technical Implementation Details

- Uses Cognito Attributes and AWS App Cache for in-memory data
- Follows row-level security policy on the backend
- Maintains existing tenant isolation
- Does not use cookies or local storage
- All changes are properly documented
- Created backup of modified files
- Uses version control in script naming

## Execution

1. Run the backend script to enhance the model and API:
   ```
   cd /Users/kuoldeng/projectx/backend/pyfactor
   python scripts/Version0001_enhance_page_privileges_with_employees.py
   ```

2. Restart the backend server:
   ```
   python run_server.py
   ```

3. Run the frontend script to update the components:
   ```
   cd /Users/kuoldeng/projectx/frontend/pyfactor_next
   node scripts/Version0001_enhance_user_page_privileges.js
   ```

4. Restart the frontend server:
   ```
   pnpm run dev
   ```

## Verification

To verify the implementation:
1. Log in as a business owner
2. Navigate to Settings > User Management
3. Set up access for an employee
4. Send an invitation to the employee
5. Have the employee verify their email and set a password
6. Log in as that employee
7. Verify they can only access the pages you granted
8. Try accessing a restricted page and verify the access denied message