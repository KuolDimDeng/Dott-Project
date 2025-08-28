# Mobile App Color Scheme Documentation
*Last Updated: 2025-08-28*

## IMPORTANT: DO NOT CHANGE THESE COLORS
This color scheme has been approved and should remain consistent across the mobile app.

## Color Palette

### Primary Colors
- **Primary Blue**: `#2563eb` - Used for all primary buttons and active states
- **Primary Blue (Alternative)**: `#3b82f6` - Used in CSS variables as --primary
- **White**: `#ffffff` - Used for splash screen and sign-in page backgrounds
- **Light Gray**: `#f8f9fa` - Used for content page backgrounds

### Secondary Colors
- **Red (Danger)**: `#ef4444` - Used for clock-out button and error states
- **Success Green**: `#10b981` - Used for success messages
- **Warning Yellow**: `#f59e0b` - Used for warning messages

### Neutral Colors
- **Text Primary**: `#333333` - Main text color
- **Text Secondary**: `#666666` - Secondary text color
- **Border Gray**: `#dddddd` - Form borders
- **Card Background**: `#ffffff` - White cards on gray backgrounds

## Component-Specific Colors

### Splash Screen
- **Background**: `#ffffff` (PURE WHITE - DO NOT CHANGE)
- **Logo**: Uses original image colors on white background

### Sign-In Page (mobile-auth.html)
- **Page Background**: `#ffffff` (white)
- **Sign In Button**: `#3b82f6` (blue)
- **Form Card**: `#ffffff` (white)
- **Input Borders**: `#dddddd`

### All Content Pages (Dashboard, POS, Inventory, etc.)
- **Page Background**: `#f8f9fa` (light gray)
- **Card Backgrounds**: `#ffffff` (white)
- **Primary Buttons**: `#2563eb` (blue)
- **Secondary Buttons**: `#e9ecef` (light gray)

### Navigation
- **Active Item**: `#2563eb` (blue)
- **Inactive Item**: `#999999` (gray)
- **Navigation Background**: `#ffffff` (white)

### Timesheet Page Specific
- **Clock In Button**: `#2563eb` (blue)
- **Clock Out Button**: `#ef4444` (red)
- **In Range Status**: `#d4edda` (light green background)
- **Out of Range Status**: `#f8d7da` (light red background)

### Expenses Page Specific
- **Add Expense Button**: `#2563eb` (blue)
- **Submit Button**: `#2563eb` (blue)
- **Cancel Button**: `#e9ecef` (gray)
- **Receipt Upload Area**: `#f8f9fa` (light gray)

### Pay Stubs Page Specific
- **Download Button**: `#2563eb` (blue)
- **Pay Amount Display**: `#2563eb` (blue)

### Inventory Page Specific
- **Add Product Button**: `#2563eb` (blue)
- **In Stock**: `#28a745` (green)
- **Low Stock**: `#ffc107` (yellow)
- **Out of Stock**: `#dc3545` (red)

## Configuration Files

### capacitor.config.ts
```typescript
plugins: {
  SplashScreen: {
    backgroundColor: '#ffffff', // WHITE - DO NOT CHANGE
  }
}
```

### LaunchScreen.storyboard
```xml
<color key="backgroundColor" white="1" alpha="1" colorSpace="custom" customColorSpace="genericGamma22GrayColorSpace"/>
```

## Important Notes

1. **DO NOT CHANGE** the splash screen background from white (`#ffffff`)
2. **DO NOT CHANGE** the primary blue color (`#2563eb`) - This matches the web app
3. **DO NOT CHANGE** the sign-in page background from white
4. All primary action buttons must use blue (`#2563eb`)
5. Active navigation states must use blue (`#2563eb`)
6. Content pages should have light gray backgrounds (`#f8f9fa`) for better readability

## Rationale
- The blue color (`#2563eb`) matches the web app's primary button color (Tailwind's `bg-blue-600`)
- White splash screen provides a clean, professional appearance
- Light gray backgrounds on content pages improve readability and reduce eye strain
- The color scheme maintains consistency with the Dott brand across web and mobile platforms

## Files Affected
- `/out/mobile-auth.html` - Sign-in page
- `/out/mobile-dashboard.html` - Dashboard
- `/out/mobile-pos.html` - Point of Sale
- `/out/mobile-inventory.html` - Inventory management
- `/out/mobile-paystubs.html` - Pay stubs viewer
- `/out/mobile-timesheet.html` - Timesheet with geofencing
- `/out/mobile-expenses.html` - Expense tracking
- `/capacitor.config.ts` - Splash screen configuration
- `/ios/App/App/Base.lproj/LaunchScreen.storyboard` - iOS launch screen

---

**⚠️ IMPORTANT: This color scheme has been finalized and approved. Any changes must be explicitly requested and documented.**