from django.core.management.base import BaseCommand
from django.utils import timezone
from taxes.pdf_generation.form_generator import TaxFormGenerator
from taxes.pdf_generation.form_templates import Form941Template, Form940Template, StateSalesTaxTemplate
import os


class Command(BaseCommand):
    help = 'Test PDF form generation system'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--form-type',
            type=str,
            default='941',
            help='Form type to test (941, 940, STATE_SALES_CA)'
        )
        parser.add_argument(
            '--output-dir',
            type=str,
            default='/tmp',
            help='Output directory for generated PDFs'
        )
        parser.add_argument(
            '--draft',
            action='store_true',
            help='Generate as draft with watermark'
        )
    
    def handle(self, *args, **options):
        form_type = options['form_type']
        output_dir = options['output_dir']
        is_draft = options['draft']
        
        self.stdout.write(f'Testing PDF generation for form type: {form_type}')
        
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        # Generate test data based on form type
        if form_type == '941':
            test_data = self.get_941_test_data()
        elif form_type == '940':
            test_data = self.get_940_test_data()
        elif form_type.startswith('STATE_SALES_'):
            test_data = self.get_state_sales_test_data()
        else:
            self.stdout.write(self.style.ERROR(f'Unknown form type: {form_type}'))
            return
        
        try:
            # Create generator
            filing_period = "2023-Q4" if form_type in ['941'] else "2023"
            generator = TaxFormGenerator(form_type, filing_period, is_draft)
            
            # Generate PDF
            output_path = os.path.join(output_dir, f'test_{form_type}_{filing_period}.pdf')
            
            self.stdout.write('Generating PDF...')
            pdf_bytes = generator.generate_form(test_data)
            
            # Save to file
            with open(output_path, 'wb') as f:
                f.write(pdf_bytes)
            
            self.stdout.write(
                self.style.SUCCESS(f'Successfully generated PDF: {output_path}')
            )
            
            # Test validation
            self.stdout.write('Testing form validation...')
            if form_type == '941':
                template = Form941Template()
                errors = template.validate_data(test_data)
            elif form_type == '940':
                template = Form940Template()
                errors = template.validate_data(test_data)
            elif form_type.startswith('STATE_SALES_'):
                template = StateSalesTaxTemplate()
                state_code = form_type.replace('STATE_SALES_', '')
                errors = template.validate_data(test_data, state_code)
            
            if errors:
                self.stdout.write(self.style.WARNING('Validation errors found:'))
                for error in errors:
                    self.stdout.write(f'  - {error}')
            else:
                self.stdout.write(self.style.SUCCESS('Form data validation passed'))
            
            # Test confirmation page
            self.stdout.write('Testing filing confirmation...')
            confirmation_data = test_data.copy()
            confirmation_data.update({
                'tracking_number': f'TEST-{form_type}-{timezone.now().strftime("%Y%m%d%H%M%S")}',
                'amount_due': 1234.56,
                'payment_status': 'Pending'
            })
            
            confirmation_pdf = generator.generate_filing_confirmation(confirmation_data)
            confirmation_path = os.path.join(output_dir, f'test_confirmation_{form_type}.pdf')
            
            with open(confirmation_path, 'wb') as f:
                f.write(confirmation_pdf)
            
            self.stdout.write(
                self.style.SUCCESS(f'Successfully generated confirmation: {confirmation_path}')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error generating PDF: {str(e)}')
            )
            import traceback
            self.stdout.write(traceback.format_exc())
    
    def get_941_test_data(self):
        """Get test data for Form 941"""
        return {
            'business_name': 'Test Business Inc.',
            'ein': '12-3456789',
            'address': '123 Business St',
            'city': 'Test City',
            'state': 'CA',
            'zip': '90210',
            'quarter': 4,
            'year': 2023,
            'num_employees': 5,
            'total_wages': 50000.00,
            'federal_tax_withheld': 7500.00,
            'ss_wages': 50000.00,
            'ss_tax': 6200.00,  # 50000 * 0.124
            'medicare_wages': 50000.00,
            'medicare_tax': 1450.00,  # 50000 * 0.029
            'deposit_schedule': 'monthly',
            'month1_liability': 5000.00,
            'month2_liability': 5200.00,
            'month3_liability': 4800.00,
            'total_liability': 15000.00,
            'no_wages_subject': False
        }
    
    def get_940_test_data(self):
        """Get test data for Form 940"""
        return {
            'business_name': 'Test Business Inc.',
            'ein': '12-3456789',
            'address': '123 Business St',
            'city': 'Test City',
            'state': 'CA',
            'zip': '90210',
            'year': 2023,
            'single_state': 'CA',
            'multi_state': False,
            'credit_reduction': False,
            'total_payments': 150000.00,
            'exempt_payments': 10000.00,
            'excess_payments': 105000.00,  # 15 employees * 7000 = 105000 excess
            'subtotal_exempt': 115000.00,  # 10000 + 105000
            'taxable_wages': 35000.00,  # 150000 - 115000
            'futa_tax': 210.00  # 35000 * 0.006
        }
    
    def get_state_sales_test_data(self):
        """Get test data for state sales tax form"""
        return {
            'business_name': 'Test Retail Store',
            'ein': '12-3456789',
            'address': '456 Retail Ave',
            'city': 'Store City',
            'state': 'CA',
            'zip': '90211',
            'period': '2023-Q4',
            'gross_sales': 100000.00,
            'exempt_sales': 5000.00,
            'taxable_sales': 95000.00,
            'tax_rate': 7.25,
            'sales_tax_due': 6887.50,  # 95000 * 0.0725
            'use_tax_purchases': 2000.00,
            'use_tax_due': 145.00,  # 2000 * 0.0725
            'total_tax_due': 7032.50,  # 6887.50 + 145.00
            'credits': 100.00,
            'net_tax_due': 6932.50,  # 7032.50 - 100.00
            'location_breakdown': [
                {
                    'name': 'Main Store',
                    'taxable_sales': 70000.00,
                    'tax_rate': 7.25,
                    'tax_due': 5075.00
                },
                {
                    'name': 'Branch Store',
                    'taxable_sales': 25000.00,
                    'tax_rate': 7.25,
                    'tax_due': 1812.50
                }
            ]
        }