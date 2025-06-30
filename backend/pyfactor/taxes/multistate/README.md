# Multi-State Tax Filing Support System

A comprehensive solution for businesses operating across multiple states to manage nexus obligations, calculate apportionment factors, and handle multi-state tax filings.

## Overview

This system provides:

- **Nexus Tracking**: Monitor economic and physical presence nexus across all 50 states + DC
- **Economic Nexus Monitoring**: Automatic tracking of sales and transaction thresholds ($100k-$500k depending on state)
- **Apportionment Calculation**: State income tax apportionment using sales, payroll, and property factors
- **Throwback/Throwout Rules**: Proper handling of nowhere sales according to state rules
- **Combined vs Separate Filing**: Support for different filing methods and recommendations
- **Compliance Monitoring**: Automated alerts for threshold proximity and filing requirements
- **Multi-State Return Generation**: Create state-specific returns with proper apportionment

## Core Components

### 1. Nexus Tracker (`nexus_tracker.py`)

Tracks nexus establishment across multiple states:

```python
from taxes.multistate.nexus_tracker import NexusTracker, NexusActivity, ActivityType

# Initialize tracker
tracker = NexusTracker(tenant_id="your-tenant-id")

# Add business activity
activity = NexusActivity(
    activity_type=ActivityType.OFFICE,
    state='CA',
    start_date=date(2024, 1, 1),
    description='San Francisco office'
)
tracker.add_activity(activity)

# Check nexus status
business_data = {
    'CA_sales': 600000,
    'CA_transactions': 150
}
nexus_status = tracker.get_all_nexus_status(business_data)
```

#### Economic Nexus Thresholds

| State | Sales Threshold | Transaction Threshold |
|-------|----------------|----------------------|
| CA    | $500,000       | None                |
| NY    | $500,000       | 100                 |
| TX    | $500,000       | None                |
| FL    | $100,000       | None                |
| Most Others | $100,000 | 200                |

#### Physical Presence Activities

Activities that create nexus:
- Office locations
- Warehouses/distribution centers
- Retail locations
- Employees
- Repair/service activities
- Installation services
- Property ownership
- Inventory storage

