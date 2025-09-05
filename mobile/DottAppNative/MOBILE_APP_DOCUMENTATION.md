# Dott Mobile App (React Native) - Complete Documentation

## Overview
DottAppNative is the official React Native mobile application for the Dott platform. It provides both consumer and business user experiences, including marketplace functionality, business management tools, and authentication.

## Technical Stack
- **Framework**: React Native 0.81.1
- **React Version**: 19.1.0
- **Navigation**: React Navigation 6.x (Stack + Bottom Tabs)
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Authentication**: Auth0 with custom OAuth implementation
- **Storage**: AsyncStorage
- **Icons**: React Native Vector Icons
- **Geolocation**: @react-native-community/geolocation

## Project Structure
```
src/
├── assets/           # Images, icons, and static resources
├── config/           # Configuration files (Auth0, API endpoints)
├── context/          # React Context providers (Auth, Cart)
├── data/             # Static data and constants
├── navigation/       # Navigation components and routing
├── screens/          # Screen components organized by feature
│   ├── auth/         # Authentication screens
│   ├── business/     # Business management screens
│   └── consumer/     # Consumer-facing screens
└── services/         # API services and HTTP clients
```

## Key Features

### 1. Dual User Modes
- **Consumer Mode**: Marketplace browsing, business discovery, cart functionality
- **Business Mode**: Expense tracking, business management tools

### 2. Authentication System
- Auth0 integration with Authorization Code flow + PKCE
- Custom session management with backend
- Automatic token refresh and session persistence

### 3. Marketplace Functionality
- Location-based business discovery
- City-specific filtering (currently set to Juba, South Sudan)
- Category-based business browsing
- Shopping cart with persistent storage
- Real-time business data from backend API

### 4. Navigation Architecture
- Tab-based navigation for main features
- Stack navigation for detailed flows
- Context-aware navigation based on user mode

## Environment Configuration

### Current Setup (Staging)
The app is configured to use the staging environment for development and testing:

```javascript
// API Configuration
const API_BASE_URL = 'https://staging.dottapps.com/api';

// Auth0 Configuration
const AUTH0_CONFIG = {
  domain: 'dev-cbyy63jovi6zrcos.us.auth0.com',
  clientId: 'vltTnrxcC2ZMjlFel04Xeo7PlufLMEiG',
  audience: 'https://staging.dottapps.com',
};
```

### Files Updated for Staging Consistency
- `/src/services/marketplaceApi.js` → `staging.dottapps.com/api`
- `/src/services/api.js` → `staging.dottapps.com/api`  
- `/src/context/AuthContext.js` → `staging.dottapps.com` (2 locations)
- `/src/config/auth0.js` → `staging.dottapps.com` (2 locations)
- `/src/screens/business/ExpensesScreen.js` → `staging.dottapps.com/api`

### API Endpoints
All API calls are routed through the staging environment:
- **Base URL**: `https://staging.dottapps.com/api`
- **Marketplace**: `/api/marketplace/consumer/search/`
- **Authentication**: `/api/sessions/`
- **Business APIs**: Various endpoints for business functionality

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- React Native CLI
- Xcode (for iOS development)
- Android Studio (for Android development)
- CocoaPods (for iOS dependencies)

