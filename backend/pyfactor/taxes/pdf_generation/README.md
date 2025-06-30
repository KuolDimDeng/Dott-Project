# PDF Tax Form Generation System

A comprehensive PDF form generation system for tax filings using ReportLab, designed for the Dott tax management application.

## Features

- Generate fillable PDF forms for common tax forms (941, 940, state sales tax)
- Template system with field mapping and validation
- Dynamic field population from Django models
- Barcode and QR code generation for tracking
- Draft watermarks and digital signature placeholders
- Form attachments and schedules support
- Filing confirmation pages
- Bulk form generation
- API endpoints for integration

## Installation

1. Install required dependencies:
```bash
pip install -r taxes/pdf_generation/requirements.txt
```

2. Add to Django URLs:
```python
# In taxes/urls.py
path('pdf/', include('taxes.pdf_generation.urls')),
```

## API Endpoints

### Generate PDF Form
```
POST /api/taxes/pdf/generate/
```

Request body:
```json
{
    "form_type": "941",
    "filing_period": "2023-Q4",
    "is_draft": true,
    "form_data": {
        "business_name": "Test Business Inc.",
        "ein": "12-3456789",
        "address": "123 Business St",
        "city": "Test City",
        "state": "CA",
        "zip": "90210",
        "num_employees": 5,
        "total_wages": 50000.00,
        "federal_tax_withheld": 7500.00
    }
}
```

### Form Preview
```
POST /api/taxes/pdf/preview/
```

### Form Validation
```
POST /api/taxes/pdf/validate/
```

### Filing Confirmation
```
POST /api/taxes/pdf/confirmation/
```

### Bulk Generation
```
POST /api/taxes/pdf/bulk/
```

## Supported Form Types

### Form 941 - Employer's Quarterly Federal Tax Return
- Quarterly payroll tax reporting
- Employee wage and tax withholding data
- Monthly deposit schedule tracking
- Social Security and Medicare tax calculations

### Form 940 - Employer's Annual Federal Unemployment Tax Return
- Annual FUTA tax reporting
- State unemployment tax tracking
- Multi-state filing support
- Credit reduction handling

### State Sales Tax Returns
- State-specific sales tax forms
- Multiple location support
- Use tax calculations
- Exempt sales tracking

## Usage Examples

### Basic Form Generation
```python
from taxes.pdf_generation.form_generator import TaxFormGenerator
from taxes.pdf_generation.form_templates import Form941Template

# Prepare form data
template = Form941Template()
form_data = {
    'business_name': 'My Business',
    'ein': '12-3456789',
    'total_wages': 50000.00,
    # ... other fields
}

# Validate data
errors = template.validate_data(form_data)
if not errors:
    prepared_data = template.prepare_data(form_data)
    
    # Generate PDF
    generator = TaxFormGenerator('941', '2023-Q4', is_draft=True)
    pdf_bytes = generator.generate_form(prepared_data)
    
    # Save to file
    with open('form_941_2023_Q4.pdf', 'wb') as f:
        f.write(pdf_bytes)
```

### API Usage
```python
import requests

# Generate Form 941
response = requests.post('http://localhost:8000/api/taxes/pdf/generate/', json={
    'form_type': '941',
    'filing_period': '2023-Q4',
    'is_draft': True,
    'form_data': {
        'business_name': 'Test Business',
        'ein': '12-3456789',
        'total_wages': 50000.00,
        'federal_tax_withheld': 7500.00,
        'num_employees': 5
    }
})

if response.status_code == 200:
    with open('generated_form.pdf', 'wb') as f:
        f.write(response.content)
```

### Management Command Testing
```bash
# Test Form 941 generation
python manage.py test_pdf_generation --form-type=941 --output-dir=/tmp/test_forms

# Test State Sales Tax form
python manage.py test_pdf_generation --form-type=STATE_SALES_CA --draft

# Test Form 940
python manage.py test_pdf_generation --form-type=940 --output-dir=/home/user/forms
```

## Configuration

The system can be configured via `taxes/pdf_generation/config.py`:

```python
# Override in Django settings
PDF_GENERATION_SETTINGS = {
    'DEFAULT_PAGE_SIZE': 'A4',
    'WATERMARK': {
        'DRAFT_TEXT': 'PRELIMINARY',
        'DRAFT_FONT_SIZE': 60
    },
    'SECURITY': {
        'ENABLE_PASSWORD_PROTECTION': True,
        'DEFAULT_USER_PASSWORD': 'user123'
    }
}
```

## Form Templates

### Adding New Form Types

1. Create template class:
```python
class CustomFormTemplate:
    @staticmethod
    def get_field_mapping():
        return {
            'field_name': {
                'pdf_field': 'pdf_field_name',
                'required': True,
                'type': 'currency',
                'formatter': FormFieldMapper.format_currency
            }
        }
    
    @staticmethod
    def validate_data(data):
        # Validation logic
        return []
    
    @staticmethod
    def prepare_data(raw_data):
        # Data preparation logic
        return prepared_data
```

2. Register template:
```python
from taxes.pdf_generation.form_templates import FormTemplateRegistry
FormTemplateRegistry.register_template('CUSTOM_FORM', CustomFormTemplate)
```

## Security Features

- Password protection for sensitive forms
- Digital signature placeholders
- Form integrity checksums
- Draft watermarks for non-final versions
- Tracking codes for audit trails

## Error Handling

The system provides comprehensive error handling:

```python
try:
    pdf_bytes = generator.generate_form(data)
except ValidationError as e:
    print(f"Validation errors: {e.errors}")
except Exception as e:
    print(f"Generation error: {e}")
```

## Performance Considerations

- Forms are generated in-memory for speed
- Template caching for repeated generations
- Bulk generation support for multiple forms
- Configurable timeouts and limits
- Asynchronous generation for large batches

## File Structure

```
taxes/pdf_generation/
├── __init__.py
├── form_generator.py      # Main PDF generation logic
├── form_templates.py      # Form templates and field mappings
├── views.py              # Django API views
├── urls.py               # URL configuration
├── utils.py              # Utility functions
├── config.py             # Configuration settings
├── requirements.txt      # Dependencies
└── README.md             # This file
```

## Testing

Run the test command to verify installation:

```bash
python manage.py test_pdf_generation --form-type=941
```

This will generate test PDFs in `/tmp` and validate the system is working correctly.

## Dependencies

- **ReportLab**: Core PDF generation
- **PyPDF2**: PDF manipulation and merging
- **Pillow**: Image processing for barcodes
- **qrcode**: QR code generation
- **cryptography**: PDF security features

## Troubleshooting

### Common Issues

1. **Missing fonts**: Ensure system has required fonts installed
2. **Large PDFs**: Increase timeout settings for complex forms
3. **Memory issues**: Use bulk generation for multiple forms
4. **Permission errors**: Check output directory permissions

### Debug Mode

Enable debug mode in settings for detailed error information:

```python
PDF_GENERATION_SETTINGS = {
    'DEBUG': {
        'SAVE_INTERMEDIATE_FILES': True,
        'VERBOSE_ERRORS': True
    }
}
```