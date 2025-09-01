# Mobile Marketplace System Documentation
*Last Updated: 2025-09-01*

## Overview
The mobile marketplace system provides a dual-mode experience for both business owners and consumers, with dedicated interfaces optimized for mobile devices.

## Architecture

### Two-Mode System
1. **Business Mode** (`mobile-business-menu.html`) - Primary menu for business owners
2. **Consumer Mode** (`mobile-consumer-menu.html`) - Marketplace interface for consumers

### File Structure
```
/out/
├── mobile-business-menu.html      # Business main menu (primary entry point)
├── mobile-consumer-menu.html      # Consumer marketplace interface
├── mobile-profile-consumer.html   # Consumer profile page
├── mobile-settings-consumer.html  # Consumer settings page
├── mobile-marketplace-listing.html # Business listing management
└── mobile-marketplace-search.html  # Business discovery/search
```

## Business Mode (Primary)

### Header Features
- **Logo**: Company logo (40px height, original colors)
- **Greeting**: Time-based greeting with user's first name
- **User Email**: Display user's email address
- **User Preferences**:
  - Country display with full country names
  - Currency display (business-controlled)
  - Language selector (40+ languages)
  - Phone/contacts button

### Navigation
- Bell icon: Notifications
- Gear icon: Settings
- Profile icon: User profile
- Marketplace mode switcher

## Consumer Mode

### Header Features
- **Logo**: Company logo (28px height, original colors) 
- **Icons Row**: Bell, Gear, Profile icons aligned with logo
- **Greeting**: Time-based greeting ("Good evening, [Name]!")
- **User Email**: Display user's email address
- **User Preferences**:
  - Country display (user's location)
  - Language selector (40+ languages) 
  - Phone/contacts button
  - **No Currency**: Removed as businesses control pricing

### Color Scheme
- **Header Background**: Dark green (#064e3b)
- **Icon Buttons**: Translucent white backgrounds
- **Text**: White with various opacities
- **Active States**: Hover effects with increased opacity

### Functionality
- **Language Dropdown**: Interactive selector with search functionality
- **Phone Button**: Capacitor-ready contact app integration
- **Mode Switching**: Seamless transition to business mode

## Key Technical Features

### Mode Switching Logic
```javascript
// Consumer to Business
localStorage.removeItem('marketplaceMode');
sessionStorage.removeItem('marketplaceMode');
localStorage.setItem('marketplaceMode', 'business');
window.location.href = 'mobile-business-menu.html?v=' + Date.now();

// Business to Consumer  
localStorage.setItem('marketplaceMode', 'consumer');
sessionStorage.setItem('marketplaceMode', 'consumer');
window.location.href = 'mobile-consumer-menu.html?v=' + Date.now();
```

### Session Data Integration
- Pulls user data from `localStorage.getItem('user_session')`
- Supports multiple user data formats (firstName, first_name, name)
- Fallback values for missing data
- Real-time greeting based on time of day

### Language Support
- 40+ languages including African languages
- Interactive dropdown with language codes
- Persistent language selection
- RTL language support ready

## Deployment Process

### File Synchronization
```bash
# Quick deployment script
cp /Users/kuoldeng/projectx/frontend/pyfactor_next/out/mobile-*.html /Users/kuoldeng/projectx/out/
./quick-ios.sh
```

### Auto-sync Feature
The `quick-ios.sh` script automatically syncs mobile files:
```bash
MAIN_OUT_DIR="/Users/kuoldeng/projectx/out"
if ls $SOURCE_DIR/mobile-*.html 1> /dev/null 2>&1; then
    cp -r $SOURCE_DIR/mobile-*.html $MAIN_OUT_DIR/ 2>/dev/null
    echo -e "${GREEN}✓ Mobile files synced to main /out/${NC}"
fi
```

## Mobile App Integration

### Capacitor Compatibility
- Uses Capacitor plugins for native functionality
- Secure storage integration for session data
- Native contacts app integration ready
- Proper viewport configuration for iOS

### iOS Deployment
- Files automatically copied to `ios/App/App/public/`
- Proper safe area handling with `env(safe-area-inset-*)`
- Touch-optimized button sizes (40px minimum)

## Authentication Flow

### Session Management
1. Users sign in through `mobile-auth.html`
2. Session data stored in localStorage and Capacitor secure storage
3. Both modes read from same session data
4. Automatic fallbacks for missing user information

### Mode Detection
- Business owners see marketplace toggle in business mode
- Consumers can access both modes seamlessly
- Mode preference persisted across sessions

## WeChat-Inspired UI Elements

### Consumer Interface Features
- **Stories Section**: Horizontal scrolling stories/updates
- **Featured Deals**: Promoted business offerings
- **Quick Actions**: Fast access to common consumer tasks
- **Near You**: Location-based business discovery
- **Search**: "Discover..." placeholder for exploration

### Design Principles
- Clean, modern interface
- Touch-first interaction design
- Consistent with mobile app standards
- Dark green theme for consumer differentiation

## Current State

### Header Layout Comparison

#### Business Mode Header:
```
[Logo] ························ [Bell] [Gear] [Profile]
Good evening, Name!
user@example.com
[Country] [Currency] [Language] ····· [Phone]
```

#### Consumer Mode Header:
```
[Logo] ························ [Bell] [Gear] [Profile] 
Good evening, Name!
user@example.com  
[Country] [Language] ··············· [Phone]
```

### Key Differences
- Consumer mode uses smaller logo (28px vs 40px)
- Consumer mode has dark green theme (#064e3b)
- Consumer mode excludes currency (business-controlled)
- Consumer mode focuses on discovery vs management

## Future Enhancements

### Planned Features
1. **Real-time Chat**: WebSocket-based messaging between consumers and businesses
2. **Order Management**: Full order lifecycle for consumer purchases
3. **Location Services**: GPS-based business discovery
4. **Push Notifications**: Real-time updates for orders and messages
5. **Offline Support**: Progressive web app capabilities

### Integration Points
- Backend API endpoints for marketplace data
- Payment processing integration
- Review and rating system
- Business verification workflow

## Troubleshooting

### Common Issues
1. **Mode switching loops**: Clear both localStorage and sessionStorage
2. **Header layout issues**: Check logo sizing and icon alignment
3. **Language dropdown**: Ensure proper event listener cleanup
4. **Session data**: Verify user_session format and fallbacks

### Debug Commands
```bash
# Check file deployment
ls -la /Users/kuoldeng/projectx/out/mobile-*.html

# Quick redeploy
./quick-ios.sh

# Test in iOS simulator
npx cap run ios
```

---

## Version History
- **v1.0** (2025-08-30): Initial two-mode marketplace system
- **v1.1** (2025-09-01): Header optimization, removed consumer currency display
- **v1.2** (2025-09-01): Added comprehensive language and country support