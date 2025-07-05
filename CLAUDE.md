# CLAUDE.md - Dott Project Configuration
*Last Updated: 2025-07-05*

## Numbering System Guide
- **Format**: `[MAJOR.MINOR.PATCH] - DATE - STATUS`
- **MAJOR**: Breaking changes or complete overhauls
- **MINOR**: New features or significant improvements  
- **PATCH**: Bug fixes or small updates
- **STATUS**: CURRENT (active), DEPRECATED (replaced), HISTORICAL (reference only)

---

## CURRENT CONFIGURATIONS (Active Instructions)

### [1.0.0] - 2025-06-24 - CURRENT - Core Project Configuration
- **Frontend scripts**: /Users/kuoldeng/projectx/frontend/pyfactor_next/scripts
- **Backend scripts**: /Users/kuoldeng/projectx/backend/pyfactor/scripts
- **Script versioning**: Version0001_<fix description>_<name of file fixed>
- **Module system**: ES modules only (not CommonJS)
- **Script registry**: /Users/kuoldeng/projectx/frontend/pyfactor_next/scripts/script_registry.md
- **Package Manager**: PNPM v8.15.3 (unified version)
- **Environment**: Production mode only (no mock data)

### [1.1.0] - 2025-06-24 - CURRENT - Technology Stack
- **Frontend**: Next.js 15 with TypeScript support
- **CSS**: Tailwind CSS only (no MUI)
- **Database**: PostgreSQL with Row-Level Security (RLS)
- **Language**: JavaScript/TypeScript hybrid
- **Testing**: Jest with jsdom environment
- **Linting**: ESLint (relaxed rules, ignoreBuildErrors: true)

### [1.2.0] - 2025-06-24 - CURRENT - Authentication Configuration
- **Provider**: Auth0 (custom OAuth implementation)
- **Auth0 Domain**: dev-cbyy63jovi6zrcos.us.auth0.com
- **Custom Domain**: auth.dottapps.com
- **Client ID**: 9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF
- **Audience**: https://api.dottapps.com
- **IMPORTANT**: Do NOT use @auth0/nextjs-auth0 SDK (incompatible with standalone mode)

### [1.3.0] - 2025-06-24 - CURRENT - Deployment Configuration
#### Frontend Deployment (Render Docker)
- **Service**: dott-front
- **Branch**: Dott_Main_Dev_Deploy
- **Build**: pnpm run build:render (optimized)
- **Domains**: dottapps.com, www.dottapps.com
- **Auto-deploy**: Enabled on git push
- **Environment vars**: Must use NEXT_PUBLIC_ prefix

#### Backend Deployment (Render)
- **Service**: dott-api
- **Domain**: api.dottapps.com
- **Region**: oregon
- **Plan**: starter
- **Requirements**: requirements-render.txt

### [2.0.0] - 2025-06-18 - CURRENT - Session Management V2
- **Supersedes**: [1.4.0], [1.5.0]
- **Breaking Change**: Removed ALL cookie-based session code
- **Architecture**: Server-side sessions only (banking standard)
- **Storage**: Single 'sid' cookie (36 bytes) vs old 15+ cookies (3.8KB)
- **API**: /api/auth/session-v2 (GET/POST/DELETE)
- **Redis**: OPTIONAL - Add REDIS_URL env var to enable
- **Default**: PostgreSQL session storage (works perfectly)
- **Migration**: Users must re-login after deployment

### [3.0.0] - 2025-06-21 - CURRENT - Backend Single Source of Truth Pattern
- **Supersedes**: [1.6.0], [1.7.0], [1.8.0]
- **Purpose**: Eliminate redirect loops and data conflicts
- **Core Rule**: Backend's `user.onboarding_completed` is ONLY source of truth
- **Implementation Rules**:
  1. ✅ ONLY check backend API responses for onboarding status
  2. ✅ TRUST backend's `needsOnboarding` and `onboardingCompleted` fields
  3. ❌ NEVER override backend status with local data
  4. ❌ NEVER assume tenant existence means onboarding complete
  5. ❌ NEVER use localStorage/cookies for onboarding status
- **Documentation**: `/frontend/pyfactor_next/docs/BACKEND_SINGLE_SOURCE_OF_TRUTH.md`

### [3.1.0] - 2025-06-21 - CURRENT - Onboarding Redirect Loop Fix
- **Supersedes**: [1.6.0], [1.7.0], [1.8.0]
- **Issue**: Frontend setting local status without backend calls
- **Solution**: All plans (free/paid) call `/api/onboarding/complete-all`
- **Result**: Eliminates redirect loops permanently
- **Deployment**: Commit `6b0c0ee8` auto-deployed

### [4.0.0] - 2025-06-23 - CURRENT - Industry-Standard API Pattern
- **Purpose**: Bank-grade security and tenant isolation
- **Pattern**: Frontend → Local Proxy → Django → PostgreSQL with RLS
- **Security**:
  - Database-enforced isolation via RLS
  - Session-based auth (no token exposure)
  - Backend-only tenant management
  - Compliance ready: SOC2, GDPR, PCI-DSS, HIPAA
