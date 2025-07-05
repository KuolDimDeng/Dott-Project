# Menu Access Privileges Documentation

## Overview

The Menu Access Privileges feature allows business owners to control which menu items their employees can access in the application. This feature enhances security and helps streamline the user experience by showing employees only the parts of the application they need for their specific roles.

## Key Features

- **Role-Based Access**: Business owners can set specific menu access privileges for each employee
- **Owner Override**: Business owners always have unrestricted access to all menu items
- **Persistent Settings**: Access privileges are stored in the database and cached for quick access
- **Real-Time Updates**: Changes to privileges are applied immediately without requiring a page refresh

## How It Works

### User Roles and Access Levels

1. **Business Owners**:
   - Have unrestricted access to all menu items
   - Can configure menu access privileges for employees
   - Identified by having `custom:userrole` attribute set to `'owner'` in Cognito

2. **Regular Employees**:
   - Can only access menu items that have been explicitly granted to them
   - Access privileges are loaded when they log in
   - Identified by having `custom:userrole` attribute set to `'employee'` in Cognito

### Technical Implementation

The implementation consists of:

1. **Backend Model**: 
   - `UserMenuPrivilege` model in Django that links to the `BusinessMember` model
   - Stores a JSON list of menu item IDs that a user can access

2. **Backend API**:
   - `UserMenuPrivilegeViewSet` provides REST endpoints for managing privileges
   - `/users/api/menu-privileges/current_user/` - Get privileges for the current user
   - `/users/api/menu-privileges/set_privileges/` - Set privileges for a specific user

3. **Frontend Management**:
   - `UserMenuPrivileges` component in Settings Management for administrators to configure privileges
   - Uses the existing employee list and menu structure from `listItems.js`

4. **Access Control**:
   - `hasMenuAccess` function in `listItems.js` checks if a user has access to a specific menu item
   - Business owners automatically pass all access checks
   - For employees, access is granted only if the menu item ID is in their privileges list

5. **Caching**:
   - Privileges are cached in the App Cache using user-specific keys
   - Prevents unnecessary API calls for better performance

## Setting Up Menu Privileges (For Business Owners)

1. Navigate to **Settings > User Management**
2. In the "Menu Access Privileges" section, select an employee from the dropdown
3. Check the boxes for menu items you want to grant access to
4. Click "Save Privileges" to apply the changes

## Data Flow

1. When a user logs in, the system:
   - Checks if they are a business owner (unrestricted access)
   - If they're an employee, loads their specific privileges from the API
   - Caches the results for future use

2. When rendering the menu, each item is checked against:
   - The user's role (owner = show all)
   - The user's specific privileges (employee = show only allowed items)

3. When privileges are updated:
   - Changes are saved to the database
   - The cache is updated
   - If the user is currently logged in, a custom event updates the UI immediately

## Implementation Details

### Database Schema

The `UserMenuPrivilege` model has:
- `business_member` - One-to-one relation to BusinessMember
- `menu_items` - JSONField storing array of menu item IDs
- `created_at`, `updated_at` - Timestamp fields
- `created_by` - Reference to the User who created/modified the privileges

### App Cache Structure

```javascript
// For regular employees
window.__APP_CACHE['currentUserMenuPrivileges'] = ['dashboard', 'sales', ...];

// For owners
window.__APP_CACHE['isBusinessOwner'] = true;
```

### Events

- `userMenuPrivilegesLoaded` - Dispatched when user privileges are loaded or updated

## Security Considerations

- Access privileges are enforced both on the frontend and backend
- Backend API includes role checks to prevent unauthorized privilege modifications
- Default behavior is to deny access if privileges are not explicitly granted
- Only business owners can modify privileges

## Troubleshooting

- If a menu item unexpectedly disappears, check the user's role and privileges
- For business owners experiencing missing menu items, verify their Cognito attributes
- If privileges are not being applied, check the browser console for errors

## API Reference

- `GET /users/api/menu-privileges/current_user/` - Get current user's privileges 
- `POST /users/api/menu-privileges/set_privileges/` - Set privileges for a user (owner only)
- `GET /users/api/menu-privileges/?user_id=<uuid>` - Get privileges for specific user 