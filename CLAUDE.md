# CLAUDE.md - Dott Project Configuration
*Last Updated: 2025-06-26*

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

### [12.0.0] - 2025-06-26 - CURRENT - Django Migration Workflow
- **Purpose**: Standardize migration process to prevent deployment issues
- **Workflow**: Always local first, then deploy
- **Steps**:
  1. **Generate locally**: `python manage.py makemigrations`
  2. **Resolve conflicts**: `echo "y" | python manage.py makemigrations --merge`
  3. **Commit migrations**: `git add backend/pyfactor/*/migrations/`
  4. **Push to deploy**: `git push origin Dott_Main_Dev_Deploy`
  5. **Auto-deployment**: Render picks up changes and runs migrations
- **Benefits**:
  - Migration files in version control
  - Team synchronization
  - No manual production database work
  - Rollback capability
- **Local Issues**: Use `--fake` flag for existing columns
- **Documentation**: Updated TROUBLESHOOTING.md with complete workflow
- **NEVER**: Run migrations only on production without committing files first

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