# Personal Information Tab

## Overview
The Personal Information Tab displays the current user's personal information retrieved from AWS Cognito and the backend API.

## Recent Changes
- **Version 1.0 (2025-04-26)**: Replaced mock data with real user information from the API

## Data Flow
1. Component loads and calls `getUserProfile()` from userService
2. User profile data is retrieved from the API endpoint at `/api/user/profile`
3. The API endpoint fetches data from AWS Cognito user attributes
4. Data is mapped to the form fields and displayed

## Attributes Available
The following user attributes are supported:
- Basic information (name, email, phone)
- Address information (address, city, state, zip, country)
- Personal details (date of birth, gender, marital status)
- Payment information (bank details, wallet ID)
- Emergency contact information

## Security Considerations
- Bank account information is partially masked (only last 4 digits are shown)
- All data is fetched directly from AWS Cognito, not stored in cookies or local storage
- API requests include authorization tokens for secure access

## Related Files
- `/src/services/userService.js`: Contains the `getUserProfile()` function
- `/src/app/api/user/profile/route.js`: API route handler for user profile data
- `/src/utils/cognito.js`: Utility for accessing Cognito user attributes
