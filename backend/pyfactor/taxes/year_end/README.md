# Year-End Tax Form Generation System

This module provides comprehensive W-2 and 1099 tax form generation, management, and distribution capabilities for Dott's payroll and accounting system.

## Features

### W-2 Form Generation
- **Automatic Generation**: Generate W-2s for all employees with wages in the tax year
- **Multi-State Support**: Handle employees working in multiple states
- **Wage Categorization**: Properly categorize wages, tips, and other compensation
- **Tax Calculations**: Accurate federal, state, and local tax withholding calculations
- **Corrections**: Generate corrected W-2 forms (W-2c) when needed
- **PDF Generation**: Create formatted W-2 PDFs for all required copies (A, B, C, D, 1, 2)
- **Distribution Tracking**: Track distribution to employees via email, mail, or portal access

### 1099 Form Generation
- **1099-NEC**: Nonemployee compensation for contractors and freelancers
- **1099-MISC**: Miscellaneous income for various payment types
- **Threshold Detection**: Automatically identify vendors requiring 1099s based on IRS thresholds
- **TIN Validation**: Validate taxpayer identification numbers
- **Payment Categorization**: Properly categorize payments by type (rent, legal, medical, etc.)
- **Multi-Form Support**: Generate multiple 1099 types for the same vendor if needed

### Transmittal Forms
- **W-3 Generation**: Automatic W-3 transmittal for W-2 submissions to SSA
- **1096 Generation**: Automatic 1096 transmittal for 1099 submissions to IRS
- **Totals Calculation**: Automatic calculation of totals across all forms

### E-Filing Support
- **SSA Submission**: Prepare W-2/W-3 forms for electronic submission to Social Security Administration
- **IRS Submission**: Prepare 1099/1096 forms for electronic submission to IRS
- **Validation**: Pre-submission validation to ensure compliance

## API Endpoints

### W-2 Management
```
GET /taxes/year-end/w2-forms/                    # List W-2 forms
POST /taxes/year-end/w2-forms/generate_year/     # Generate W-2s for tax year
GET /taxes/year-end/w2-forms/{id}/download_pdf/  # Download W-2 PDF
POST /taxes/year-end/w2-forms/{id}/distribute/   # Mark as distributed
POST /taxes/year-end/w2-forms/{id}/correct/      # Create corrected W-2
```

### 1099 Management
```
GET /taxes/year-end/1099-forms/                          # List 1099 forms
POST /taxes/year-end/1099-forms/generate_year/           # Generate 1099s
GET /taxes/year-end/1099-forms/vendors_requiring_1099/   # List vendors requiring 1099
GET /taxes/year-end/1099-forms/{id}/download_pdf/        # Download 1099 PDF
```

### Generation Tracking
```
GET /taxes/year-end/generation/              # List generation batches
POST /taxes/year-end/generation/generate_all/ # Generate all year-end forms
```

## Database Models

### W2Form
Stores W-2 form data for each employee including:
- Wages, tips, and other compensation
- Federal, state, and local tax withholdings
- Social Security and Medicare wages and taxes
- Box 12 coded items (401k, insurance, etc.)
- State and local tax information
- Distribution and e-filing status

### Form1099NEC / Form1099MISC
Stores 1099 form data for vendors including:
- Recipient information and TIN
- Payment amounts by category
- Tax withholdings
- State tax information
- Correction and void flags

### YearEndTaxGeneration
Tracks batch generation jobs including:
- Generation type (W-2, 1099, or all)
- Status and progress
- Form counts and statistics
- Error messages and completion times

## Usage Examples

### Generate All Year-End Forms
```python
from taxes.year_end.w2_generator import W2Generator
from taxes.year_end.form1099_generator import Form1099Generator

# Generate W-2s
w2_generator = W2Generator(tenant_id=123, tax_year=2023)
w2_data = w2_generator.generate_all_w2s()

# Generate 1099s
form1099_generator = Form1099Generator(tenant_id=123, tax_year=2023)
forms_data = form1099_generator.generate_all_1099s()
```

### Check Vendors Requiring 1099s
```python
generator = Form1099Generator(tenant_id=123, tax_year=2023)
vendors = generator.get_vendors_requiring_1099()

for vendor in vendors:
    print(f"{vendor['name']}: ${vendor['total_payments']:,.2f}")
    print(f"Forms required: {', '.join(vendor['forms_required'])}")
```

### Generate PDF Forms
```python
# Generate W-2 PDF
w2_pdf = w2_generator.generate_w2_pdf(w2_data)

# Generate 1099 PDF
form1099_pdf = form1099_generator.generate_1099_pdf(form_data)

# Generate transmittal forms
w3_pdf = w2_generator.generate_w3_transmittal(w2_data_list)
form1096_pdf = form1099_generator.generate_1096_transmittal(forms_data)
```

## Frontend Components

### YearEndTaxDashboard
Main dashboard showing:
- Year-end tax statistics and summaries
- Important filing deadlines
- Quick action buttons
- Tab navigation to detailed management

### W2Management
Comprehensive W-2 form management:
- Generate W-2s for all employees
- View and filter generated forms
- Download individual or bulk PDFs
- Distribute forms to employees
- Create corrected W-2s

### Form1099Management
Complete 1099 form management:
- View vendors requiring 1099s
- Generate 1099-NEC and 1099-MISC forms
- Manage generated forms
- Download and distribute forms

### GenerationHistory
Track generation batches:
- View generation history
- Monitor progress of active generations
- View detailed statistics
- Error reporting and troubleshooting

## Compliance Features

### IRS Requirements
- **Form Accuracy**: Ensures all forms meet IRS specifications
- **Deadline Tracking**: Built-in awareness of filing deadlines
- **Threshold Compliance**: Automatic application of IRS reporting thresholds
- **TIN Validation**: Validates taxpayer identification numbers

### Security
- **Tenant Isolation**: All data is strictly isolated by tenant
- **Audit Logging**: Complete audit trail of all form generation and distribution
- **Access Control**: Role-based access to tax form functionality
- **Data Encryption**: Sensitive tax data is properly encrypted

### Multi-State Support
- **State Tax Handling**: Proper calculation and reporting of state taxes
- **Local Tax Support**: Support for local and municipal taxes
- **Reciprocity Rules**: Handles state reciprocity agreements

## Error Handling

The system includes comprehensive error handling for:
- Missing employee or vendor data
- Invalid tax calculations
- PDF generation failures
- Distribution errors
- E-filing validation issues

## Testing

### Management Command
```bash
python manage.py setup_year_end_tax_tables --verify-only
```

### API Testing
```bash
# Test W-2 generation
curl -X POST /taxes/year-end/w2-forms/generate_year/ \
  -d '{"tax_year": 2023}' \
  -H "Content-Type: application/json"

# Test 1099 vendor identification
curl /taxes/year-end/1099-forms/vendors_requiring_1099/?tax_year=2023
```

## Installation

1. **Database Migration**: Run Django migrations to create tables
2. **Dependencies**: Ensure reportlab is installed for PDF generation
3. **Configuration**: Set up tax settings and business information
4. **Testing**: Use management command to verify setup

## Support

For issues or questions:
- Check the Django admin for error logs
- Review generation history for failed batches
- Validate business and employee data completeness
- Ensure proper tenant isolation is maintained