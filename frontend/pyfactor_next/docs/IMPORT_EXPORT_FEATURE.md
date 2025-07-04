# Import/Export Feature Documentation

## Overview
The Import/Export feature provides AI-powered data migration capabilities using Claude Sonnet 4 for intelligent field mapping. This feature removes the #1 barrier to adoption by allowing users to easily import their existing business data from Excel or other systems.

## Access Control
- **Menu Visibility**: Only OWNER and ADMIN roles can see the Import/Export menu item
- **Component Protection**: Additional role check in the ImportExport component
- **Regular Users**: Cannot access this feature (security and cost control)

## Features

### Import Functionality
1. **Data Types Supported**:
   - Products/Services
   - Customers
   - Invoices
   - Bills & Expenses
   - Chart of Accounts
   - Tax Rates
   - Vendors
   - Employees

2. **Import Sources**:
   - Excel/CSV files (implemented)
   - QuickBooks (OAuth ready, implementation pending)
   - Wave, Xero, Shopify (planned)

3. **AI-Powered Field Mapping**:
   - Claude Sonnet 4 analyzes Excel headers
   - Automatic field matching with confidence scores
   - Visual indicators:
     - 🟢 Green = 95%+ confidence
     - 🟡 Yellow = 80-94% confidence
     - 🔴 Red = Manual mapping required
   - Users can review and modify all mappings
   - Skip unmapped fields option

### Export Functionality
- Multiple formats: Excel, CSV, PDF, QuickBooks
- Date range filtering
- No usage limits (doesn't use AI)
- Format-specific options

## Usage Limits & Cost Protection

### Subscription Tiers

| Plan | Imports/Month | AI Analyses/Month | Max Rows | Max File Size |
|------|---------------|-------------------|----------|---------------|
| FREE | 3 | 3 | 100 | 1MB |
| PROFESSIONAL | 50 | 50 | 5,000 | 10MB |
| ENTERPRISE | 500 | 500 | 50,000 | 50MB |

### Protection Mechanisms
1. **Pre-Import Validation**:
   - File size check before upload
   - Monthly limit verification
   - Clear error messages when limits reached

2. **AI Analysis Protection**:
   - Separate counter from imports
   - Graceful fallback to manual mapping
   - Users informed when AI limit reached

3. **Usage Tracking**:
   - Monthly reset
   - Stored in cache/database
   - Visual display of remaining quota

## Technical Implementation

### Frontend Routes
- `/dashboard/import-export` - Main selection page
- `/dashboard/import-export/data-mapper` - AI field mapping interface
- `/dashboard/import-export/import-progress` - Import status tracking
- `/dashboard/import-export/export` - Export configuration

### API Endpoints
- `/api/import-export/analyze-fields` - Claude AI field analysis
- `/api/import-export/check-limits` - Usage limit verification
- `/api/import-export/import-data` - Data import processing
- `/api/import-export/export-data` - Export generation

### Key Components
- `ImportExport.js` - Main feature component
- `data-mapper/page.js` - Field mapping interface
- `import-progress/page.js` - Progress tracking
- `export/page.js` - Export configuration

## Security Considerations
1. **Role-Based Access**: Only OWNER/ADMIN can access
2. **Tenant Isolation**: All imports respect multi-tenant boundaries
3. **Session-Based Auth**: No token exposure
4. **File Validation**: Type and size checks
5. **Rate Limiting**: Built into usage limits

## User Experience Flow

### Import Flow
1. User selects Import from main page
2. Chooses data types to import (checkboxes)
3. Selects import source (Excel, QuickBooks, etc.)
4. Uploads file or connects to service
5. AI analyzes and suggests field mappings
6. User reviews/modifies mappings
7. Confirms and starts import
8. Progress tracking with statistics
9. Success summary with option to view imported data

### Export Flow
1. User selects Export from main page
2. Chooses data types to export
3. Selects format (Excel, CSV, PDF, etc.)
4. Configures options (date range, etc.)
5. Generates and downloads file

## Value Proposition
1. **Removes Adoption Barriers**: Users can import years of data in minutes
2. **AI Advantage**: Competitors require manual field mapping
3. **Flexible**: Users control the process but get AI assistance
4. **Secure**: Role-based access and usage limits
5. **No Lock-in**: Unlimited exports ensure data portability

## Future Enhancements
1. QuickBooks OAuth implementation
2. Additional import sources (Wave, Xero, Shopify)
3. Scheduled/recurring imports
4. Import templates
5. Bulk operations post-import
6. Import history and rollback

## Monitoring & Analytics
- Track import success rates
- Monitor AI accuracy
- Usage patterns by plan
- Common mapping corrections
- File size and row count distributions