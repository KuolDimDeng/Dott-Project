from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal

from taxes.efiling.state_handlers import get_state_handler
from taxes.efiling.sales_tax_calculator import SalesTaxCalculator
from taxes.models import State


class Command(BaseCommand):
    help = 'Test e-filing implementation for the top 20 states'

    def add_arguments(self, parser):
        parser.add_argument(
            '--state',
            type=str,
            help='State code to test (e.g., CA, TX)',
        )
        parser.add_argument(
            '--tenant-id',
            type=str,
            default='test-tenant-001',
            help='Tenant ID for testing',
        )

    def handle(self, *args, **options):
        state_code = options.get('state')
        tenant_id = options['tenant_id']
        
        if state_code:
            self.test_single_state(state_code.upper(), tenant_id)
        else:
            self.test_all_states(tenant_id)

    def test_single_state(self, state_code, tenant_id):
        self.stdout.write(f"\nTesting {state_code} e-filing implementation...\n")
        
        # Test state handler
        handler = get_state_handler(state_code)
        if not handler:
            self.stdout.write(self.style.ERROR(f"No handler found for {state_code}"))
            return
            
        # Test filing frequency
        revenues = [Decimal('50000'), Decimal('250000'), Decimal('1500000')]
        self.stdout.write(f"\nFiling Frequency Thresholds:")
        for revenue in revenues:
            frequency = handler.get_filing_frequency(revenue)
            self.stdout.write(f"  Annual revenue ${revenue:,.0f}: {frequency}")
            
        # Test form requirements
        form_reqs = handler.get_form_requirements()
        self.stdout.write(f"\nForm Requirements:")
        self.stdout.write(f"  Form Number: {form_reqs['form_number']}")
        self.stdout.write(f"  Form Name: {form_reqs['form_name']}")
        self.stdout.write(f"  E-file Formats: {', '.join(form_reqs.get('efile_formats', []))}")
        
        # Test due date calculation
        period_end = date.today().replace(day=1) - timedelta(days=1)  # Last day of previous month
        due_date = handler.calculate_due_date(period_end)
        self.stdout.write(f"\nDue Date Calculation:")
        self.stdout.write(f"  Period End: {period_end}")
        self.stdout.write(f"  Due Date: {due_date}")
        
        # Test validation
        test_data = {
            'gross_sales': Decimal('10000'),
            'taxable_sales': Decimal('8000'),
            'tax_collected': Decimal('500'),
            'seller_permit_number': '123-456789',  # CA format
            'taxpayer_number': '12345678901',  # TX format
            'certificate_number': '12-12345678901-1',  # FL format
            'dealer_account_number': '12-123456',  # VA format
            'sales_tax_number': '123456789',  # GA format
            'account_id': '1234-5678',  # IL format
            'vendor_license': '12345678',  # OH format
            'certificate_of_authority': '12345678',  # NY format
            'sales_tax_license': '12345678',  # PA format
            'district_taxes': [{'district': 'Test', 'amount': 50}]  # CA requirement
        }
        
        is_valid, errors = handler.validate_filing_data(test_data)
        self.stdout.write(f"\nValidation Test:")
        self.stdout.write(f"  Valid: {is_valid}")
        if errors:
            self.stdout.write(f"  Errors: {', '.join(errors)}")
            
        # Test API endpoints
        endpoints = handler.get_api_endpoints()
        self.stdout.write(f"\nAPI Endpoints:")
        for name, url in endpoints.items():
            self.stdout.write(f"  {name}: {url}")
            
        # Test sales tax calculator
        try:
            calculator = SalesTaxCalculator(tenant_id, state_code)
            self.stdout.write(f"\nSales Tax Calculator:")
            self.stdout.write(f"  Base Tax Rate: {handler.tax_rate_base:.2%}")
            
            # Test filing checklist
            checklist = calculator.get_filing_checklist()
            self.stdout.write(f"\nFiling Checklist:")
            for item in checklist[:3]:  # Show first 3 items
                req = "Required" if item['required'] else "Optional"
                self.stdout.write(f"  - {item['item']} ({req})")
                
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"  Calculator test skipped: {str(e)}"))

    def test_all_states(self, tenant_id):
        state_codes = ['CA', 'TX', 'FL', 'NY', 'PA', 'IL', 'OH', 'NC', 'GA', 'NJ',
                      'VA', 'WA', 'MA', 'AZ', 'MD', 'MI', 'TN', 'IN', 'WI', 'CO']
        
        self.stdout.write(self.style.SUCCESS("\n=== E-Filing Implementation Test for Top 20 States ===\n"))
        
        summary = []
        
        for state_code in state_codes:
            handler = get_state_handler(state_code)
            if handler:
                form_reqs = handler.get_form_requirements()
                # Test with medium revenue
                frequency = handler.get_filing_frequency(Decimal('500000'))
                
                summary.append({
                    'state': state_code,
                    'name': handler.state_name,
                    'form': form_reqs['form_number'],
                    'frequency': frequency,
                    'rate': f"{handler.tax_rate_base:.2%}",
                    'due_day': handler.calculate_due_date(date.today()).day
                })
                self.stdout.write(self.style.SUCCESS(f"✓ {state_code} - {handler.state_name}"))
            else:
                self.stdout.write(self.style.ERROR(f"✗ {state_code} - No handler"))
                
        # Print summary table
        self.stdout.write("\n\n=== Summary Table ===\n")
        self.stdout.write(f"{'State':<6} {'Name':<15} {'Form':<15} {'Rate':<8} {'Frequency':<10} {'Due Day'}")
        self.stdout.write("-" * 75)
        
        for s in summary:
            self.stdout.write(
                f"{s['state']:<6} {s['name']:<15} {s['form']:<15} "
                f"{s['rate']:<8} {s['frequency']:<10} {s['due_day']}"
            )
            
        # Test State model integration
        self.stdout.write("\n\n=== Testing State Model Integration ===\n")
        states_in_db = State.objects.filter(code__in=state_codes, e_file_supported=True).count()
        self.stdout.write(f"States with e-filing enabled in database: {states_in_db}/{len(state_codes)}")
        
        # Show a sample state configuration
        try:
            ca_state = State.objects.get(code='CA')
            self.stdout.write(f"\nSample Configuration (California):")
            self.stdout.write(f"  E-file API URL: {ca_state.e_file_api_base_url}")
            self.stdout.write(f"  Base Tax Rate: {ca_state.base_tax_rate:.2%}")
            self.stdout.write(f"  Form Number: {ca_state.form_number}")
            self.stdout.write(f"  Has District Taxes: {ca_state.has_district_taxes}")
        except State.DoesNotExist:
            self.stdout.write(self.style.WARNING("  California state not found in database"))