- **FORBIDDEN**:
  - Direct backend calls
  - Frontend tenant ID handling
  - Manual tenant filtering
  - Local storage for tenant data
- **Documentation**: `/frontend/pyfactor_next/docs/INDUSTRY_STANDARD_API_PATTERN.md`

### [4.1.0] - 2025-06-23 - CURRENT - Tenant Isolation Security
- **Implementation**: Backend-only tenant determination
- **Features**:
  - Automatic queryset filtering by user.tenant_id
  - SecureCustomerViewSet pattern for all models
  - Audit logging for all data access
  - Returns 404 (not 403) for cross-tenant attempts
- **Documentation**: TENANT_ISOLATION_SECURITY.md

### [5.0.0] - 2025-06-24 - CURRENT - UI Design Standards
- **Purpose**: Consistent UI/UX for management pages
- **Reference**: ProductManagement and LocationsManagement
- **Required Components**:
  1. Summary Cards (3-4 metrics)
  2. Search and Action Toolbar
  3. Tab Navigation (Create/Edit, Details, List)
  4. Standardized Table Design
  5. Consistent Form Layouts
  6. Delete Confirmation Dialogs
- **Color Palette**: Blue primary, Green success, Yellow warning, Red error
- **Examples**: ProductManagement.js, LocationsManagement.js

### [6.0.0] - 2025-01-25 - CURRENT - Role-Based Access Control (RBAC)
- **Roles**: OWNER (full), ADMIN (near-full), USER (restricted)
- **Permissions**: Read, Write, Edit, Delete per page
- **Features**:
  - Auth0 email invitations
  - Dynamic menu filtering
  - Middleware route protection
  - Granular permission UI
- **Documentation**: `/docs/RBAC_IMPLEMENTATION.md`

### [7.0.0] - 2025-06-26 - CURRENT - Security Standards
- **Session**: AES-256-CBC encryption, 24-hour duration
- **Rate Limiting**: Auth (5/15min), Payments (10/hr)
- **CSRF**: HMAC-signed tokens
- **CSP**: Strict without unsafe-inline/unsafe-eval
- **Headers**: HSTS, X-Frame-Options, etc.
- **Documentation**: SECURITY.md

### [8.0.0] - 2025-06-26 - CURRENT - Development Guidelines
- **Approach**:
  - Read existing documentation first
  - Make targeted, purposeful changes
  - Ensure clean, efficient code
  - No UI/design changes without permission
- **Change Management**:
  - Provide summary before implementation
  - Wait for explicit approval
  - Implement only specified requests
- **Code Style**:
  - DO NOT ADD COMMENTS unless asked
  - Prefer editing existing files
  - Never create docs unless requested

### [9.0.0] - 2025-06-26 - CURRENT - Integration Services
- **Crisp Chat**: Customer support (NEXT_PUBLIC_CRISP_WEBSITE_ID)
- **Stripe**: Payment processing
- **Google OAuth**: Additional authentication method
- **CORS**: Configured for specific origins

### [10.0.0] - 2025-06-26 - CURRENT - Troubleshooting Resources
- **Frontend**: `/frontend/pyfactor_next/docs/TROUBLESHOOTING.md`
- **Backend**: `/backend/pyfactor/docs/TROUBLESHOOTING.md`
- **Common Issue**: Module GET returns empty - move from PROTECTED_PATHS to EXEMPT_PATHS in OnboardingMiddleware

### [11.0.0] - 2025-01-26 - CURRENT - UI/UX Standards
- **Tooltips**: Include contextual help tooltips (?) on ALL user input fields
  - Use FieldTooltip component for consistent implementation
  - Explain: what data to enter, format requirements, how data is used
  - Example: Cost field explains to include delivery, taxes, and divide by quantity if bulk
  - Follow industry standards (QuickBooks, Shopify style)
- **Icon Standards**:
  - **Dashboard Pages**: Use Phosphor Icons from `@phosphor-icons/react` with duotone weight
    - Standard import: `import { IconName } from '@phosphor-icons/react';`
    - Usage: `<IconName size={24} weight="duotone" className="text-color-600" />`
    - Benefits: Modern appearance, 6 weight options, better cross-platform rendering
    - Reference: SalesDashboard, InventoryDashboard, PaymentsDashboard
  - **Other Pages**: Use Heroicons from `@heroicons/react/24/outline` for page titles
    - Standard styling: `className="h-6 w-6 text-blue-600 mr-2"`
    - Title wrapper: `className="flex items-center"`
  - **Icon Mapping (Phosphor for Dashboards)**:
    - Products: Package
    - Services: Wrench
    - Sales/Orders: ShoppingCart
    - Customers: Users
    - Invoices: FileText
    - Estimates: Files
    - Payments: CreditCard
    - Inventory: Package
    - Reports: ChartBar, ChartLine
    - Settings: Gear
    - Quick Actions: Lightning
    - Revenue: CurrencyDollar
    - Targets: Target
  - **Icon Mapping (Heroicons for Regular Pages)**:
    - Products: CubeIcon
    - Services: WrenchScrewdriverIcon
    - Sales/Orders: ShoppingCartIcon
    - Customers: UserGroupIcon
    - Invoices: DocumentTextIcon
    - Estimates: ClipboardDocumentListIcon
    - Settings: CogIcon
    - Employees: UsersIcon
    - Reports: ChartBarIcon
  - ❌ NO emoji icons in production code