### Installation Steps
1. Clone the repository
2. Navigate to the mobile app directory:
   ```bash
   cd mobile/DottAppNative
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Install iOS dependencies:
   ```bash
   cd ios && pod install && cd ..
   ```
5. Run the app:
   ```bash
   # iOS
   npx react-native run-ios
   
   # Android
   npx react-native run-android
   ```

## Key Components

### Context Providers
- **AuthContext**: Manages user authentication, session handling, and user mode
- **CartContext**: Handles shopping cart state and persistent storage

### Services
- **marketplaceApi.js**: Marketplace-specific API calls
- **api.js**: General-purpose API client with session management

### Navigation Structure
- **MainNavigator**: Tab navigation with conditional rendering based on user mode
- **AuthNavigator**: Stack navigation for authentication flows

## Authentication Flow
1. User initiates login through Auth0
2. Auth0 returns access token
3. App exchanges token for backend session
4. Session stored in AsyncStorage
5. All API requests use session-based authentication

## Marketplace Implementation

### Business Discovery
- Location-based filtering (currently: Juba, South Sudan)
- Category-based browsing
- Search functionality
- Real-time data from PlaceholderBusiness model

### Cart Functionality
- Persistent cart storage across app sessions
- Business-specific item organization
- Quantity management
- Cross-business cart support

### Backend Integration
The mobile app integrates with the marketplace backend through:
- **ConsumerSearchViewSet** with new @action methods:
  - `marketplace_businesses` - Get businesses filtered by city
  - `marketplace_categories` - Get categories for user's city
  - `featured_businesses` - Get featured businesses

## Development Workflow

### Environment Consistency
The entire app is configured to use staging environment for consistency:
- All API calls → `staging.dottapps.com`
- Backend deployment → staging branch first
- Testing → staging environment
- Production deployment → main branch after staging verification

### Testing Location
For development and testing, the app is configured with:
- **Test Location**: Juba, South Sudan
- **Purpose**: Testing marketplace functionality with real business data
- **Note**: Location can be changed in MarketplaceScreen.js

## API Integration

### Session Management
```javascript
// Request interceptor adds session authentication
config.headers.Authorization = `Session ${sessionId}`;
```

### Error Handling
- 401 errors trigger session cleanup and redirect to login
- Network errors handled gracefully with user feedback
- Comprehensive logging for debugging

## Build Configuration

### Scripts Available
```json
{
  "android": "react-native run-android",
  "ios": "react-native run-ios", 
  "start": "react-native start",
  "setup:ios": "./setup-ios.sh"
}
```

### Dependencies Overview
```json
{
  "@react-native-async-storage/async-storage": "^1.18.2",
  "@react-native-community/geolocation": "^3.4.0",
  "@react-navigation/bottom-tabs": "^6.5.11",
  "@react-navigation/native": "^6.1.9",
  "@react-navigation/stack": "^6.3.20",
  "axios": "^1.6.2",
  "react": "19.1.0",
  "react-native": "0.81.1",
  "react-native-auth0": "^4.6.0",
  "react-native-vector-icons": "^10.0.0"
}
```

### iOS Configuration
- Custom setup script for iOS dependencies
- CocoaPods integration for native dependencies
- Proper signing and provisioning setup required

## Current Implementation Status

### ✅ Completed Features
- Authentication system fully implemented
- Marketplace functionality integrated with backend
- Cart system with persistent storage
- Location-based business filtering
- Consistent staging environment configuration
- Session management with backend API
- Bell and cart icons in marketplace header
- City-based business filtering (Juba, South Sudan)
- Search bar with placeholder text
- Category-based business browsing

### 📋 Next Steps
1. Test marketplace functionality with staging data
2. Implement order placement workflow
3. Add push notifications
4. Enhance business management features
5. Production deployment preparation

## Key Architectural Decisions

### 1. Environment Consistency
**Problem**: Mobile app was hitting production API while backend changes were on staging
**Solution**: Updated all 6 files to consistently use `staging.dottapps.com` for development

### 2. Authentication Architecture
**Choice**: Auth0 with custom backend session management
**Benefits**: Industry-standard OAuth flow with custom session control

### 3. State Management
**Choice**: React Context API instead of Redux
**Rationale**: Simpler setup for the app's current complexity

### 4. Navigation Pattern
**Choice**: Tab navigation with conditional rendering
**Benefits**: Different experiences for consumer vs business users

## Important Notes
- App currently configured for staging environment testing
- Location set to Juba, South Sudan for marketplace testing
- All backend changes must be deployed to staging first
- Session-based authentication with 24-hour expiration
- CORS configuration requires proper origin headers

## Troubleshooting

### Common Issues
1. **API 401 Errors**: Check session validity and authentication headers
2. **404 Errors**: Ensure backend endpoints are deployed to correct environment
3. **Build Failures**: Run `pod install` for iOS native dependencies
4. **Location Services**: Enable location permissions for marketplace features

### Development Commands
```bash
# Clean build
npx react-native start --reset-cache

# iOS specific
cd ios && pod install && cd ..
npx react-native run-ios

# Android specific
npx react-native run-android
```

## Security Considerations
- Session tokens stored securely in AsyncStorage
- Auth0 handles OAuth flow with PKCE
- API requests use session-based authentication
- Proper error handling for auth failures

## Performance Optimizations
- AsyncStorage for persistent data
- Context API for efficient state management
- Lazy loading for navigation screens
- Optimized image loading for business listings

---

*Last Updated: September 5, 2025*
*Status: Active Development - Staging Environment*