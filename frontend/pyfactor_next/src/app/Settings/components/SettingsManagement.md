# Settings Management Component

## Recent Changes

### 2024-05-02: Modified User Management to Display Cognito Users

**Change Description:**
Modified the Users List tab to fetch and display all Cognito users with the same tenant ID as the logged-in owner, including the owner themselves.

**Key Changes:**
- Changed data source from employee API to Cognito user pool
- Implemented filtering to display only users with matching tenant ID
- Updated user status toggle functionality to use Cognito Admin commands
- Ensured owners can see all users belonging to their tenant
- Enhanced user detail display to show Cognito attributes
- Maintained same UI layout and tab structure

**Implementation Details:**
- Script created: Version0003_FetchCognitoUsers_SettingsManagement.mjs
- Backup created before changes
- Leveraged AWS SDK for JavaScript V3 for Cognito operations
- Added proper error handling and loading states
- Updated affected functions to work with Cognito user format

**Files Modified:**
- /src/app/Settings/components/SettingsManagement.js

### 2024-05-02: Added Icons to Tab Titles

**Change Description:**
Added appropriate icons to all tab titles in the Settings Management component for improved visual hierarchy and user experience.

**Key Changes:**
- Added Heroicons from '@heroicons/react/24/outline' library for a consistent look
- Added icons to main tabs (User Management, Company Profile)
- Added icons to User Management sub-tabs (Users List, User Details, Access Logs)
- Added icons to User Details sub-tabs (Profile Information, Page Access, Management Permissions)
- Improved visual cues to help users navigate the interface

**Implementation Details:**
- Script created: Version0002_AddIconsToTabs_SettingsManagement.mjs
- Backup created before changes
- Used consistent icon sizing and spacing for visual harmony
- Maintained full accessibility

**Files Modified:**
- /src/app/Settings/components/SettingsManagement.js

### 2024-05-02: Redesigned Layout with Tab-Based Structure

**Change Description:**
Completely redesigned the Settings Management page to use a tab-based layout similar to Employee Management.

**Key Changes:**
- Changed from sidebar navigation to top-level tabs for main sections
- Implemented hierarchical tabs with main tabs (User Management, Company Profile) and sub-tabs
- Added comprehensive User Management system with three main sub-tabs:
  - Users List - Overview of all users with search/filtering capabilities
  - User Details - With sub-tabs for Profile Information, Page Access, and Management Permissions
  - Access Logs - Audit history of permission changes
- Improved the user interface and user experience for consistency
- Integrated proper use of CognitoAttributes utility for attribute access

**Implementation Details:**
- Script created: Version0001_RedesignSettingsLayout_SettingsManagement.mjs
- Backup created before changes
- Complete rewrite of component layout while maintaining core functionality
- Created proper tab navigation with nested tab structure
- Enhanced user management functionality in line with requirements

**Files Modified:**
- /src/app/Settings/components/SettingsManagement.js

### 2024-05-02: Removed Specific Menu Options

**Change Description:**
Modified the Settings Management navigation to remove the following menu options:
- Payment
- Security and Compliance
- Payroll Configuration
- Integration Settings
- Regional Settings

**Retained Options:**
- User Management
- Company Profile

**Implementation Details:**
- Script created: Version0001_RemoveSettingsOptions_SettingsManagement.mjs
- Script ID: F0017
- Backup created before changes
- Only navigation items removed, no other functionality changes
- The `navigationItems` array was modified to include only User Management and Company Profile
- The `renderActiveSection` function was updated to handle only the retained options

**Files Modified:**
- /src/app/Settings/components/SettingsManagement.js

## Component Overview

The Settings Management component provides a central location for managing various system settings. It is organized with a tab-based interface for main sections and sub-tabs for detailed functionality.

### Features

1. **User Management**
   - **Users List**: Overview of all users with search and filter functionality
     - View and manage existing users
     - Add new users to the system
     - Toggle user status (active/suspended)
   - **User Details**: View and edit specific user information
     - Profile Information: Basic user details and account status
     - Page Access: Control which pages each user can access
     - Management Permissions: Set user management delegation capabilities
   - **Access Logs**: Track audit history of permission changes

2. **Company Profile**
   - Manage business information
   - Configure company details and preferences

### Usage

The component is accessed via the Settings option in the main navigation. It automatically loads with User Management selected as the default tab.

### Dependencies

- React hooks for state management
- Authentication context for user permission checks
- Employee API for user management operations
- CognitoAttributes utility for attribute access

### Technical Notes

- The component uses a multi-level tab-based interface for better organization
- Navigation state is maintained with React useState hooks
- Owner-only features are conditionally rendered based on user role
- AWS Cognito is used for user authentication and storing custom attributes
- Page-level access control is implemented through custom attributes

## Implementation Details

### Architecture
The component uses a tab-based navigation with a sidebar for section selection and a main content area that displays the active section. This provides a clean, organized interface that can be easily extended with additional settings sections.

### State Management
- `activeSection`: Tracks the currently selected settings section
- User Management states: 
  - `employees`: List of employees that can be invited
  - `loading`: Loading state for API calls
  - `error`: Error state for API calls
  - `showAddUserForm`: Controls visibility of add user form
  - `newUser`: State for the new user form data

### API Integration
- Uses `employeeApi.getAll()` to fetch employees
- Uses `api.post('/api/hr/employees/invite')` to send invitations to users

### Security
- Implements role-based access control via the `isOwner()` function
- Only users with owner privileges can manage users

### Responsiveness
- Responsive design that adapts to different screen sizes
- Mobile-friendly layout that stacks the sidebar above content on small screens

## Usage
The Settings Management component is typically accessed from the user menu in the dashboard. It provides a centralized location for all application settings, making it easy for administrators to configure the system.

## Future Enhancements
1. Implement the placeholder sections with real functionality
2. Add more granular permission controls
3. Create audit logs for settings changes
4. Add search functionality for large settings sections
5. Implement settings export/import capabilities

## Technical Requirements
- Uses Tailwind CSS for styling
- Implements AWS Cognito for authentication
- Avoids using cookies or local storage
- Designed to scale for applications with large user bases
- Uses AWS RDS Database with RLS Policy
- Maintains strict tenant isolation 