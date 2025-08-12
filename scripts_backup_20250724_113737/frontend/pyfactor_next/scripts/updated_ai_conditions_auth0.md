# AI Model Request Conditions - Auth0 Version

## Updated Request Conditions for Auth0 Authentication

1. **Scripts Location**: 
   - Frontend scripts: /Users/kuoldeng/projectx/frontend/pyfactor_next/scripts
   - Backend scripts: /Users/kuoldeng/projectx/backend/pyfactor/scripts

2. **Documentation**: Include comprehensive documentation within scripts

3. **Version Control**: Use version control naming (Version0001_<fix description>_<name of file fixed>)

4. **Backups**: Create backup of all changed files with date in naming convention (one backup version only)

5. **ES Modules**: Write scripts using ES modules (not CommonJS)

6. **Script Registry**: Maintain script registry file in each scripts folder. Main registry: /Users/kuoldeng/projectx/frontend/pyfactor_next/scripts/script_registry.md

7. **No Client Storage**: No cookies or local storage

8. **Auth0 Session Management**: Use Auth0 session cookies and API calls for user data
   - User profile data from /api/users/me
   - Tenant data included in API responses
   - In-memory caching for performance

9. **Tenant ID**: Use current_tenant_id from API response (not hardcoded tenant id)

10. **Auth0 Attributes Utility**: ALWAYS use the Auth0Attributes utility for accessing user data
    - Reference /docs/Auth0AttributesReference.md for comprehensive API response structure
    - Import and use /src/utils/Auth0Attributes.js instead of direct API access
    
    Example:
    ```javascript
    // INCORRECT - direct API access prone to errors
    const tenantId = apiResponse.tenant?.id; // Inconsistent!
    
    // CORRECT - use the utility
    import Auth0Attributes from '@/utils/Auth0Attributes';
    const tenantId = Auth0Attributes.getTenantId(userProfile);
    ```

11. **Next.js 15**: Using Next.js version 15

12. **Long-term Solutions**: Do not implement short-term fixes, look for long-term solutions

13. **Page Locations**: 
    - Home page: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/page.js
    - Layout page: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/layout.js

14. **Styling**: Use Tailwind CSS only (no MUI)

15. **Database**: Render PostgreSQL with Row-Level Security policy and strict tenant isolation

16. **Amplify**: Amplify version 6

17. **Language**: JavaScript (not TypeScript)

18. **Package Manager**: PNPM package manager

19. **Production Mode**: Production mode only (no development mode)

20. **Live Database**: No mock data (connect to live Render PostgreSQL database)

21. **Deployment Architecture**: Render + Vercel + Auth0 Stack
    - **Backend API**: Render.com (Django/Python) - dott-api.onrender.com
    - **Frontend**: Vercel (Next.js) - dottapps-oauth-enhanced-ek2oplqav-kuol-dengs-projects.vercel.app
    - **Production Domains**: dottapps.com, www.dottapps.com
    - **Authentication**: Auth0 (replacing AWS Cognito)
    - **Database**: Render PostgreSQL (dott-db, replacing AWS RDS)

22. **Security**: No hardcoded environment keys or sensitive information

23. **Environment Files**: Use .env, .env.local, .env.production files for secrets

24. **Documentation**: Create/update .MD files in same folder as modified code

25. **Documentation Review**: Read existing documentation before making changes

26. **Change Documentation**: Document all changes with version history and issue reference

27. **Targeted Changes**: Make targeted, purposeful changes rather than broad modifications

28. **Code Quality**: Ensure code is clean and efficient

29. **Scope Limitation**: No UI, design, or feature changes beyond request scope without permission

30. **Script Versioning**: Version tag all scripts (v1.0, v1.1, etc.)

31. **Understanding Summary**: Provide summary of understanding before implementing changes

32. **Approval Required**: Wait for explicit approval before modifying code

33. **Request Focus**: Implement only the specified request

## Auth0 Migration Notes

### API Response Structure
```javascript
// Auth0 API Response from /api/users/me
{
  "user": {
    "id": 1,
    "auth0_id": "auth0|123",
    "email": "user@example.com",
    "name": "John Doe",
    "picture": "https://..."
  },
  "tenant": {
    "id": "abc-123",
    "name": "My Company",
    "business_type": "Technology",
    "subscription_plan": "professional",
    "subscription_status": "active"
  },
  "role": "owner",
  "onboarding": {
    "business_info_completed": true,
    "subscription_selected": true,
    "payment_completed": true,
    "setup_completed": true
  }
}
```

### Key Changes from Cognito
- **Tenant ID**: current_tenant_id from API response (not custom:tenant_ID)
- **User Data**: Via /api/users/me API call (not fetchUserAttributes())
- **Session**: Auth0 session cookies (not Cognito session)
- **Utility**: Auth0Attributes.js (not CognitoAttributes.js)
- **Documentation**: Auth0AttributesReference.md (not CognitoAttributesReference.md)

## Deployment Architecture Notes

### New Stack: Render + Vercel + Auth0
- **Backend**: Django API hosted on Render.com (replaces AWS Elastic Beanstalk)
- **Frontend**: Next.js hosted on Vercel (maintained)
- **Auth**: Auth0 (replaces AWS Cognito)
- **Database**: Render PostgreSQL (dott-db, replaces AWS RDS)
- **CDN**: Vercel Edge Network (replaces CloudFront)

### Database Configuration
- **Database Name**: dott_production
- **Username**: dott_user
- **Host**: dpg-d0u3s349c44c73a8m3rg-a.oregon-postgres.render.com
- **Port**: 5432
- **Connection**: Use DATABASE_URL environment variable