Protected activities (generally don't create nexus):
- Independent contractors (depends on activities)
- Sales representatives (in most states)
- Trade shows (temporary exemption)
- Common carrier delivery

### 2. Apportionment Calculator (`apportionment_calculator.py`)

Calculates state income tax apportionment factors:

```python
from taxes.multistate.apportionment_calculator import ApportionmentCalculator

# Initialize calculator
calculator = ApportionmentCalculator(tenant_id="your-tenant-id")

# Prepare business data
business_data = {
    'states': ['CA', 'NY', 'TX'],
    'total_income': 10000000,
    'total_sales': 50000000,
    'total_payroll': 5000000,
    'total_property': 2000000,
    'CA_sales': 25000000,
    'CA_payroll': 2500000,
    'CA_property': 1000000,
    # ... additional state data
}

# Calculate apportionment
factors = calculator.calculate_multistate_apportionment(business_data)
```

#### State Apportionment Methods

| State | Method | Sales Weight | Payroll Weight | Property Weight |
|-------|---------|--------------|----------------|-----------------|
| CA    | Single Sales | 100% | 0% | 0% |
| NY    | Single Sales | 100% | 0% | 0% |
| PA    | Double-Weighted Sales | 50% | 25% | 25% |
| TX    | Single Sales | 100% | 0% | 0% |

#### Throwback/Throwout Rules

- **Throwback States** (CA, NY, IL, PA, MI, etc.): Add "nowhere sales" back to throwback states
- **Throwout States** (OH): Remove "nowhere sales" from denominator only
- **No Rule States** (TX, FL): No adjustment for nowhere sales

### 3. Django Models

#### MultistateNexusProfile
Main profile for managing multi-state operations:
- Business information (name, EIN, home state)
- Filing preferences (separate vs combined)
- Monitoring settings (check frequency, warning thresholds)

#### StateNexusStatus
Tracks nexus status for each state/tax type combination:
- Economic nexus tracking (sales, transactions, thresholds)
- Physical presence nexus
- Registration status and details
- Filing requirements

#### BusinessActivity
Records business activities that may create nexus:
- Activity type (office, warehouse, employee, etc.)
- Location details
- Time period (start/end dates)
- Economic impact assessment

#### ApportionmentFactors
Stores calculated apportionment factors by tax year:
- State-by-state sales, payroll, property data
- Calculated factors and percentages
- Throwback adjustments
- Validation results

#### MultistateReturn
Manages multi-state tax return filings:
- Return type (income tax, franchise tax, etc.)
- Filing method (separate, combined, consolidated)
- State-by-state tax calculations
- Total tax liability

### 4. API Endpoints

All endpoints support full CRUD operations with tenant isolation:

```
/api/taxes/multistate/
├── nexus-profiles/              # Nexus profile management
│   ├── {id}/analyze_nexus/      # Run nexus analysis
│   ├── {id}/calculate_apportionment/  # Calculate apportionment
│   ├── {id}/generate_multistate_return/  # Generate returns
│   └── {id}/compliance_report/  # Compliance report
├── nexus-status/                # State nexus status
├── business-activities/         # Business activity tracking
├── apportionment-factors/       # Apportionment calculations
│   └── {id}/finalize/          # Finalize factors
├── multistate-returns/          # Multi-state returns
│   └── {id}/submit_return/     # Submit return
├── threshold-monitoring/        # Threshold alerts
├── reciprocity-agreements/      # State agreements
└── consolidated-groups/         # Consolidated filings
```

### 5. Frontend Components

#### MultistateNexusManagement.js
Comprehensive nexus management interface:
- Overview dashboard with key metrics
- State-by-state nexus status
- Business activity management
- Threshold monitoring and alerts
- Apportionment factor display
- Analysis tools

#### MultistateApportionmentCalculator.js
Interactive apportionment calculator:
- Business data input forms
- State-by-state data entry
- Real-time calculation results
- Historical factor management
- Filing method analysis

## Usage Examples

### 1. Setting Up Multi-State Tracking

```python
# Create nexus profile
nexus_profile = MultistateNexusProfile.objects.create(
    tenant=tenant,
    business_name='Multi-State Corp',
    federal_ein='12-3456789',
    home_state='CA',
    preferred_filing_method='separate',
    enable_nexus_monitoring=True,
    nexus_check_frequency=30,
    threshold_warning_percentage=80.00
)

# Add business activities
BusinessActivity.objects.create(
    nexus_profile=nexus_profile,
    activity_type='office',
    state='NY',
    description='New York headquarters',
    start_date=date(2024, 1, 1),
    address='123 Broadway, New York, NY 10001',
    creates_nexus=True
)
```

### 2. Running Nexus Analysis

```python
# Via API
POST /api/taxes/multistate/nexus-profiles/{id}/analyze_nexus/
{
    "states": ["CA", "NY", "TX", "FL"],
    "sales_data": {
        "CA_sales": 2500000,
        "CA_transactions": 500,
        "NY_sales": 1500000,
        "NY_transactions": 300,
        "TX_sales": 800000,
        "TX_transactions": 200,
        "FL_sales": 600000,
        "FL_transactions": 150
    },
    "check_date": "2024-12-31"
}
```

### 3. Calculating Apportionment

```python
# Via API
POST /api/taxes/multistate/nexus-profiles/{id}/calculate_apportionment/
{
    "tax_year": 2024,
    "total_income": 10000000,
    "total_sales": 50000000,
    "total_payroll": 5000000,
    "total_property": 2000000,
    "filing_method": "separate",
    "state_data": {
        "CA": {
            "sales": 25000000,
            "payroll": 2500000,
            "property": 1000000
        },
        "NY": {
            "sales": 15000000,
            "payroll": 1500000,
            "property": 600000
        },
        "TX": {
            "sales": 10000000,
            "payroll": 1000000,
            "property": 400000
        }
    }
}
```

### 4. Generating Multi-State Returns

```python
# Via API
POST /api/taxes/multistate/nexus-profiles/{id}/generate_multistate_return/
{
    "nexus_profile_id": "uuid",
    "return_type": "income_tax",
    "tax_year": 2024,
    "apportionment_factors_id": "uuid",
    "states_to_file": ["CA", "NY", "TX"],
    "filing_method": "separate",
    "electronic_filing": true,
    "due_date": "2025-04-15"
}
```

## Key Features

### Automatic Threshold Monitoring
- Real-time tracking of sales and transaction thresholds
- Configurable warning percentages (default 80%)
- Automated alerts when approaching thresholds
- Priority-based alert system (low, medium, high, critical)

### Compliance Requirements Tracking
- Registration status by state
- Filing frequency requirements
- Due date tracking
- Document requirements

### Advanced Apportionment
- Multiple apportionment methods (single sales, equally weighted, etc.)
- Throwback/throwout rule handling
- Market-based sourcing
- Combined vs separate filing analysis

### Security & Compliance
- Tenant-based data isolation
- Audit trail for all changes
- Role-based access control
- SOC2, GDPR, PCI-DSS, HIPAA ready architecture

### Integration Ready
- RESTful API design
- Webhook support for real-time updates
- Export capabilities (PDF, CSV, XML)
- Third-party integration support

## Configuration

### Environment Variables
```bash
# Optional - enable Redis for enhanced caching
REDIS_URL=redis://localhost:6379/0

# Database configuration
DATABASE_URL=postgresql://user:pass@localhost/db

# API rate limiting
RATE_LIMIT_ENABLE=true
RATE_LIMIT_REQUESTS_PER_MINUTE=60
```

### State-Specific Customization

States can be easily added or modified by updating the configuration dictionaries in:
- `nexus_tracker.py` - Economic nexus thresholds
- `apportionment_calculator.py` - Apportionment methods and weights

### Filing Method Selection

The system automatically recommends filing methods based on:
- States requiring combined filing
- Business income levels
- Number of nexus states
- Complexity of operations

## Testing

Run the comprehensive test suite:

```bash
cd /path/to/backend/pyfactor
python manage.py test taxes.multistate.tests
```

Test coverage includes:
- Nexus tracking algorithms
- Apportionment calculations
- API endpoint security
- Tenant data isolation
- State configuration accuracy
- Edge cases and validation

## Compliance Notes

### Industry Standards
- Follows Multistate Tax Commission (MTC) guidelines
- Implements Uniform Division of Income for Tax Purposes Act (UDITPA) standards
- Supports Public Law 86-272 protections
- Handles wayfair decision implications

### State-Specific Requirements
- Economic nexus thresholds per Wayfair decision
- Physical presence nexus rules
- Throwback/throwout state designations
- Combined filing requirements
- Factor presence standards

### Data Retention
- Maintains 7-year retention for audit purposes
- Automatic archival of old records
- Secure deletion procedures
- Export capabilities for external storage

## Support and Maintenance

### Regular Updates
- Monthly updates for threshold changes
- Quarterly compliance rule updates
- Annual state law change reviews
- Real-time legislative monitoring

### Monitoring and Alerts
- System health monitoring
- Performance metrics tracking
- Error rate monitoring
- Compliance status reporting

This multi-state filing support system provides a robust, scalable solution for businesses operating across multiple states, ensuring compliance while minimizing administrative burden.