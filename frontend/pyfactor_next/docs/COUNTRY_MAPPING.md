# Country Mapping Utility

## Overview

The Country Mapping utility provides comprehensive worldwide country code conversion and validation functionality for the Dott application. It supports all 195 countries using the ISO 3166-1 alpha-2 standard.

## Location

```
/src/utils/countryMapping.js
```

## Features

### Complete Global Coverage
- All 195 countries worldwide
- ISO 3166-1 alpha-2 standard compliance
- Major countries, territories, dependencies, and island nations
- UN member states and recognized territories

### Utility Functions

#### `getCountryName(countryCode)`
Converts a country code to its full country name.

```javascript
import { getCountryName } from '@/utils/countryMapping';

const name = getCountryName('US'); // Returns: 'United States'
const name = getCountryName('GB'); // Returns: 'United Kingdom'
const name = getCountryName('JP'); // Returns: 'Japan'
```

#### `getCountryCode(countryName)`
Converts a country name to its ISO alpha-2 code.

```javascript
import { getCountryCode } from '@/utils/countryMapping';

const code = getCountryCode('United States'); // Returns: 'US'
const code = getCountryCode('United Kingdom'); // Returns: 'GB'
const code = getCountryCode('Japan'); // Returns: 'JP'
```

#### `getAllCountries()`
Returns a sorted array of all countries with both code and name.

```javascript
import { getAllCountries } from '@/utils/countryMapping';

const countries = getAllCountries();
// Returns: [
//   { code: 'AF', name: 'Afghanistan' },
//   { code: 'AL', name: 'Albania' },
//   { code: 'DZ', name: 'Algeria' },
//   // ... all 195 countries, sorted alphabetically by name
// ]
```

#### `isValidCountryCode(countryCode)`
Validates if a country code exists in the mapping.

```javascript
import { isValidCountryCode } from '@/utils/countryMapping';

const isValid = isValidCountryCode('US'); // Returns: true
const isValid = isValidCountryCode('XX'); // Returns: false
```

## Usage Examples

### Basic Country Code Conversion
```javascript
import { getCountryName } from '@/utils/countryMapping';

// Convert user's country code from onboarding
const userCountry = 'CA';
const displayName = getCountryName(userCountry); // 'Canada'
```

### Form Population
```javascript
import { getCountryName } from '@/utils/countryMapping';

// Pre-populate forms with user data
const formData = {
  country: getCountryName(user.country || ''),
  // ... other fields
};
```

### Dropdown Lists
```javascript
import { getAllCountries } from '@/utils/countryMapping';

const CountrySelect = () => {
  const countries = getAllCountries();
  
  return (
    <select>
      {countries.map(({ code, name }) => (
        <option key={code} value={code}>
          {name}
        </option>
      ))}
    </select>
  );
};
```

### Validation
```javascript
import { isValidCountryCode } from '@/utils/countryMapping';

const validateCountry = (code) => {
  if (!isValidCountryCode(code)) {
    throw new Error('Invalid country code');
  }
  return true;
};
```

## Current Implementation

### Tax Settings Integration
The Tax Settings component uses this utility to:
- Convert country codes from user onboarding data to display names
- Ensure consistent country name display across the application
- Support international users with proper country recognition

```javascript
// In TaxSettings.js
import { getCountryName } from '@/utils/countryMapping';

const countryName = getCountryName(user.country);
setFormData(prev => ({
  ...prev,
  country: countryName
}));
```

## Supported Countries

### Major Regions
- **North America**: US, CA, MX, and territories
- **Europe**: All EU countries plus UK, Switzerland, Norway, etc.
- **Asia-Pacific**: CN, JP, IN, AU, SG, and all Asian nations
- **Middle East**: SA, AE, IL, TR, and all Middle Eastern countries
- **Africa**: All African nations including island nations
- **South America**: All South American countries
- **Caribbean**: All Caribbean islands and territories
- **Oceania**: AU, NZ, and all Pacific island nations

### Special Cases
- **Alternative codes**: Both 'GB' and 'UK' map to 'United Kingdom'
- **Dependencies**: Hong Kong (HK), Puerto Rico (PR), etc.
- **Territories**: French territories, British territories, US territories
- **Small nations**: Vatican City (VA), Monaco (MC), San Marino (SM)

## Benefits

### 1. Consistency
- Single source of truth for country data
- Standardized country name display
- Consistent user experience across all components

### 2. Maintainability
- Centralized country mapping
- Easy to update or add new countries
- Version controlled and documented

### 3. International Support
- Complete worldwide coverage
- Proper handling of territories and dependencies
- Support for global business operations

### 4. Reusability
- Import from any component
- Standardized utility functions
- No code duplication

### 5. Performance
- Lightweight utility functions
- No external dependencies
- Fast lookups using object mapping

## Best Practices

### 1. Always Use the Utility
```javascript
// ✅ Good
import { getCountryName } from '@/utils/countryMapping';
const country = getCountryName(code);

// ❌ Bad - hardcoded mapping
const country = code === 'US' ? 'United States' : code;
```

### 2. Handle Empty Values
```javascript
// ✅ Good
const country = getCountryName(user.country || '');

// ❌ Bad - no fallback
const country = getCountryName(user.country);
```

### 3. Use Appropriate Function
```javascript
// ✅ Good - for validation
if (isValidCountryCode(code)) {
  // process country
}

// ✅ Good - for display
const displayName = getCountryName(code);

// ✅ Good - for dropdowns
const options = getAllCountries();
```

## Future Enhancements

### Potential Additions
1. **Localization**: Country names in multiple languages
2. **Regions**: Group countries by continent/region
3. **Currencies**: Map countries to their currencies
4. **Time zones**: Associate countries with time zones
5. **Phone codes**: International dialing codes
6. **Flags**: Country flag emoji or image URLs

### Migration Path
When adding new features, maintain backward compatibility:
```javascript
// Future enhancement example
export const getCountryDetails = (countryCode) => ({
  name: getCountryName(countryCode),
  currency: getCurrency(countryCode), // Future
  timezone: getTimezone(countryCode), // Future
  flag: getFlag(countryCode) // Future
});
```

## Testing

### Unit Tests Needed
```javascript
// Example test cases
describe('countryMapping', () => {
  test('converts known country codes', () => {
    expect(getCountryName('US')).toBe('United States');
    expect(getCountryName('GB')).toBe('United Kingdom');
  });
  
  test('handles unknown codes gracefully', () => {
    expect(getCountryName('XX')).toBe('XX');
  });
  
  test('validates country codes', () => {
    expect(isValidCountryCode('US')).toBe(true);
    expect(isValidCountryCode('XX')).toBe(false);
  });
});
```

## Migration Guide

### From Hardcoded Mapping
```javascript
// Before
const countryName = code === 'US' ? 'United States' : 
                   code === 'CA' ? 'Canada' : code;

// After
import { getCountryName } from '@/utils/countryMapping';
const countryName = getCountryName(code);
```

### From External Libraries
```javascript
// Before
import { countries } from 'some-country-library';

// After
import { getAllCountries } from '@/utils/countryMapping';
const countries = getAllCountries();
```

This utility provides a robust foundation for international country handling throughout the Dott application.