- **Page Title Format**:
  ```jsx
  import { IconName } from '@heroicons/react/24/outline';
  
  <h1 className="text-2xl font-bold text-black mb-4 flex items-center">
    <IconName className="h-6 w-6 text-blue-600 mr-2" />
    Page Title
  </h1>
  ```


### [17.0.0] - 2025-07-01 - CURRENT - Dashboard Drawer Toggle State Management Fix
- **Purpose**: Fix drawer toggle functionality and content area synchronization
- **Issue**: Drawer toggle button stops working after clicks due to stale closure
- **Root Cause**: State setter callbacks captured initial `uiState` values
- **Solution**:
  1. Use functional state updates for ALL state setters:
     ```javascript
     // Before - stale closure
     const setDrawerOpen = useCallback((value) => {
       if (value === uiState.drawerOpen) return; // Always sees initial value!
       updateState({ drawerOpen: value });
     }, [updateState, uiState.drawerOpen]);
     
     // After - functional update
     const setDrawerOpen = useCallback((value) => {
       updateState(prev => {
         const newValue = typeof value === 'function' ? value(prev.drawerOpen) : value;
         if (newValue === prev.drawerOpen) return prev;
         return { ...prev, drawerOpen: newValue };
       });
     }, [updateState]); // No uiState dependency!
     ```
  2. Apply pattern to ALL state setters (setView, setShowHome, etc.)
  3. Set drawer default state to open: `drawerOpen: true`
  4. Fix content area to use constants: `left: drawerOpen ? ${drawerWidth}px : ${iconOnlyWidth}px`
- **Key Learning**: Never include state values in callback dependencies
- **Files Changed**: 
  - `/src/components/Dashboard/DashboardContent.js`
  - `/src/app/dashboard/components/DashAppBar.js`
  - `/src/app/dashboard/components/Drawer.js`
- **Documentation**: Updated `/frontend/pyfactor_next/docs/TROUBLESHOOTING.md`

### [18.0.0] - 2025-07-02 - CURRENT - MFA (Multi-Factor Authentication) Implementation
- **Purpose**: User-controlled MFA settings with Auth0 integration
- **Features**:
  - MFA toggle in My Account security tab
  - Support for TOTP, Email, and Recovery Codes
  - Auth0 Management API integration
  - User metadata storage for preferences
  - Active enrollment management
- **Components**:
  - `/src/app/Settings/components/MyAccount.modern.js` - Enhanced security tab
  - `/src/app/Settings/security/mfa/page.js` - MFA setup page
  - `/src/app/api/user/mfa/route.js` - MFA management API
- **Environment Variables**:
  ```
  AUTH0_DOMAIN=dev-cbyy63jovi6zrcos.us.auth0.com
  AUTH0_M2M_CLIENT_ID=your-m2m-client-id
  AUTH0_M2M_CLIENT_SECRET=your-m2m-client-secret
  ```
- **User Flow**:
  1. Toggle MFA on/off in security settings
  2. Select preferred method (TOTP recommended)
  3. Complete Auth0 enrollment flow
  4. Manage active enrollments
- **Documentation**: `/docs/MFA_IMPLEMENTATION.md`

### [19.0.0] - 2025-07-01 - CURRENT - Local Backend Testing Workflow
- **Purpose**: Prevent deployment failures through comprehensive local testing
- **Breaking Change**: ALL backend changes must be tested locally first using Docker
- **Core Workflow**:
  1. **Start Services**: `docker-compose up db redis --detach`
  2. **Syntax Check**: `python3 -m py_compile taxes/models.py taxes/multistate/models.py`
  3. **Build Backend**: `docker-compose build backend`
  4. **Django Check**: `docker-compose exec backend python manage.py check`
  5. **Migration Test**: `docker-compose exec backend python manage.py makemigrations --dry-run`
  6. **Deploy**: Only after all local tests pass
- **Benefits**:
  - Prevents deployment failures (syntax, dependencies, migrations)
  - Faster feedback loop (seconds vs. minutes)
  - Production-identical environment (Docker)
  - Safe migration testing
  - Eliminates repeated deployment failures
- **Documentation**: `/backend/pyfactor/docs/LOCAL_TESTING_WORKFLOW.md`
- **Created Files**: 
  - `test_models.py` for model validation
  - `LOCAL_TESTING_WORKFLOW.md` comprehensive guide
