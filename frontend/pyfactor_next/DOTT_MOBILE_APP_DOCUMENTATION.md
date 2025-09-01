# Dott Mobile App - Complete Technical Documentation
*Generated: September 1, 2025*
*Version: 2.0*

## Table of Contents
1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [Design System](#design-system)
5. [Feature Implementation](#feature-implementation)
6. [File Structure](#file-structure)
7. [Development Workflow](#development-workflow)
8. [Deployment Process](#deployment-process)
9. [Configuration Files](#configuration-files)
10. [Troubleshooting](#troubleshooting)

---

## Overview

**Dott** is a dual-mode business and consumer mobile application built with web technologies and packaged as a native iOS app using Capacitor. The app provides comprehensive business management tools and a marketplace for consumer discovery.

### Key Characteristics
- **Hybrid Web/Native**: HTML, CSS, JavaScript with native iOS integration
- **Dual-Mode System**: Business management + Consumer marketplace
- **Single Codebase**: Shared components with mode-specific features
- **Real-time Features**: Location tracking, notifications, smooth transitions

---

## Technology Stack

### Core Framework
```yaml
Platform: Capacitor 6.1.2
Base Technology: HTML5, CSS3, ES6+ JavaScript
Build System: Next.js 15 with TypeScript (web version)
Mobile Runtime: iOS WebView with native bridge
```

### Mobile-Specific Technologies
```yaml
iOS Framework: Capacitor iOS
Minimum iOS Version: 14.0
App Identifier: com.dottapps.mobile
Display Name: "Dott"
```

### Native Integrations
```yaml
Geolocation: Native iOS location services
Storage: Capacitor SecureStoragePlugin
Camera: Capacitor Camera plugin
Contacts: Capacitor Community Contacts
HTTP: Capacitor Community HTTP
Payments: Stripe Terminal SDK for Tap to Pay
Notifications: Capacitor Push Notifications
```

### Third-Party Services
```yaml
Authentication: Auth0 custom domain (auth.dottapps.com)
API Backend: Django REST (staging.dottapps.com)
Payment Processing: Stripe Connect
Location Services: OpenStreetMap Nominatim API
Customer Support: Crisp Chat
Analytics: Sentry
```

---

## Architecture

### App Structure
```
Dott Mobile App
├── Business Mode (Navy Blue #0d4f8a)
│   ├── Point of Sale
│   ├── Inventory Management
│   ├── Customer Management
│   ├── Payroll & HR
│   ├── Advertise & Marketing
│   └── Analytics & Reports
└── Consumer Mode (Dark Green #064e3b)
    ├── Marketplace Discovery
    ├── Business Search
    ├── Location Services
    ├── Shopping Cart
    └── Order Management
```

### Navigation Flow
```
Index (mobile-auth.html)
├── Authentication Flow
├── Business Main Menu (mobile-business-menu.html)
│   ├── POS System (mobile-pos.html)
│   ├── Inventory (inventory.html)
│   ├── Customers (mobile-customers.html)
│   ├── Jobs (jobs.html)
│   ├── Advertise (mobile-advertise.html)
│   └── Settings (mobile-settings.html)
└── Consumer Main Menu (mobile-consumer-menu.html)
    ├── Business Discovery
    ├── Featured Ads
    ├── Categories
    └── Profile (mobile-profile-consumer.html)
```

### State Management
```javascript
// App-wide state stored in localStorage and SecureStorage
AppState = {
  userData: {}, // User profile and preferences
  sessionToken: "", // Authentication token
  tenantId: "", // Business tenant identifier
  marketplaceMode: "business|consumer", // Current mode
  location: {}, // User location data
  businessFeatures: {} // Available features by business type
}
```

---

## Design System

### Color Palette

#### Business Mode (Navy Blue Theme)
```css
Primary Navy: #0d4f8a
Light Navy: #2a5298
Background: #f5f7fa
Text Primary: #2c3e50
Text Secondary: #6b7280
Success: #10b981
Warning: #f59e0b
Error: #ef4444
```

#### Consumer Mode (Dark Green Theme)
```css
Primary Green: #064e3b
Light Green: #10b981
Background: #f8f9fa
Text Primary: #1a1a1a
Text Secondary: #6b7280
Accent: #059669
```

### Typography
```css
Font Family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif
Font Smoothing: -webkit-font-smoothing: antialiased

Headers: 24px-32px, font-weight: 700
Subheaders: 16px-20px, font-weight: 600
Body Text: 14px-16px, font-weight: 400
Captions: 12px-13px, font-weight: 300
```

### Layout System
```css
/* Safe Area Support */
padding-top: calc(16px + env(safe-area-inset-top));
padding-bottom: calc(16px + env(safe-area-inset-bottom));

/* Grid System */
.menu-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  padding: 16px;
}

/* Responsive Breakpoints */
Mobile: < 768px
Tablet: 768px - 1024px
Desktop: > 1024px
```

### Component Patterns

#### Header Component
```css
.header {
  background: var(--primary-color);
  padding: 16px 20px;
  padding-top: calc(16px + env(safe-area-inset-top));
  color: white;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}
```

#### Menu Item Component
```css
.menu-item {
  background: white;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: all 0.3s ease;
}
```

#### Button System
```css
/* Primary Button */
.btn-primary {
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 600;
}

/* Secondary Button */
.btn-secondary {
  background: white;
  color: var(--primary-color);
  border: 2px solid var(--primary-color);
  border-radius: 8px;
  padding: 10px 22px;
}
```

---

## Feature Implementation

### 1. Dual Mode System
```javascript
// Mode switching with smooth transitions
function switchToBusinessMode() {
  const overlay = document.getElementById('transitionOverlay');
  overlay.classList.add('active');
  
  localStorage.setItem('marketplaceMode', 'business');
  setTimeout(() => {
    document.body.style.opacity = '0';
    setTimeout(() => {
      window.location.href = 'mobile-business-menu.html';
    }, 300);
  }, 300);
}
```

### 2. Location Tracking (Consumer Mode)
```javascript
// Dynamic location with reverse geocoding
async function initializeLocationTracking() {
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const {latitude, longitude} = position.coords;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
      );
      const data = await response.json();
      updateLocationDisplay(`${data.address.city}, ${data.address.country}`);
    }
  );
}
```

### 3. Business Type Detection
```javascript
// Dynamic menu based on business features
async function fetchBusinessFeatures() {
  const response = await fetch('/api/users/business-features/');
  const features = await response.json();
  updateDynamicMenuItems(features.category); // SERVICE, RETAIL, MIXED
}
```

### 4. Tap to Pay Integration
```swift
// Swift plugin for native Tap to Pay
@objc func startTapToPay(_ call: CAPPluginCall) {
    let amount = call.getDouble("amount") ?? 0.0
    
    guard TerminalAPI.deviceSupportsReaders() else {
        call.reject("Device does not support Tap to Pay")
        return
    }
    
    // Initialize Stripe Terminal and start payment
}
```

### 5. Smooth Transitions
```css
/* Transition overlay system */
.transition-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: white;
  z-index: 9999;
  opacity: 0;
  transition: opacity 0.3s ease-in-out;
  display: flex;
  align-items: center;
  justify-content: center;
}

.transition-spinner {
  width: 40px; height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
```

---

## File Structure

### Root Directory Structure
```
/Users/kuoldeng/projectx/frontend/pyfactor_next/
├── ios/                          # iOS native project
│   ├── App/
│   │   ├── App/
│   │   │   ├── Info.plist        # iOS app configuration
│   │   │   ├── TapToPayPlugin.swift # Native Tap to Pay
│   │   │   └── public/           # Web assets (auto-synced)
│   │   └── Podfile               # iOS dependencies
├── out/                          # Web assets source
│   ├── mobile-business-menu.html # Business main menu
│   ├── mobile-consumer-menu.html # Consumer main menu
│   ├── mobile-auth.html          # Authentication
│   ├── mobile-pos.html           # Point of Sale
│   ├── mobile-advertise.html     # Advertising form
│   ├── inventory.html            # Inventory management
│   ├── jobs.html                 # Job posting
│   └── [other mobile pages...]
├── capacitor.config.ts           # Capacitor configuration
├── quick-ios.sh                  # Deployment script
└── DOTT_MOBILE_APP_DOCUMENTATION.md # This file
```

### Key Mobile Pages
```
Core Pages:
├── index.html                    # App entry point
├── mobile-auth.html              # Authentication flow
├── mobile-business-menu.html     # Business dashboard
└── mobile-consumer-menu.html     # Consumer marketplace

Business Features:
├── mobile-pos.html               # Point of Sale system
├── inventory.html                # Inventory management
├── mobile-customers.html         # Customer management
├── jobs.html                     # Job postings
├── mobile-advertise.html         # Business advertising
├── mobile-settings.html          # Business settings
└── mobile-transactions.html      # Transaction history

Consumer Features:
├── mobile-profile-consumer.html  # Consumer profile
├── mobile-settings-consumer.html # Consumer settings
└── mobile-categories.html        # Category browsing
```

---

## Development Workflow

### Local Development Setup
```bash
# 1. Install dependencies
npm install

# 2. Start development server (web version)
npm run dev

# 3. Test mobile version locally
npx cap run ios --livereload --external

# 4. Quick mobile updates (recommended)
./quick-ios.sh
npx cap run ios
```

### File Update Process
```bash
# The quick-ios.sh script handles:
# 1. Sync mobile files to /out/ directory
# 2. Copy web assets to ios/App/App/public/
# 3. Generate capacitor.config.json
# 4. Update CFBundleVersion automatically

./quick-ios.sh  # Run this after any changes
```

### Testing Workflow
```bash
# 1. Make changes to files in /out/
# 2. Run update script
./quick-ios.sh

# 3. Test in iOS Simulator
npx cap run ios

# 4. Test on physical device
npx cap run ios --device
```

---

## Deployment Process

### iOS App Store Deployment

#### Prerequisites
```yaml
Apple Developer Account: Required
Xcode: Latest version
Certificates: Distribution certificate
Provisioning Profile: App Store profile
App Store Connect: App registered
```

#### Build Process
```bash
# 1. Prepare production build
npm run build

# 2. Update mobile files
./quick-ios.sh

# 3. Open in Xcode
npx cap open ios

# 4. In Xcode:
#    - Select "App" target
#    - Choose "Generic iOS Device"
#    - Product > Archive
#    - Upload to App Store Connect
```

#### Version Management
```yaml
Marketing Version: User-facing version (1.0.0)
Bundle Version: Auto-generated timestamp (1756747979)
CFBundleIdentifier: com.dottapps.mobile
CFBundleDisplayName: "Dott"
```

### TestFlight Distribution
```bash
# After uploading to App Store Connect:
# 1. Go to App Store Connect
# 2. Select your app
# 3. Go to TestFlight
# 4. Add internal/external testers
# 5. Distribute build to testers
```

---

## Configuration Files

### capacitor.config.ts
```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dottapps.mobile',
  appName: 'Dott',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    hostname: 'app.dottapps.com'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    SecureStorage: {
      encrypt: true,
      keychainService: 'com.dottapps.mobile.keychain'
    }
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile'
  }
};

export default config;
```

### iOS Info.plist Key Permissions
```xml
<key>NSCameraUsageDescription</key>
<string>Dott needs camera access to scan barcodes and QR codes for inventory.</string>

<key>NSContactsUsageDescription</key>
<string>Dott needs contacts access to help you connect with businesses and users.</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>Dott needs your location to show nearby businesses and services.</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Dott uses your location for personalized recommendations.</string>

<key>NSBluetoothAlwaysUsageDescription</key>
<string>Dott uses Bluetooth to connect to payment accessories.</string>
```

### Podfile Dependencies
```ruby
platform :ios, '14.0'
use_frameworks!

def capacitor_pods
  pod 'Capacitor', :path => '../../node_modules/@capacitor/ios'
  pod 'CapacitorCordova', :path => '../../node_modules/@capacitor/ios'
  pod 'CapacitorCommunityContacts'
  pod 'CapacitorCommunityHttp'
  pod 'CapacitorApp'
  pod 'CapacitorCamera'
  pod 'CapacitorFilesystem'
  pod 'CapacitorHaptics'
  pod 'CapacitorKeyboard'
  pod 'CapacitorPushNotifications'
  pod 'CapacitorShare'
  pod 'CapacitorSplashScreen'
  pod 'CapacitorStatusBar'
  pod 'CapacitorSecureStoragePlugin'
  # Stripe Terminal SDK for Tap to Pay on iPhone
  pod 'StripeTerminal', '~> 3.0'
end

target 'App' do
  capacitor_pods
end
```

---

## API Integration

### Authentication Flow
```javascript
// Custom Auth0 integration (no SDK)
const authFlow = {
  loginEndpoint: 'https://staging.dottapps.com/api/auth/consolidated-login',
  sessionEndpoint: 'https://staging.dottapps.com/api/auth/session-v2',
  
  async login(email, password) {
    const response = await fetch(this.loginEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return response.json();
  }
};
```

### Business Features API
```javascript
// Dynamic feature detection
async function fetchBusinessFeatures() {
  const response = await fetch('/api/users/business-features/', {
    credentials: 'include'
  });
  const features = await response.json();
  // Returns: { category: "SERVICE|RETAIL|MIXED", features: ["pos", "jobs"] }
  return features;
}
```

### Location Services
```javascript
// Geolocation with reverse geocoding
const locationService = {
  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      });
    });
  },
  
  async reverseGeocode(lat, lon) {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`
    );
    return response.json();
  }
};
```

---

## Performance Optimizations

### Image Optimization
```css
/* Optimized image loading */
.business-card-image, .ad-image {
  width: 100%;
  height: 120px;
  object-fit: cover;
  background: linear-gradient(135deg, #064e3b 0%, #10b981 100%);
}
```

### Smooth Scrolling
```css
/* iOS momentum scrolling */
body {
  -webkit-overflow-scrolling: touch;
  overflow-y: scroll;
}

/* Scrollable containers */
.categories-scroll, .featured-carousel {
  overflow-x: auto;
  scrollbar-width: none; /* Firefox */
}
.categories-scroll::-webkit-scrollbar {
  display: none; /* Safari/Chrome */
}
```

### Transition Performance
```css
/* Hardware acceleration */
.menu-item, .mode-button {
  transform: translateZ(0);
  will-change: transform;
  transition: all 0.3s ease;
}
```

---

## Security Implementation

### Secure Storage
```javascript
// All sensitive data stored in native keychain
const secureStorage = {
  async setItem(key, value) {
    await Capacitor.Plugins.SecureStoragePlugin.set({
      key: key,
      value: JSON.stringify(value)
    });
  },
  
  async getItem(key) {
    const result = await Capacitor.Plugins.SecureStoragePlugin.get({ key });
    return result.value ? JSON.parse(result.value) : null;
  }
};
```

### Session Management
```javascript
// Session validation with automatic refresh
const sessionManager = {
  async validateSession() {
    const token = await secureStorage.getItem('session_token');
    if (!token) return false;
    
    // Validate with backend
    const response = await fetch('/api/auth/session-v2', {
      credentials: 'include'
    });
    return response.ok;
  }
};
```

### CSP Headers (Web Version)
```javascript
// Content Security Policy
const CSP = {
  'default-src': "'self'",
  'script-src': "'self' 'unsafe-inline'",
  'style-src': "'self' 'unsafe-inline'",
  'img-src': "'self' data: https:",
  'connect-src': "'self' https://staging.dottapps.com https://nominatim.openstreetmap.org"
};
```

---

## Troubleshooting

### Common Issues

#### 1. Navigation Failures
```
Error: The file "mobile-advertise-mixed.html" couldn't be opened
Solution: Check file exists in ios/App/App/public/ directory
Fix: Run ./quick-ios.sh to sync files
```

#### 2. Location Permission Denied
```
Error: [Location] Error getting location: Permission denied
Solution: Check Info.plist has NSLocationWhenInUseUsageDescription
Fix: Add proper location permissions and request user consent
```

#### 3. Smooth Transitions Not Working
```
Error: Transitions appear jarring or broken
Solution: Ensure transition-overlay exists in HTML
Fix: Check CSS animations and JavaScript timing
```

#### 4. Authentication Failures
```
Error: Authentication credentials were not provided
Solution: Check session token in secure storage
Fix: Clear storage and re-authenticate
```

### Debug Commands
```bash
# Check iOS logs
npx cap run ios --livereload

# View file structure
ls -la ios/App/App/public/

# Clear all storage (in browser console)
localStorage.clear();
await Capacitor.Plugins.SecureStoragePlugin.clear();

# Test API connectivity
curl -X GET "https://staging.dottapps.com/api/users/business-features/" \
  -H "Cookie: sessionid=your-session"
```

### Performance Monitoring
```javascript
// Add to each page for debugging
console.log('[PageName] Page loaded at:', Date.now());
console.log('[PageName] Memory usage:', performance.memory);
console.log('[PageName] Navigation entries:', performance.getEntriesByType('navigation'));
```

---

## Future Development Roadmap

### Planned Features
```yaml
Business Type-Specific Forms:
  - mobile-advertise-restaurant.html
  - mobile-advertise-salon.html
  - mobile-advertise-retail.html
  - mobile-advertise-service.html

Enhanced Consumer Features:
  - Real-time chat system
  - Order tracking
  - Push notifications
  - Offline mode support

Advanced Business Tools:
  - Advanced analytics dashboard
  - Multi-location management
  - Employee scheduling
  - Inventory automation
```

### Technical Improvements
```yaml
Performance:
  - Implement service worker for offline support
  - Add lazy loading for images
  - Optimize bundle size
  - Add image caching

UX Enhancements:
  - Add haptic feedback
  - Implement pull-to-refresh
  - Add skeleton loading screens
  - Improve error handling

Developer Experience:
  - Add automated testing
  - Implement hot reload
  - Add error boundaries
  - Improve logging system
```

---

## Conclusion

This documentation provides a complete blueprint for recreating the Dott mobile application. The app leverages modern web technologies within a native iOS shell to deliver a seamless dual-mode business and consumer experience.

**Key Success Factors:**
1. **Hybrid Architecture**: Web technologies with native iOS integration
2. **Dual-Mode Design**: Single codebase serving both business and consumer needs
3. **Smooth UX**: Careful attention to transitions and performance
4. **Modular Structure**: Easy to maintain and extend
5. **Comprehensive Documentation**: Full development and deployment guide

For any questions or clarifications about the implementation, refer to the specific sections above or the inline code comments throughout the application.

---

*This documentation is maintained alongside the codebase and should be updated with any architectural changes.*