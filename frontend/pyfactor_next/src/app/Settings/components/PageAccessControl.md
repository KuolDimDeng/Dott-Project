# Page Access Control

## Overview
This feature enhances the user management section to allow owners to control user access at the page level. Previously, access was controlled at the menu item level. Now, owners can define which specific pages each employee can access.

## Components

### 1. User Page Privileges UI
The `UserPagePrivileges` component provides a UI for business owners to:
- Select an employee from a dropdown
- Grant/revoke access to specific pages organized by category
- Allow selected employees to manage other users

### 2. Backend Model
The `UserPagePrivilege` model stores:
- The pages a user can access
- Whether the user can manage other users
- Relationships to the business member and the creator

### 3. Page Access Control
The `pageAccess.js` utility provides functions to:
- Check if a user has access to a specific page
- Check if a user can manage other users
- Fetch and cache the user's page privileges

## Features
- **Owner Control**: Business owners can select which pages each employee can access
- **Category Organization**: Pages are organized by category (Billing, Sales, etc.)
- **User Management Permission**: Owners can delegate user management to trusted employees
- **Access Denied Message**: Users attempting to access restricted pages see a helpful message

## Usage
1. Navigate to Settings > User Management
2. Click on the "Page Access" tab
3. Select an employee from the dropdown
4. Check/uncheck the pages they should have access to
5. Toggle "Allow this user to manage other users" if needed
6. Click "Save Page Access"

## Technical Details
- Uses Cognito Attributes and App Cache for storing permissions
- Implements row-level security at the database level
- Pages are protected using the withPageAccess HOC

## Page Categories and Access Management
The system organizes pages into logical categories for easy management:

### Dashboard
- Dashboard Overview

### Billing
- Invoices
- Estimates
- Payments
- Subscriptions

### Sales
- Orders
- Customers
- Quotes
- Promotions

### Inventory
- Products
- Categories
- Stock Management

### CRM
- Contacts
- Leads
- Deals
- Activities

### HR
- Employees
- Attendance
- Payroll

### Reports
- Sales Reports
- Financial Reports
- Inventory Reports

### Settings
- Business Settings
- User Management

## Access Restriction
When a user attempts to access a page for which they don't have permission, they will see a message:

"You are not authorized to view this page. Contact the business owner or responsible admin for assistance."

## Implementation Details

### Frontend Components
- `UserPagePrivileges.js` - Component for managing user page access privileges
- `pageAccess.js` - Utility functions for checking page access
- `withPageAccess.js` - HOC that protects pages based on user privileges
- `AccessRestricted.js` - Component shown when user lacks access

### Backend Components
- `UserPagePrivilege` model - Stores page access data
- `UserPagePrivilegeSerializer` - Serializes model data for API
- `UserPagePrivilegeViewSet` - API endpoints for page privileges

### Cache Usage
The system uses App Cache to store the user's page privileges for fast access checking without continuous API calls. This data is refreshed when:
- The user logs in
- The privileges are modified
- The cache expires (5 minutes)

### Security Considerations
- Business owners have access to all pages by default
- New employees have access only to the dashboard initially
- Page access changes take effect immediately
- Using App Cache ensures permissions are enforced consistently 