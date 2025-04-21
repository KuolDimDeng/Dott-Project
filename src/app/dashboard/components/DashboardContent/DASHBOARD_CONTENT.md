# Dashboard Content Component

## Overview
The Dashboard Content component is responsible for rendering the main content of the dashboard after a user has successfully authenticated. It serves as the primary interface for users to interact with the application's features.

## Changes Made on 2025-04-19
- Removed Material UI (MUI) dependencies and components to address chunk loading errors
- Replaced MUI components with Tailwind CSS-based components
- Simplified the component structure for better reliability
- Improved error handling during authentication and data fetching
- Added loading state indicators with proper Tailwind styling
- Implemented responsive sidebar toggle functionality
- Created a self-contained component that doesn't rely on external UI libraries

## Component Structure
- **Dashboard**: The main wrapper component that provides UserMessage context
- **DashboardContent**: The core component with the following features:
  - State management for UI display modes
  - Authentication status handling
  - User data fetching from API
  - Sidebar navigation
  - Main content rendering based on selected view

## Key Functions
- `handleDrawerToggle`: Controls the visibility of the sidebar
- `handleLogout`: Manages user logout and redirection
- `fetchUserData`: Retrieves user profile data from the API
- `renderMainContent`: Renders different views based on user selection

## Authentication Flow
The component uses App Cache (not localStorage or cookies) for storing authentication tokens and user session data. This approach provides better security and compliance with requirements.

## Error Handling
- Proper error handling for API requests
- Graceful redirection to login page on authentication failures
- Loading states to improve user experience during data fetching

## Styling
Now uses Tailwind CSS exclusively for styling, which provides:
- Better performance compared to CSS-in-JS solutions
- Smaller bundle size
- Consistent styling patterns
- No additional library dependencies 