- **Dependencies Added**: `django-debug-toolbar==4.4.6`
- **Required Tools**: Docker Desktop, docker-compose
- **MANDATORY**: No direct deployments without local testing
- **Quick Commands**:
  - Syntax: `python3 -m py_compile *.py`
  - Build: `docker-compose build backend`
  - Test: `docker-compose exec backend python manage.py check`
  - Migrate: `docker-compose exec backend python manage.py makemigrations --dry-run`

### [13.0.0] - 2025-01-12 - CURRENT - Claude API Integration Architecture
- **Purpose**: Dual Claude API setup for feature separation and cost optimization
- **UPDATED 2025-07-03**: All Claude API calls now use Claude Sonnet 4 for state-of-the-art accuracy
- **Tax API Configuration**:
  - Environment Variable: `CLAUDE_API_KEY`
  - Model: `claude-sonnet-4-20250514` (upgraded to Sonnet 4 for best accuracy)
  - Purpose: Tax calculations, compliance checks, regulatory guidance
  - Usage: Tax modules requiring precise calculations and state/federal distinction
- **Smart Insights API Configuration**:
  - Environment Variable: `CLAUDE_SMART_INSIGHTS_API_KEY`
  - Model: `claude-sonnet-4-20250514` (upgraded to Sonnet 4)
  - Purpose: Business intelligence, customer insights, revenue analysis
  - Credit System: 1 credit = $0.001 of API usage (min 1 credit/query)
  - Rate Limiting: 10 requests per minute via Redis
- **Benefits**:
  - **State-of-the-Art Accuracy**: Claude Sonnet 4 achieves 72.7% on SWE-bench
  - **Superior Instruction Following**: Best at understanding complex tax distinctions
  - **Latest Training Data**: Most current tax information available
  - **Consistent Performance**: Single model across all features
- **Environment Variables Required**:
  ```
  # Tax API
  CLAUDE_API_KEY=sk-ant-api03-...
  CLAUDE_API_MODEL=claude-sonnet-4-20250514
  
  # Smart Insights API
  CLAUDE_SMART_INSIGHTS_API_KEY=sk-ant-api03-...
  CLAUDE_SMART_INSIGHTS_MODEL=claude-sonnet-4-20250514
  CLAUDE_SMART_INSIGHTS_MAX_TOKENS=1000
  ```

### [14.0.0] - 2025-01-12 - CURRENT - Smart Insights Pricing Model
- **Credit System**: Token-based pricing with 1 credit = $0.001 of Claude API usage
- **User Pricing**: $0.10 per credit (10,000% base markup)
- **Package Pricing**: Additional 30% markup on bundles (12,900% total markup)
- **Credit Packages**:
  - **Starter**: 100 credits for $13 (~10 queries)
  - **Growth**: 500 credits for $65 (~50 queries)
  - **Professional**: 1000 credits for $130 (~100 queries)
  - **Enterprise**: 2500 credits for $325 (~250 queries)
- **Query Types**:
  - **Short** (5 credits): Quick facts, simple questions
  - **Medium** (10 credits): Standard analysis, trends
  - **Long** (20 credits): Complex analysis, strategies
- **Business Context**: All queries include actual customer, product, and sales data
- **Free Credits**: One-time allocation based on subscription plan (5/10/20)
- **Documentation**: `/backend/pyfactor/docs/SMART_INSIGHTS_PRICING_MODEL.md`

---

## DEPRECATED CONFIGURATIONS (Replaced - Do Not Use)

### [1.4.0] - 2025-01-18 - DEPRECATED - Session Management V2 Enhanced
- **Deprecated by**: [2.0.0]
- **Issue**: Required Redis, overly complex
- **Note**: Multi-tier caching approach replaced with simpler PostgreSQL-only default

### [1.5.0] - 2025-01-19 - DEPRECATED - Session Manager Cleanup
- **Deprecated by**: [2.0.0]
- **Issue**: Partial cleanup before complete overhaul
- **Note**: Removed duplicate managers but didn't solve core issues

### [1.6.0] - 2025-01-14 - DEPRECATED - Session Management Fixes
- **Deprecated by**: [3.0.0]
- **Issue**: SSL errors, sync-session endpoint approach
- **Note**: Replaced by backend single source of truth

### [1.7.0] - 2025-01-16 - DEPRECATED - Onboarding Redirect Loop Fix (First Attempt)
- **Deprecated by**: [3.1.0]
- **Issue**: Incomplete fix, didn't address all plan types
- **Note**: June fix properly handles all scenarios

### [1.8.0] - 2025-01-16 - DEPRECATED - Onboarding V2 Architecture
- **Deprecated by**: [3.0.0]
- **Issue**: Still had multiple sources of truth
- **Note**: State machine approach replaced by simpler backend-only truth

### [1.9.0] - 2025-01-23 - DEPRECATED - Industry Standard Architecture (First Version)
- **Deprecated by**: [4.0.0]
- **Note**: June version includes complete security patterns

