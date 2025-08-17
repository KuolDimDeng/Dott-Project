"""
Tax Rate Service
Fetches tax rates from GlobalSalesTaxRate and GlobalPayrollTax tables

This service is used by:
- POS module when calculating tax on sales
- Payroll module when calculating payroll taxes
- Invoice module when adding tax to invoices
"""
import logging
from decimal import Decimal
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class TaxRateService:
    """
    Service to fetch tax rates from global tax tables.
    These rates are populated from various sources and regularly updated.
    """
    
    def __init__(self):
        self.logger = logger
    
    def get_sales_tax_rate(
        self, 
        country: str, 
        state: Optional[str] = None, 
        county: Optional[str] = None,
        city: Optional[str] = None,
        postal_code: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get sales tax rate for a specific location from GlobalSalesTaxRate.
        
        Returns a dict with:
        - total_rate: Combined tax rate (decimal)
        - state_rate: State tax rate (decimal)
        - county_rate: County tax rate (decimal)
        - city_rate: City/local tax rate (decimal)
        - tax_type: Type of tax (sales_tax, vat, gst, etc.)
        - jurisdiction: Dict with location details
        """
        try:
            from taxes.models import GlobalSalesTaxRate
            
            # Start with country-level tax (VAT/GST for non-US countries)
            country_tax = GlobalSalesTaxRate.objects.filter(
                country=country,
                region_code='',
                locality='',
                is_current=True
            ).first()
            
            total_rate = Decimal('0')
            state_rate = Decimal('0')
            county_rate = Decimal('0')
            city_rate = Decimal('0')
            tax_type = 'sales_tax'
            
            if country_tax:
                total_rate = country_tax.rate
                tax_type = country_tax.tax_type
            
            # For US, get state, county, and city rates
            if country == 'US' and state:
                # State rate
                state_tax = GlobalSalesTaxRate.objects.filter(
                    country=country,
                    region_code=state,
                    locality='',
                    is_current=True
                ).first()
                
                if state_tax:
                    state_rate = state_tax.rate
                    total_rate = state_rate  # Reset for US (no federal sales tax)
                
                # County rate (additive)
                if county:
                    county_tax = GlobalSalesTaxRate.objects.filter(
                        country=country,
                        region_code=state,
                        locality=county,
                        is_current=True
                    ).first()
                    
                    if county_tax:
                        county_rate = county_tax.rate
                        total_rate += county_rate
                
                # City rate (additive)
                if city:
                    city_tax = GlobalSalesTaxRate.objects.filter(
                        country=country,
                        region_code=state,
                        locality=city,
                        is_current=True
                    ).first()
                    
                    if city_tax:
                        city_rate = city_tax.rate
                        total_rate += city_rate
            
            return {
                'total_rate': total_rate,
                'state_rate': state_rate,
                'county_rate': county_rate,
                'city_rate': city_rate,
                'tax_type': tax_type,
                'jurisdiction': {
                    'country': country,
                    'state': state,
                    'state_code': state,
                    'county': county,
                    'city': city,
                    'postal_code': postal_code
                }
            }
            
        except Exception as e:
            self.logger.error(f"Error fetching sales tax rate: {str(e)}")
            # Return default rates on error
            return {
                'total_rate': Decimal('0'),
                'state_rate': Decimal('0'),
                'county_rate': Decimal('0'),
                'city_rate': Decimal('0'),
                'tax_type': 'sales_tax',
                'jurisdiction': {
                    'country': country,
                    'state': state
                }
            }
    
    def get_payroll_tax_rates(
        self,
        country: str,
        state: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get payroll tax rates from GlobalPayrollTax table.
        
        Returns a dict with employer and employee rates for:
        - Social Security / Pension
        - Medicare / Healthcare
        - Unemployment Insurance
        - Federal/State Income Tax withholding
        """
        try:
            from taxes.models import GlobalPayrollTax
            
            # Get country-level payroll taxes
            country_tax = GlobalPayrollTax.objects.filter(
                country=country,
                region_code=''
            ).first()
            
            # Get state-level payroll taxes (if applicable)
            state_tax = None
            if state:
                state_tax = GlobalPayrollTax.objects.filter(
                    country=country,
                    region_code=state
                ).first()
            
            # Use state rates if available, otherwise country rates
            tax_source = state_tax if state_tax else country_tax
            
            if tax_source:
                return {
                    'employee_social_security_rate': tax_source.employee_social_security_rate,
                    'employer_social_security_rate': tax_source.employer_social_security_rate,
                    'employee_medicare_rate': tax_source.employee_medicare_rate,
                    'employer_medicare_rate': tax_source.employer_medicare_rate,
                    'employee_unemployment_rate': tax_source.employee_unemployment_rate,
                    'employer_unemployment_rate': tax_source.employer_unemployment_rate,
                    'employee_federal_income_rate': tax_source.employee_federal_income_rate,
                    'employee_state_income_rate': tax_source.employee_state_income_rate if state_tax else Decimal('0'),
                    'employee_other_rate': tax_source.employee_other_rate,
                    'employer_other_rate': tax_source.employer_other_rate,
                    'social_security_wage_limit': tax_source.social_security_wage_limit,
                    'medicare_additional_rate': tax_source.medicare_additional_rate,
                    'medicare_additional_threshold': tax_source.medicare_additional_threshold
                }
            else:
                # Return US defaults if no data found
                return self._get_default_payroll_rates()
                
        except Exception as e:
            self.logger.error(f"Error fetching payroll tax rates: {str(e)}")
            return self._get_default_payroll_rates()
    
    def _get_default_payroll_rates(self) -> Dict[str, Any]:
        """Return default US federal payroll tax rates"""
        return {
            'employee_social_security_rate': Decimal('0.062'),  # 6.2%
            'employer_social_security_rate': Decimal('0.062'),  # 6.2%
            'employee_medicare_rate': Decimal('0.0145'),  # 1.45%
            'employer_medicare_rate': Decimal('0.0145'),  # 1.45%
            'employee_unemployment_rate': Decimal('0'),
            'employer_unemployment_rate': Decimal('0.006'),  # 0.6% FUTA
            'employee_federal_income_rate': Decimal('0.22'),  # 22% default withholding
            'employee_state_income_rate': Decimal('0'),
            'employee_other_rate': Decimal('0'),
            'employer_other_rate': Decimal('0'),
            'social_security_wage_limit': Decimal('160200'),  # 2023 limit
            'medicare_additional_rate': Decimal('0.009'),  # 0.9% additional Medicare
            'medicare_additional_threshold': Decimal('200000')  # Single filer threshold
        }
    
    def calculate_sales_tax(
        self,
        amount: Decimal,
        country: str,
        state: Optional[str] = None,
        county: Optional[str] = None,
        city: Optional[str] = None,
        postal_code: Optional[str] = None,
        tax_inclusive: bool = False
    ) -> Dict[str, Any]:
        """
        Calculate sales tax for a given amount.
        
        Args:
            amount: The amount to calculate tax on
            country: Country code
            state: State/province code
            county: County name
            city: City name
            postal_code: Postal/ZIP code
            tax_inclusive: If True, amount already includes tax
        
        Returns:
            Dict with subtotal, tax_amount, total, and rate details
        """
        # Get the tax rate
        tax_info = self.get_sales_tax_rate(country, state, county, city, postal_code)
        total_rate = tax_info['total_rate']
        
        if tax_inclusive:
            # Amount includes tax, need to extract it
            subtotal = amount / (1 + total_rate)
            tax_amount = amount - subtotal
            total = amount
        else:
            # Amount doesn't include tax, need to add it
            subtotal = amount
            tax_amount = amount * total_rate
            total = amount + tax_amount
        
        return {
            'subtotal': subtotal.quantize(Decimal('0.01')),
            'tax_amount': tax_amount.quantize(Decimal('0.01')),
            'total': total.quantize(Decimal('0.01')),
            'tax_rate': total_rate,
            'tax_rate_percent': float(total_rate * 100),
            'tax_breakdown': {
                'state': (amount * tax_info['state_rate']).quantize(Decimal('0.01')),
                'county': (amount * tax_info['county_rate']).quantize(Decimal('0.01')),
                'city': (amount * tax_info['city_rate']).quantize(Decimal('0.01'))
            },
            'jurisdiction': tax_info['jurisdiction'],
            'tax_type': tax_info['tax_type']
        }