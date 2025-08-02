# Accounting Standards Feature Documentation

## Overview
The Accounting Standards feature allows users to select between IFRS and US GAAP for their financial reporting. The system automatically selects the appropriate standard based on the user's business country but allows manual override.

## Implementation Details

### Location
- **Settings Page**: Settings → Business Tab → Accounting Standards
- **Auto-Detection**: Based on business country during onboarding

### Features
1. **Two Options**: IFRS (International) or US GAAP
2. **Country-Based Auto-Detection**: 
   - US businesses default to US GAAP
   - All other countries default to IFRS
3. **Manual Override**: Users can change selection anytime
4. **Confirmation Modal**: Requires confirmation before changing
5. **Clear Status Display**: Shows if auto-selected or manually chosen

### Technical Implementation

#### Component
- `/src/app/Settings/components/sections/AccountingStandards.js`

#### Auto-Detection Logic
```javascript
const GAAP_COUNTRIES = [
  'US', 'USA', 'United States', 'United States of America'
];

// All other countries default to IFRS
```

### User Flow

#### New Users (Onboarding)
1. User enters business country during onboarding
2. System automatically sets accounting standard:
   - US → US GAAP
   - Any other country → IFRS
3. No user action required

#### Existing Users
1. Navigate to Settings → Business tab
2. See current standard with note:
   - "Auto-selected based on your country: [Country]" OR
   - "Manually selected (Country default: [Standard])"
3. Click on desired standard
4. Confirmation modal appears
5. Confirm to save selection

### Display Options

#### IFRS (International Financial Reporting Standards)
- **Icon**: 🌍
- **Description**: "Used by 160+ countries worldwide. Required for public companies in most countries outside the US. Provides a global framework for financial reporting with principle-based standards."

#### US GAAP (Generally Accepted Accounting Principles)
- **Icon**: 🇺🇸
- **Description**: "Required for US public companies and commonly used by US private companies. Provides detailed, rule-based guidance for financial reporting in the United States."

### API Integration
- `GET /api/backend/api/business/settings/` - Load current settings
- `PATCH /api/backend/api/business/settings/` - Update accounting standard

### Important Notes
- Affects financial statement formatting
- Both standards ensure accurate reporting
- Consult accountant before changing
- All existing transactions remain unchanged

### Simplified from Previous Version
- Removed inventory valuation methods (FIFO, LIFO, etc.)
- Removed financial statement naming configurations
- Removed complex country-specific rules
- Focus on essential IFRS vs US GAAP choice only