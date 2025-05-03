# Settings Menu Structure Changes

## Overview
This document describes the changes made to the settings menu structure in the user menu of the DashAppBar component.

## Changes Implemented
1. **Simplified Settings Menu**
   - Removed all menu options except for Company Profile and User Management
   - Organized User Management with tabs for better user experience

2. **User Management Structure**
   - Added three main tabs: Users List, User Details, and Access Logs
   - Implemented UI for each section according to requirements

3. **Cognito Integration**
   - Added support for the following Cognito custom attributes:
     - `custom:userrole` (string: "Owner", "User")
     - `custom:accessiblePages` (string: comma-separated list of page IDs)
     - `custom:canManageUsers` (boolean: "true"/"false")
     - `custom:managablePages` (string: comma-separated list of page IDs)

## Implementation Details
- **Users List**: Displays a table of all users with actions to edit or suspend
- **User Details**: Provides sub-tabs for Profile Information, Page Access, and Management Permissions
- **Access Logs**: Shows an audit trail of permission changes

## Future Improvements
- Implement functionality to edit user permissions
- Add detailed user filtering functionality
- Implement access logs backend integration

## Related Scripts
- Version0001_update_settings_menu_structure.js

## Date of Implementation
2025-05-01
