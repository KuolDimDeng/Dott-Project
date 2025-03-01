# taxes/tasks.py
from celery import shared_task
import requests
from bs4 import BeautifulSoup
import logging
import csv
from io import StringIO
from datetime import datetime
from decimal import Decimal

from .models import State, IncomeTaxRate

logger = logging.getLogger(__name__)

@shared_task
def update_federal_tax_rates():
    """Update federal tax rates from IRS data"""
    # In a real implementation, this would scrape from IRS.gov or use another data source
    # This is a simplified example
    try:
        logger.info("Starting federal tax rate update job")
        
        # Federal tax brackets for 2023 (example)
        # In a real implementation, you would fetch this data from an external source
        federal_brackets = [
            {'filing_status': 'single', 'income_min': 0, 'income_max': 11000, 'rate': 0.10},
            {'filing_status': 'single', 'income_min': 11000, 'income_max': 44725, 'rate': 0.12},
            {'filing_status': 'single', 'income_min': 44725, 'income_max': 95375, 'rate': 0.22},
            {'filing_status': 'single', 'income_min': 95375, 'income_max': 182100, 'rate': 0.24},
            {'filing_status': 'single', 'income_min': 182100, 'income_max': 231250, 'rate': 0.32},
            {'filing_status': 'single', 'income_min': 231250, 'income_max': 578125, 'rate': 0.35},
            {'filing_status': 'single', 'income_min': 578125, 'income_max': None, 'rate': 0.37},
            
            {'filing_status': 'married_joint', 'income_min': 0, 'income_max': 22000, 'rate': 0.10},
            {'filing_status': 'married_joint', 'income_min': 22000, 'income_max': 89450, 'rate': 0.12},
            {'filing_status': 'married_joint', 'income_min': 89450, 'income_max': 190750, 'rate': 0.22},
            {'filing_status': 'married_joint', 'income_min': 190750, 'income_max': 364200, 'rate': 0.24},
            {'filing_status': 'married_joint', 'income_min': 364200, 'income_max': 462500, 'rate': 0.32},
            {'filing_status': 'married_joint', 'income_min': 462500, 'income_max': 693750, 'rate': 0.35},
            {'filing_status': 'married_joint', 'income_min': 693750, 'income_max': None, 'rate': 0.37},
        ]
        
        # Store this in a special "Federal" state object
        federal_state, created = State.objects.get_or_create(
            code='US',
            defaults={
                'name': 'Federal',
                'country': 'US',
                'is_active': True,
                'full_service_enabled': True,
                'e_file_supported': True
            }
        )
        
        current_year = datetime.now().year
        updated_count = 0
        
        for bracket in federal_brackets:
            # Check if this bracket already exists
            existing = IncomeTaxRate.objects.filter(
                state=federal_state,
                tax_year=current_year,
                filing_status=bracket['filing_status'],
                income_min=bracket['income_min']
            ).first()
            
            if existing:
                # Update if rate has changed
                if existing.rate_value != Decimal(str(bracket['rate'])):
                    existing.rate_value = Decimal(str(bracket['rate']))
                    existing.save()
                    updated_count += 1
            else:
                # Create new bracket
                IncomeTaxRate.objects.create(
                    state=federal_state,
                    tax_year=current_year,
                    filing_status=bracket['filing_status'],
                    is_flat_rate=False,
                    rate_value=Decimal(str(bracket['rate'])),
                    income_min=bracket['income_min'],
                    income_max=bracket['income_max'],
                    effective_date=datetime(current_year, 1, 1).date()
                )
                updated_count += 1
        
        logger.info(f"Federal tax rate update completed. Updated {updated_count} brackets.")
        return f"Updated {updated_count} federal tax brackets"
        
    except Exception as e:
        logger.error(f"Error updating federal tax rates: {str(e)}")
        raise

