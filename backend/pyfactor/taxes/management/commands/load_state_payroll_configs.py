"""
Management command to load initial state payroll configurations
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from decimal import Decimal
from taxes.models import StatePayrollConfiguration


class Command(BaseCommand):
    help = 'Load 2024 state payroll tax configurations'

    def handle(self, *args, **options):
        year = 2024
        
        configs = [
            {
                'state_code': 'CA',
                'year': year,
                'sui_wage_base': Decimal('7000'),
                'sui_new_employer_rate': Decimal('0.034'),
                'sui_minimum_rate': Decimal('0.014'),
                'sui_maximum_rate': Decimal('0.063'),
                'has_sdi': True,
                'sdi_wage_base': Decimal('153164'),
                'sdi_employee_rate': Decimal('0.009'),
                'sdi_employer_rate': Decimal('0'),
                'has_fli': False,
                'quarterly_filing_required': True,
                'monthly_deposit_threshold': Decimal('500'),
                'other_taxes': {
                    'ETT': {
                        'name': 'Employment Training Tax',
                        'rate': Decimal('0.001'),
                        'wage_base': Decimal('7000')
                    }
                }
            },
            {
                'state_code': 'NY',
                'year': year,
                'sui_wage_base': Decimal('12300'),
                'sui_new_employer_rate': Decimal('0.04125'),
                'sui_minimum_rate': Decimal('0.0065'),
                'sui_maximum_rate': Decimal('0.0925'),
                'has_sdi': True,
                'sdi_wage_base': Decimal('120000'),  # Approximate
                'sdi_employee_rate': Decimal('0.005'),
                'sdi_employer_rate': Decimal('0'),
                'has_fli': True,
                'fli_wage_base': Decimal('79056'),
                'fli_employee_rate': Decimal('0.00455'),
                'fli_employer_rate': Decimal('0'),
                'quarterly_filing_required': True,
                'monthly_deposit_threshold': Decimal('700'),
                'other_taxes': {
                    'MCTMT': {
                        'name': 'Metropolitan Commuter Transportation Mobility Tax',
                        'rate': Decimal('0.0034'),
                        'applies_to': 'NYC metro area employers'
                    }
                }
            },
            {
                'state_code': 'TX',
                'year': year,
                'sui_wage_base': Decimal('9000'),
                'sui_new_employer_rate': Decimal('0.0270'),
                'sui_minimum_rate': Decimal('0.0023'),
                'sui_maximum_rate': Decimal('0.0623'),
                'has_sdi': False,
                'has_fli': False,
                'quarterly_filing_required': True,
                'monthly_deposit_threshold': Decimal('500')
            },
            {
                'state_code': 'FL',
                'year': year,
                'sui_wage_base': Decimal('7000'),
                'sui_new_employer_rate': Decimal('0.0270'),
                'sui_minimum_rate': Decimal('0.0010'),
                'sui_maximum_rate': Decimal('0.0540'),
                'has_sdi': False,
                'has_fli': False,
                'quarterly_filing_required': True,
                'monthly_deposit_threshold': Decimal('500')
            },
            {
                'state_code': 'PA',
                'year': year,
                'sui_wage_base': Decimal('10000'),
                'sui_new_employer_rate': Decimal('0.03689'),
                'sui_minimum_rate': Decimal('0.0065'),
                'sui_maximum_rate': Decimal('0.1121'),
                'has_sdi': False,
                'has_fli': False,
                'quarterly_filing_required': True,
                'monthly_deposit_threshold': Decimal('300'),
                'other_taxes': {
                    'SUTA_EMPLOYEE': {
                        'name': 'Employee SUTA Contribution',
                        'rate': Decimal('0.0006'),
                        'wage_base': Decimal('10000')
                    }
                },
                'reciprocity_states': ['IN', 'MD', 'NJ', 'OH', 'VA', 'WV']
            },
            {
                'state_code': 'IL',
                'year': year,
                'sui_wage_base': Decimal('13590'),
                'sui_new_employer_rate': Decimal('0.03325'),
                'sui_minimum_rate': Decimal('0.00275'),
                'sui_maximum_rate': Decimal('0.07975'),
                'has_sdi': False,
                'has_fli': False,
                'quarterly_filing_required': True,
                'monthly_deposit_threshold': Decimal('1000'),
                'other_taxes': {
                    'UI_FUND_BUILDING': {
                        'name': 'UI Fund Building Rate',
                        'rate': Decimal('0.00055'),
                        'wage_base': Decimal('13590')
                    }
                },
                'reciprocity_states': ['IA', 'KY', 'MI', 'WI']
            }
        ]
        
        created_count = 0
        updated_count = 0
        
        for config_data in configs:
            config, created = StatePayrollConfiguration.objects.update_or_create(
                state_code=config_data['state_code'],
                year=config_data['year'],
                defaults=config_data
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Created config for {config_data['state_code']} {year}"
                    )
                )
            else:
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(
                        f"Updated config for {config_data['state_code']} {year}"
                    )
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f"Total: {created_count} created, {updated_count} updated"
            )
        )