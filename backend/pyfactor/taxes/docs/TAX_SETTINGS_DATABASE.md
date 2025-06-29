# Tax Settings Database Schema

## Overview
Yes, the following database tables will be created to store all tax information when you run the Django migration.

## Tables Created

### 1. `tax_settings` Table
**Purpose**: Stores tenant-specific tax configuration and rates

**Columns**:
- `id` - Primary key
- `tenant_id` - Foreign key to tenant (unique per tenant)
- `business_name` - VARCHAR(255)
- `business_type` - VARCHAR(50) - choices: retail, service, manufacturing, etc.
- `country` - VARCHAR(100)
- `state_province` - VARCHAR(100)
- `city` - VARCHAR(100)
- `postal_code` - VARCHAR(20)
- `sales_tax_rate` - DECIMAL(5,2) - e.g., 8.75%
- `income_tax_rate` - DECIMAL(5,2)
- `payroll_tax_rate` - DECIMAL(5,2)
- `filing_website` - VARCHAR(500) - URL
- `filing_address` - TEXT
- `filing_deadlines` - TEXT
- `ai_suggested` - BOOLEAN - whether rates came from AI
- `ai_confidence_score` - INTEGER (0-100)
- `approved_by_name` - VARCHAR(255) - digital signature name
- `approved_by_signature` - VARCHAR(255) - signature text
- `approved_at` - DATETIME
- `approval_ip_address` - IP ADDRESS
- `confirmation_email_sent` - BOOLEAN
- `confirmation_email_sent_at` - DATETIME
- `confirmation_email_sent_to` - EMAIL
- `created_at` - DATETIME
- `updated_at` - DATETIME

**Indexes**: On tenant_id

### 2. `tax_rate_cache` Table
**Purpose**: Global cache for AI tax suggestions (shared across all tenants to reduce API costs)

**Columns**:
- `id` - Primary key
- `country` - VARCHAR(100) - indexed
- `state_province` - VARCHAR(100) - indexed
- `city` - VARCHAR(100) - indexed
- `business_type` - VARCHAR(50) - indexed
- `sales_tax_rate` - DECIMAL(5,2)
- `income_tax_rate` - DECIMAL(5,2)
- `payroll_tax_rate` - DECIMAL(5,2)
- `filing_website` - VARCHAR(500)
- `filing_address` - TEXT
- `filing_deadlines` - TEXT
- `confidence_score` - INTEGER
- `source` - VARCHAR(50) - claude_api, manual, verified
- `expires_at` - DATETIME - indexed
- `hit_count` - INTEGER - tracking cache usage
- `last_accessed` - DATETIME
- `created_at` - DATETIME

**Unique Constraint**: (country, state_province, city, business_type)
**Indexes**: On expires_at, last_accessed

### 3. `tax_api_usage` Table
**Purpose**: Tracks monthly API usage per tenant

**Columns**:
- `id` - Primary key
- `tenant_id` - Foreign key to tenant
- `month_year` - VARCHAR(7) - e.g., "2024-01" - indexed
- `api_calls_count` - INTEGER - actual API calls made
- `cache_hits_count` - INTEGER - requests served from cache
- `monthly_limit` - INTEGER - based on plan (5, 50, 500)
- `plan_type` - VARCHAR(20) - free, basic, premium
- `created_at` - DATETIME
- `updated_at` - DATETIME

**Unique Constraint**: (tenant_id, month_year)

## Data Flow

1. **User enters tax location** → Check `tax_rate_cache` first
2. **If cache miss** → Check `tax_api_usage` limits
3. **If within limits** → Call Claude API → Store in `tax_rate_cache`
4. **User saves settings** → Store in `tax_settings` with signature
5. **Track usage** → Update `tax_api_usage`

## Migration Command

To create these tables, run:
```bash
python manage.py makemigrations taxes
python manage.py migrate taxes
```

## Sample Data

### tax_settings
```sql
INSERT INTO tax_settings (
    tenant_id, business_name, business_type, 
    country, state_province, city, postal_code,
    sales_tax_rate, income_tax_rate, payroll_tax_rate,
    approved_by_signature, approved_at
) VALUES (
    1, 'Acme Corp', 'retail',
    'United States', 'California', 'San Francisco', '94105',
    8.75, 28.00, 15.30,
    'John Doe', '2024-01-28 10:30:00'
);
```

### tax_rate_cache
```sql
INSERT INTO tax_rate_cache (
    country, state_province, city, business_type,
    sales_tax_rate, income_tax_rate, payroll_tax_rate,
    confidence_score, source, expires_at
) VALUES (
    'United States', 'California', 'San Francisco', 'retail',
    8.75, 28.00, 15.30,
    95, 'claude_api', '2024-07-28 00:00:00'
);
```

### tax_api_usage
```sql
INSERT INTO tax_api_usage (
    tenant_id, month_year, api_calls_count, 
    cache_hits_count, monthly_limit, plan_type
) VALUES (
    1, '2024-01', 3, 12, 5, 'free'
);
```

## Security Features

1. **Tenant Isolation**: Each tenant can only see/modify their own tax_settings
2. **Cache Sharing**: tax_rate_cache is shared to reduce costs but doesn't expose tenant data
3. **Usage Tracking**: Prevents abuse by tracking per-tenant usage
4. **Audit Trail**: Complete history with timestamps and IP addresses

## Benefits

1. **Cost Savings**: Cache prevents duplicate API calls for same locations
2. **Performance**: Cache provides instant responses for common queries
3. **Compliance**: Digital signatures and email confirmations for audit trail
4. **Scalability**: Efficient indexes and tenant isolation