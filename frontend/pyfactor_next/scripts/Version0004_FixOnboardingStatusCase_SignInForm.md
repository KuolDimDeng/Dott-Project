# Version0004_FixOnboardingStatusCase_SignInForm

## Issue Description
This script fixes a type mismatch error in the SignInForm.js file where the `fixOnboardingStatusCase` function is being called with an object (userAttributes) instead of a string.

### Error
```
TypeError: status.charAt is not a function
```

### Root Cause
In `tenantUtils.js`, the `fixOnboardingStatusCase` function is defined to accept a string parameter:
```javascript
export const fixOnboardingStatusCase = (status) => {
  if (!status) return status;
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};
```

However, in `SignInForm.js`, it's being called with an object (userAttributes):
```javascript
await fixOnboardingStatusCase(userAttributes);
```

This causes the error because the function tries to call `charAt()` on an object, not a string.

### Fix Applied
The script modifies the SignInForm.js file to correctly use the `fixOnboardingStatusCase` function by:
1. Extracting the specific string attribute from the userAttributes object
2. Passing only that string to the fixOnboardingStatusCase function
3. Updating the attribute if needed

```javascript
// Fix uppercase onboarding status if needed
if (userAttributes['custom:onboarding']) {
  const fixedStatus = fixOnboardingStatusCase(userAttributes['custom:onboarding']);
  if (fixedStatus !== userAttributes['custom:onboarding']) {
    // Only update if there's a change needed
    await updateUserAttributes({
      'custom:onboarding': fixedStatus
    });
    userAttributes['custom:onboarding'] = fixedStatus;
  }
}
```

## Execution
- **Date**: 2025-04-25
- **Status**: Completed
- **Backup Created**: Yes (timestamp format: YYYY-MM-DDTHH-MM-SS.SSSZ)

## Related Files
- `/frontend/pyfactor_next/src/app/auth/components/SignInForm.js` - Modified
- `/frontend/pyfactor_next/src/utils/tenantUtils.js` - Referenced (not modified)