### [12.0.0] - 2025-06-26 - DEPRECATED - Django Migration Workflow
- **Deprecated by**: [17.0.0]
- **Issue**: Didn't include pre-deployment testing
- **Note**: Replaced by comprehensive Docker-based local testing workflow

---

## HISTORICAL NOTES

### Authentication Architecture Evolution
- Started with Cognito/Amplify (removed)
- Moved to Auth0 with standard SDK (didn't work with standalone)
- Current: Custom OAuth implementation with Auth0

### Session Management Evolution
1. Cookie-based with 15+ cookies (3.8KB)
2. Enhanced with Redis caching (January)
3. Complete overhaul to server-side only (June)

### Onboarding Flow Evolution
1. Multiple attempts to fix redirect loops
2. Various state management approaches
3. Final solution: Backend single source of truth

### Security Enhancements Timeline
- January: Basic session security
- January: Added fingerprinting, CSP
- June: Full bank-grade security implementation

### Subscription Pricing (Current)
- **Basic** (Free): 1 user, 3GB storage
- **Professional**: $15/mo or $144/year
- **Enterprise**: $45/mo or $432/year
- Regional pricing: 50% discount for developing countries

---

## IMPORTANT REMINDERS
- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary
- ALWAYS prefer editing existing files
- NEVER proactively create documentation
- ALWAYS use handleAuthError() for auth errors
- CHECK for cookies enabled before auth operations
- VALIDATE sessions proactively
- TEST edge cases thoroughly
- ALWAYS use useSession hook for user data display (consistent across components)

---

## Quick Reference Scripts
### Fix Onboarding Issues (Backend)
```bash
# Fix all users
python manage.py shell < scripts/fix_all_incomplete_onboarding.py

# Fix individual user
python manage.py shell
>>> from scripts.fix_complete_onboarding_status import fix_user_onboarding
>>> fix_user_onboarding('user@example.com')
```

### Load Testing
```bash
node scripts/load-test-sessions.js --scenario=mixed --users=100
```

### Enable Redis (Optional)
Add `REDIS_URL` environment variable in Render dashboard

### [13.0.0] - 2025-06-29 - CURRENT - Smart Insights AI Credit System
- **Purpose**: AI-powered business intelligence with Claude API integration
- **Free Credits** (one-time welcome bonus):
  - Free Plan: 5 credits
  - Professional Plan: 10 credits
  - Enterprise Plan: 20 credits
- **Credit Packages** (30% markup included):
  - Starter: $6.50 for 50 credits
  - Growth: $23.40 for 200 credits
  - Professional: $65.00 for 500 credits
  - Enterprise: $130.00 for 1000 credits
- **Transaction Fees**:
  - Stripe fees (customer pays): 2.9% + $0.30
  - Platform fee (profit): $0.30
  - Total customer pays: 2.9% + $0.60
- **Features**:
  - Redis rate limiting: 10 requests/minute
  - Monthly spending cap: $500/user
  - Stripe checkout integration
  - Comprehensive audit trail
- **Management Commands**:
  ```bash
  python manage.py grant_initial_credits  # Grant free credits to existing users
  python manage.py setup_credit_packages  # Create default packages
  ```
- **Environment Variables**:
  ```
  REDIS_URL=redis://red-d18u66p5pdvs73cvcnig:6379
  STRIPE_SECRET_KEY=sk_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  CLAUDE_API_KEY=sk-ant-api03-...
  ```
- **Documentation**: `/backend/pyfactor/smart_insights/README.md`

### [14.0.0] - 2025-01-28 - CURRENT - Loading Spinner Standards
- **Component**: StandardSpinner (`/src/components/ui/StandardSpinner.js`)
- **Purpose**: Consistent loading indicators across entire application
- **Implementation**: 
  - SVG-based with Tailwind CSS `animate-spin`
  - Proper accessibility (`role="status"`, screen reader text)
  - Size variants: small (4x4), default (8x8), large (12x12), xl (16x16)
- **Helper Components**:
  - `CenteredSpinner`: For centered loading states in containers
  - `ButtonSpinner`: For inline button loading states
- **Migration**: Replace all `animate-spin rounded-full` divs with StandardSpinner
- **Documentation**: `/docs/STANDARD_SPINNER.md`
- **Registry**: Component tracking in `/src/utils/componentRegistry.js`

### [15.0.0] - 2025-06-29 - CURRENT - Worldwide Country Mapping Utility
- **Location**: `/src/utils/countryMapping.js`
- **Purpose**: Complete ISO 3166-1 alpha-2 country code mapping for global support
- **Coverage**: All 195 countries worldwide including territories and dependencies
- **Functions**:
  - `getCountryName(code)`: Convert country code to full name
  - `getCountryCode(name)`: Convert country name to code
  - `getAllCountries()`: Get sorted array of all countries
  - `isValidCountryCode(code)`: Validate country codes
- **Implementation**: Tax Settings component updated to use shared utility
- **Benefits**: Reusable across app, consistent international support
- **Documentation**: `/docs/COUNTRY_MAPPING.md`

### [16.0.0] - 2025-06-30 - CURRENT - AI-Powered Tax Filing Service Implementation
- **Purpose**: Complete tax filing service with AI eligibility determination and two-tier pricing
- **Service Model**:
  - Full Service: $40 (we handle everything - preparation, review, filing)
  - Self Service: $20 (we guide users through the process step-by-step)
  - Complexity multipliers: 1.2x-2.0x based on business complexity
  - AI determines filing eligibility using Claude integration
- **Tax Types Supported**:
  - Sales Tax: Top 20 states with e-filing integration
  - Payroll Tax: Federal Form 941/940 plus 6 major states
  - Income Tax: Multi-state apportionment and nexus tracking
  - Year-End: W-2/1099 generation with IRS compliance
- **Core Features**:
  - Document upload with drag-drop, virus scanning, file validation
  - Professional PDF form generation with ReportLab
  - E-signature integration (DocuSign, Adobe Sign, HelloSign)
  - Stripe payment processing with webhook handling
  - Multi-channel confirmations (email, SMS, PDF receipts)
  - Real-time status tracking with 7-stage workflow
  - Multi-state support with nexus tracking and apportionment
- **File Structure**:
  ```
  /backend/pyfactor/taxes/
  ├── models.py              # Core filing models with audit trails
  ├── efiling/               # State e-filing for 20 states
  ├── pdf_generation/        # Professional PDF forms
  ├── esignature/           # Multi-provider e-signature
  ├── confirmations/        # Filing confirmation system
  ├── payroll/              # Federal 941/940 + state handlers
  ├── year_end/             # W-2/1099 generation
  └── multistate/           # Nexus tracking & apportionment
  ```
- **Security & Compliance**:
  - Banking-grade tenant isolation with RLS
  - PCI DSS compliance via Stripe
  - IRS form specifications and validation
  - Complete audit trails for all operations
  - AES-256-CBC encryption for sensitive data
- **Frontend Components**:
  - TaxFilingService.js: Main filing interface with AI eligibility
  - TaxFilingDocuments.js: Drag-drop document upload
  - TaxFilingStatus.js: Visual status tracking
  - TaxSettings.js: Enhanced multi-location configuration
  - Calendar.js: Tax deadline calendar integration
- **Revenue Potential**: 
  - Target market: 30M+ US businesses
  - Industry standard pricing with AI automation
  - Scalable across all major tax types and states
- **Documentation**: `/docs/TAX_FILING_IMPLEMENTATION.md`
- **Status**: Production-ready, awaiting state API credentials and final deployment

### [20.0.0] - 2025-07-03 - CURRENT - Claude Sonnet 4 Model Upgrade
- **Purpose**: Upgrade all Claude API integrations to use Claude Sonnet 4 for state-of-the-art accuracy
- **Issue Resolved**: Tax API was confusing federal and state income tax rates
- **Evolution**:
  - Initial: `claude-3-haiku-20240307` (failed to distinguish state/federal taxes)
  - Interim: `claude-3-5-sonnet-20241022` (better but still some issues)
  - Current: `claude-sonnet-4-20250514` (best accuracy available)
- **Changes Applied**:
  - Tax Suggestions: → `claude-sonnet-4-20250514`
  - Smart Insights: → `claude-sonnet-4-20250514`
  - Tax Filing Steps: → `claude-sonnet-4-20250514`
  - Tax Filing Locations: → `claude-sonnet-4-20250514`
  - Test Claude: → `claude-sonnet-4-20250514`
- **Benefits**:
  - 72.7% performance on SWE-bench (state-of-the-art)
  - Superior understanding of tax jurisdictions and distinctions
  - More reliable JSON formatting and structure
  - Better instruction following for complex requirements
  - Latest training data with current tax information
- **Cost Analysis**:
  - API cost per request: ~$0.018 (1.8 cents)
  - User charge: $0.10 (10 cents)
  - Healthy markup: 456% (5.6x)
- **Files Updated**:
  - Backend: `/backend/pyfactor/taxes/views/tax_suggestions.py`
  - Backend: `/backend/pyfactor/pyfactor/settings.py`
  - Frontend: `/frontend/pyfactor_next/src/app/api/taxes/suggestions/route.js`
  - Frontend: `/frontend/pyfactor_next/src/app/api/smart-insights/claude/route.js`
  - Frontend: `/frontend/pyfactor_next/src/app/api/taxes/filing-steps/route.js`
  - Frontend: `/frontend/pyfactor_next/src/app/api/taxes/filing-locations/route.js`
  - Frontend: `/frontend/pyfactor_next/src/app/api/taxes/test-claude/route.js`
- **Deployment**: Auto-deploy on push to Dott_Main_Dev_Deploy branch

### [21.0.0] - 2025-07-04 - CURRENT - AI-Powered Import/Export Feature
- **Purpose**: Enable easy data migration with AI-powered field mapping using Claude Sonnet 4
- **Access Control**: Restricted to OWNER and ADMIN roles only
- **Import Features**:
  - Support for Products, Customers, Invoices, Bills, Chart of Accounts, Tax Rates, Vendors, Employees
  - Excel/CSV file upload (QuickBooks OAuth ready for future)
  - AI-powered field mapping with confidence scores (Green=95%+, Yellow=80-94%, Red=manual)
  - User review and override capability for all mappings
  - Skip unmapped fields option for flexibility
  - Real-time progress tracking with statistics
  - Automatic barcode generation for products
- **Export Features**:
  - Multiple formats: Excel, CSV, PDF, QuickBooks
  - Date range filtering
  - No usage limits (doesn't use AI)
- **Usage Limits by Plan** (prevents API abuse):
  - FREE: 3 imports/month, 3 AI analyses, 100 rows max, 1MB files
  - PROFESSIONAL: 50 imports/month, 50 AI analyses, 5K rows max, 10MB files
  - ENTERPRISE: 500 imports/month, 500 AI analyses, 50K rows max, 50MB files
- **Cost Protection**:
  - Separate tracking for imports vs AI analysis
  - Monthly usage reset
  - Clear visual indicators (blue=available, red=limit reached)
  - Graceful fallback to manual mapping when AI limit reached
- **Technical Implementation**:
  - Frontend routes: `/dashboard/import-export/*`
  - API endpoints: `/api/import-export/*`
  - Claude Sonnet 4 for field analysis
  - Session-based security with tenant isolation
- **Value Proposition**:
  - Removes #1 adoption barrier (fear of losing data)
  - Competitors require manual field mapping
  - AI suggestions save hours of setup time
- **Documentation**: `/frontend/pyfactor_next/docs/IMPORT_EXPORT_FEATURE.md`

### [23.0.0] - 2025-07-05 - CURRENT - Sentry Error Tracking and Performance Monitoring
- **Purpose**: Comprehensive error tracking, performance monitoring, and structured logging
- **Package**: `@sentry/nextjs` installed and configured
- **Features**:
  - Automatic JavaScript error capture with stack traces
  - Performance monitoring with custom spans
  - Session replay for visual debugging
  - Structured logging with `logger.fmt` template literals
  - User context and breadcrumb tracking
  - API error monitoring and tracing
- **Configuration Files**:
  - `sentry.client.config.js` - Client-side with session replay
  - `sentry.server.config.js` - Server-side with auto-instrumentation
  - `sentry.edge.config.js` - Edge runtime configuration
- **Integration Examples**:
  - Error boundary in `providers.js`
  - Performance tracking in `ImportExport.js`
  - API monitoring in route handlers
  - Custom hook `useSentryTracking.js`
- **DSN**: `https://860a81d8cdd7fe266706e3bba9138feb@o4509614361804800.ingest.us.sentry.io/4509614365343744`
- **Test Page**: `/dashboard/test-sentry` for verification
- **Documentation**: `/frontend/pyfactor_next/SENTRY_SETUP_SUMMARY.md`

### [24.0.0] - 2025-07-05 - CURRENT - Cloudflare Integration for Enhanced Security and Performance
- **Purpose**: Integrate Cloudflare proxy for better security, caching, and global performance
- **Features Configured**:
  - Page Rules for static assets, admin area, and API endpoints
  - Security headers and CSP compatibility
  - Real IP forwarding from CF-Connecting-IP
  - Cache control optimization for different content types
  - CSRF protection with Cloudflare domains
- **Page Rules Created**:
  1. `*dottapps.com/static/*` - Cache Everything, 1 month TTL
  2. `*dottapps.com/admin/*` - Cache Bypass, High Security
  3. `*dottapps.com/api/*` - Cache Bypass, High Security
- **Backend Updates**:
  - Django settings configured for proxy headers
  - CloudflareMiddleware for IP validation and caching
  - WhiteNoise integration for static file serving
  - Updated ALLOWED_HOSTS and CSRF_TRUSTED_ORIGINS
- **Frontend Updates**:
  - Security headers in next.config.js
  - Cache control for static assets
  - Middleware for real IP forwarding
- **Benefits**:
  - 70-90% bandwidth savings
  - 50-200ms faster page loads globally
  - DDoS protection and threat filtering
  - Edge caching for static content
- **Documentation**: Integrated into settings files

### [25.0.0] - 2025-07-05 - CURRENT - Cloudflare-Compatible Session Handling
- **Purpose**: Fix session creation issues when using Cloudflare proxy
- **Issue**: Sessions failing to create due to cookie restrictions with Cloudflare
- **Solution Implemented**:
  - Created `CloudflareAuth0Authentication` for flexible auth handling
  - Added `CloudflareSessionCreateView` with proper proxy support
  - Updated cookie settings: `SameSite=None` for cross-site compatibility
  - Added strict origin validation (exact domain matching)
  - Implemented rate limiting (5 attempts/hour per IP+email)
- **Security Enhancements**:
  - User enumeration protection (same error for invalid users)
  - Comprehensive audit logging for failed attempts
  - CORS headers for whitelisted domains only
  - Real IP extraction from Cloudflare headers
  - Cache-based rate limiting with Redis/database fallback
- **Cookie Configuration**:
  - `httpOnly: true` (XSS protection)
  - `secure: true` (HTTPS only)
  - `sameSite: 'none'` (required for Cloudflare)
  - `domain: '.dottapps.com'` (cross-subdomain sharing)
- **Backend Endpoints**:
  - `/api/sessions/cloudflare/create/` - Cloudflare-aware session creation
  - Accepts both JWT tokens and email/password authentication
  - Extracts CF-Ray, CF-Connecting-IP for tracking
- **Frontend Updates**:
  - `/api/auth/cloudflare-session` - Frontend proxy endpoint
  - Updated `EmailPasswordSignIn` to use Cloudflare endpoint
  - Fixed session retrieval to check both `sid` and `session_token`
- **Files Created/Modified**:
  - Backend: `cloudflare_auth.py`, `cloudflare_session_view.py`
  - Frontend: `/api/auth/cloudflare-session/route.js`
  - Updated: `EmailPasswordSignIn.js`, `session-v2/route.js`

### [22.0.0] - 2025-07-04 - CURRENT - Comprehensive Notification System
- **Purpose**: Real-time notification system with admin management, bell icon alerts, and 90-day history
- **User Features**:
  - Bell icon with unread count badge (shows 99+ for >99 notifications)
  - Dropdown preview of recent notifications with quick actions
  - Full notifications page at `/dashboard/notifications`
  - 90-day retention with automatic cleanup
  - Advanced filtering by category, priority, and read status
  - Search functionality across titles and messages
  - Toast notifications for new messages
  - Time-ago formatting (e.g., "2 hours ago")
  - Menu item in dashboard navigation for easy access
- **Admin Portal** (`/admin`):
  - Secure JWT authentication with IP whitelisting
  - Create and send targeted notifications
  - Targeting options: all users, by plan, by role, by country, active users
  - Tax feedback management dashboard
  - Engagement metrics and read rate tracking
  - Comprehensive audit logging
- **Technical Architecture**:
  - Frontend: React hooks, useNotifications for polling
  - Backend: Django models with tenant isolation
  - API: RESTful endpoints for user and admin operations
  - Real-time: 30-second polling (WebSocket ready)
  - Security: JWT tokens, IP whitelisting, audit trails
- **Notification Types**:
  - Categories: announcements, updates, alerts, tax, payments, system
  - Priorities: high (red), medium (yellow), low (green)
  - Optional action buttons for quick navigation
  - Expiration dates and auto-dismiss timers
- **Database Models**:
  - AdminUser: Staff with notification permissions
  - Notification: Core notification data
  - NotificationRecipient: Tenant-isolated delivery tracking
  - NotificationTemplate: Reusable message templates
  - AdminAuditLog: Complete action history
- **Maintenance**:
  - Daily cleanup command: `python manage.py cleanup_old_notifications`
  - Options: --dry-run, --days=90, --batch-size=1000
  - Automatic deletion of notifications older than 90 days
  - Audit logging for all cleanup operations
- **Performance**:
  - Paginated API responses
  - Efficient database queries with select_related
  - Batch processing for large operations
  - Client-side caching in useNotifications hook
- **UI/UX Features**:
  - Responsive design for all screen sizes
  - Empty states with helpful messages
  - Loading states with StandardSpinner
  - Priority-based visual indicators
  - Category badges for easy classification
  - "Load more" pagination for smooth browsing
- **Documentation**: `/frontend/pyfactor_next/docs/NOTIFICATION_SYSTEM.md`

### [17.0.0] - 2025-01-11 - CURRENT - My Account Profile Display Fix
- **Purpose**: Fix My Account profile tab to display user name and email from session
- **Issue**: Profile tab showed empty fields despite user menu displaying data correctly
- **Root Cause**: Component relied on API call instead of session data like user menu
- **Solution**:
  1. Added `useSession` hook to get user data directly from session
  2. Session data used as primary source, API as fallback
  3. Merged all data sources with session taking priority
  4. Fixed name field to handle all variations:
     - `name` (full name)
     - `first_name` + `last_name`
     - `given_name` + `family_name`
     - `firstName` + `lastName`
- **Implementation**:
  ```javascript
  import { useSession } from '@/hooks/useSession-v2';
  const { session, loading: sessionLoading } = useSession();
  
  // Use session data to populate profile
  useEffect(() => {
    if (session?.user && !sessionLoading) {
      setProfileData(session.user);
      setLoading(false);
    }
  }, [session, sessionLoading]);
  ```
- **Key Learning**: Always use `useSession` hook for user data (consistent with user menu)
- **Files Changed**: `/src/app/Settings/components/MyAccount.modern.js`
- **Documentation**: Updated `/frontend/pyfactor_next/docs/TROUBLESHOOTING.md`