# MFA (Multi-Factor Authentication) Implementation

## Overview
This document describes the MFA implementation for the Dott application, allowing users to enable/disable MFA and choose their preferred authentication method through the My Account security tab.

## Architecture

### Frontend Components
1. **My Account Security Tab** (`/src/app/Settings/components/MyAccount.modern.js`)
   - MFA toggle switch to enable/disable
   - Method selection (TOTP, Email, Recovery Codes)
   - Active enrollment management
   - Integration with Auth0 MFA flow

2. **MFA Setup Page** (`/src/app/Settings/security/mfa/page.js`)
   - Dedicated page for MFA method selection
   - Clear instructions for users
   - Redirects to Auth0 for enrollment

### API Endpoints
1. **MFA Management API** (`/src/app/api/user/mfa/route.js`)
   - `GET /api/user/mfa` - Retrieve user's MFA settings
   - `POST /api/user/mfa` - Update MFA preferences
   - `DELETE /api/user/mfa` - Remove MFA enrollments

### Auth0 Integration
- Uses Auth0 Management API to store MFA preferences in user metadata
- Leverages Auth0's built-in MFA enrollment flow
- Supports TOTP (authenticator apps), Email, and Recovery Codes

## Implementation Details

### State Management
```javascript
// MFA settings state in MyAccount component
const [mfaSettings, setMfaSettings] = useState(null);
const [loadingMFA, setLoadingMFA] = useState(true);
const [updatingMFA, setUpdatingMFA] = useState(false);
```

### MFA Settings Structure
```javascript
{
  enabled: boolean,              // MFA enabled/disabled
  preferredMethod: string,       // 'totp' | 'email' | 'recovery-code'
  enrollments: [{               // Active MFA methods
    id: string,
    status: string,
    type: string,
    name: string,
    enrolledAt: string
  }],
  availableMethods: string[],    // Supported methods
  hasActiveEnrollment: boolean   // Has at least one active method
}
```

### User Flow
1. User navigates to Settings → My Account → Security tab
2. User toggles MFA on/off using the switch
3. If enabling MFA:
   - User selects preferred method (TOTP recommended)
   - User can click "Set Up MFA" to configure
   - Redirected to Auth0 enrollment flow
   - After completion, returns to security tab
4. If disabling MFA:
   - MFA is disabled in Auth0 user metadata
   - User notified of change

### Environment Variables Required
```env
# Auth0 Management API Configuration
AUTH0_DOMAIN=dev-cbyy63jovi6zrcos.us.auth0.com
AUTH0_M2M_CLIENT_ID=your-machine-to-machine-client-id
AUTH0_M2M_CLIENT_SECRET=your-machine-to-machine-client-secret
```

## Setup Instructions

1. **Create Machine-to-Machine Application in Auth0**
   - Go to Auth0 Dashboard → Applications
   - Create new M2M application
   - Authorize for Management API
   - Grant scopes: `read:users`, `update:users`, `read:users_app_metadata`, `update:users_app_metadata`

2. **Configure Environment Variables**
   - Add M2M credentials to `.env.local`
   - Ensure Auth0 domain matches your tenant

3. **Enable MFA in Auth0**
   - Go to Security → Multi-factor Auth
   - Enable desired factors (OTP, Email, Recovery Codes)
   - Set policy to "Prompt for MFA" (optional)

## Security Considerations

1. **API Security**
   - All MFA operations require authenticated session
   - User can only modify their own MFA settings
   - Auth0 Management API calls use M2M authentication

2. **Data Storage**
   - MFA preferences stored in Auth0 user metadata
   - No sensitive MFA data stored in application database
   - Recovery codes managed entirely by Auth0

3. **User Experience**
   - Clear indication of MFA status
   - Easy toggle to enable/disable
   - Guided enrollment process
   - Option to remove individual MFA methods

## Testing

1. **Enable MFA**
   - Toggle MFA on in security tab
   - Select preferred method
   - Complete Auth0 enrollment
   - Verify method appears in active enrollments

2. **Disable MFA**
   - Toggle MFA off
   - Confirm setting saved
   - Verify no MFA prompt on next login

3. **Method Management**
   - Change preferred method
   - Remove enrolled methods
   - Add multiple methods

## Troubleshooting

### Common Issues

1. **"Failed to update MFA settings" error**
   - Check M2M application credentials
   - Verify Management API scopes
   - Check Auth0 logs for API errors

2. **Enrollment not completing**
   - Ensure redirect URLs configured in Auth0
   - Check browser console for errors
   - Verify MFA factors enabled in Auth0

3. **MFA toggle not working**
   - Check browser network tab for API errors
   - Verify session is authenticated
   - Check Auth0 user metadata updates

## Future Enhancements

1. **SMS/Phone Support**
   - Add SMS as MFA method option
   - Requires Auth0 SMS gateway configuration

2. **Backup Codes Display**
   - Show recovery codes after enrollment
   - Allow regeneration of backup codes

3. **Trusted Devices**
   - Remember device for 30 days
   - Manage trusted devices list

4. **Admin Override**
   - Allow admins to reset user MFA
   - Force MFA for specific roles