@shared_task
def update_state_tax_rates():
    """Update state tax rates for flat-rate states"""
    try:
        logger.info("Starting state tax rate update job")
        
        # Flat tax rate states for 2023 (example)
        # In a real implementation, you would fetch this data from state websites or other sources
        flat_tax_states = [
            {'code': 'AZ', 'rate': 0.025},
            {'code': 'CO', 'rate': 0.044},
            {'code': 'IL', 'rate': 0.0495},
            {'code': 'IN', 'rate': 0.0323},
            {'code': 'KY', 'rate': 0.045},
            {'code': 'MA', 'rate': 0.05},
            {'code': 'MI', 'rate': 0.0425},
            {'code': 'NC', 'rate': 0.045},
            {'code': 'PA', 'rate': 0.0307},
            {'code': 'UT', 'rate': 0.0485}
        ]
        
        current_year = datetime.now().year
        updated_count = 0
        
        for state_data in flat_tax_states:
            try:
                state = State.objects.get(code=state_data['code'])
                
                # Update or create flat tax rate for all filing statuses
                for filing_status in ['single', 'married_joint', 'married_separate', 'head_household']:
                    existing = IncomeTaxRate.objects.filter(
                        state=state,
                        tax_year=current_year,
                        filing_status=filing_status
                    ).first()
                    
                    if existing:
                        # Update if rate has changed
                        if existing.rate_value != Decimal(str(state_data['rate'])):
                            existing.rate_value = Decimal(str(state_data['rate']))
                            existing.save()
                            updated_count += 1
                    else:
                        # Create new rate
                        IncomeTaxRate.objects.create(
                            state=state,
                            tax_year=current_year,
                            filing_status=filing_status,
                            is_flat_rate=True,
                            rate_value=Decimal(str(state_data['rate'])),
                            effective_date=datetime(current_year, 1, 1).date()
                        )
                        updated_count += 1
                        
            except State.DoesNotExist:
                logger.warning(f"State with code {state_data['code']} not found")
        
        logger.info(f"State tax rate update completed. Updated {updated_count} rates.")
        return f"Updated {updated_count} state tax rates"
        
    except Exception as e:
        logger.error(f"Error updating state tax rates: {str(e)}")
        raise

@shared_task
def update_global_tax_information():
    """Update tax information for all active jurisdictions"""
    try:
        states = State.objects.filter(is_active=True)
        updated_count = 0
        
        for state in states:
            # Only update if it's been more than the compliance_check_frequency days
            if (not state.compliance_last_checked or 
                timezone.now() - state.compliance_last_checked > timedelta(days=state.compliance_check_frequency)):
                
                if update_jurisdiction_tax_information(state):
                    updated_count += 1
        
        return f"Updated tax information for {updated_count} jurisdictions"
    except Exception as e:
        logger.error(f"Error updating global tax information: {str(e)}")
        raise

def update_jurisdiction_tax_information(jurisdiction):
    """Update tax information for a specific jurisdiction"""
    try:
        # Get compliance requirements
        compliance_data = ClaudeComplianceService.get_country_compliance_requirements(jurisdiction.country.code)
        
        if compliance_data:
            # Update service type recommendation if applicable
            if compliance_data.get('service_level_recommendation'):
                jurisdiction.service_type = compliance_data['service_level_recommendation']
            
            jurisdiction.compliance_last_checked = timezone.now()
            jurisdiction.save()
            
            # Get tax rates
            tax_rates_data = ClaudeComplianceService.get_tax_rates(
                jurisdiction.country.code, 
                jurisdiction.code if jurisdiction.country.code == 'US' else None,
                timezone.now().year
            )
            
            if tax_rates_data and tax_rates_data.get('income_tax'):
                # Update tax rates
                from .models import IncomeTaxRate
                
                # Create or update tax rates
                for rate_data in tax_rates_data['income_tax']:
                    IncomeTaxRate.objects.update_or_create(
                        state=jurisdiction,
                        tax_year=tax_rates_data['tax_year'],
                        filing_status=rate_data.get('filing_status', 'single'),
                        income_min=rate_data.get('min'),
                        defaults={
                            'income_max': rate_data.get('max'),
                            'rate_value': rate_data['rate'],
                            'is_flat_rate': tax_rates_data.get('is_flat_rate', False),
                            'effective_date': timezone.now().date(),
                            'manual_override': False
                        }
                    )
                
                return True
        
        return False
    except Exception as e:
        logger.error(f"Error updating jurisdiction {jurisdiction.code}: {str(e)}")
        return False