# My Account Profile Display Fix

## Issue Summary
The My Account page profile tab was not displaying user name and email address even though the data was available in the session (as evidenced by the user menu dropdown displaying correctly).

## Root Cause
The MyAccount component was attempting to fetch profile data via an API call to `/api/user/profile` instead of using the already-available session data. This created several issues:
1. Unnecessary API call when data was already available
2. Complex field name mapping logic
3. Inconsistent behavior compared to other components (like user menu)

## Solution
Updated the component to use the `useSession` hook - the same approach used by the user menu dropdown.

### Key Changes

1. **Added useSession hook import**
```javascript
import { useSession } from '@/hooks/useSession-v2';
```

2. **Get session data in component**
```javascript
const { session, loading: sessionLoading } = useSession();
```

3. **Use session data as primary source**
```javascript
useEffect(() => {
  if (session?.user && !sessionLoading) {
    const sessionUser = session.user;
    setProfileData(sessionUser);
    setProfilePhoto(sessionUser.picture || sessionUser.profilePhoto);
    setLoading(false);
  } else if (!sessionLoading) {
    // Fallback to API if no session
    fetchProfileData();
  }
}, [session, sessionLoading]);
```

4. **Fixed name field to handle all variations**
```javascript
value={
  user.name || 
  `${user.first_name || user.firstName || user.given_name || ''} ${user.last_name || user.lastName || user.family_name || ''}`.trim() || 
  ''
}
```

## Session Data Structure
The session contains user data in this format:
```javascript
{
  email: "kdeng@dottapps.com",
  name: "J D",
  given_name: "J",
  family_name: "D", 
  first_name: "J",
  last_name: "D",
  businessName: "Dott",
  // ... other fields
}
```

## Benefits
1. **Consistency** - Uses same data source as user menu
2. **Performance** - No unnecessary API calls
3. **Immediate Display** - Data shows instantly without loading delay
4. **Simplified Logic** - Less complex field mapping

## Testing
1. Navigate to Settings → My Account
2. Verify Full Name displays correctly
3. Verify Email Address displays correctly
4. Check all field variations work (name, first_name/last_name, etc.)
5. Confirm data matches what's shown in user menu dropdown

## Related Files
- `/src/app/Settings/components/MyAccount.modern.js` - Component fixed
- `/src/hooks/useSession-v2.js` - Session hook used
- `/src/app/dashboard/components/DashAppBar.js` - Reference implementation

## Future Considerations
- All components displaying user data should use `useSession` hook
- Avoid redundant API calls when session data is available
- Maintain consistent field name handling across the application