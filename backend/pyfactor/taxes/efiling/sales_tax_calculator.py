from decimal import Decimal, ROUND_HALF_UP
from datetime import date, datetime
from typing import Dict, List, Optional, Tuple, Any
from django.db.models import Q, Sum, F
from django.core.exceptions import ValidationError
import logging

from taxes.models import State, TaxFiling
from taxes.efiling.state_handlers import get_state_handler
from inventory.models import Location
from sales.models import Invoice, InvoiceItem
from inventory.models import Product, Service

logger = logging.getLogger(__name__)


class SalesTaxCalculator:
    """
    Calculate sales tax for multi-location businesses
    Handles exemptions, special rates, and generates state-specific reports
    """
    
    def __init__(self, tenant_id: str, state_code: str):
        self.tenant_id = tenant_id
        self.state_code = state_code.upper()
        self.state_handler = get_state_handler(state_code)
        if not self.state_handler:
            raise ValueError(f"No handler available for state: {state_code}")
            
    def calculate_taxable_sales(
        self,
        start_date: date,
        end_date: date,
        location_ids: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Calculate taxable sales for specified period and locations
        
        Returns:
            Dict containing:
            - gross_sales: Total sales amount
            - exempt_sales: Total exempt sales
            - taxable_sales: Total taxable sales
            - tax_collected: Total tax collected
            - location_breakdown: Sales by location
            - exemption_breakdown: Sales by exemption type
        """
        # Base query for invoices in the period
        invoice_query = Invoice.objects.filter(
            tenant_id=self.tenant_id,
            invoice_date__gte=start_date,
            invoice_date__lte=end_date,
            status__in=['paid', 'partially_paid']
        )
        
        # Filter by locations if specified
        if location_ids:
            invoice_query = invoice_query.filter(location_id__in=location_ids)
            
        # Get aggregate totals
        totals = invoice_query.aggregate(
            gross_sales=Sum('subtotal'),
            tax_collected=Sum('tax_amount'),
            total_with_tax=Sum('total_amount')
        )
        
        # Initialize result structure
        result = {
            'gross_sales': totals['gross_sales'] or Decimal('0'),
            'exempt_sales': Decimal('0'),
            'taxable_sales': Decimal('0'),
            'tax_collected': totals['tax_collected'] or Decimal('0'),
            'location_breakdown': {},
            'exemption_breakdown': {},
            'tax_rate_breakdown': {},
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            }
        }
        
        # Calculate location breakdown
        location_data = invoice_query.values('location_id').annotate(
            location_gross=Sum('subtotal'),
            location_tax=Sum('tax_amount'),
            location_total=Sum('total_amount')
        )
        
        for loc in location_data:
            location = Location.objects.get(id=loc['location_id'])
            result['location_breakdown'][str(location.id)] = {
                'location_name': location.name,
                'address': f"{location.city}, {location.state}",
                'gross_sales': loc['location_gross'] or Decimal('0'),
                'tax_collected': loc['location_tax'] or Decimal('0'),
                'zip_code': location.zip_code
            }
            
        # Calculate exemption breakdown
        exempt_invoices = invoice_query.filter(
            Q(tax_exempt=True) | Q(tax_amount=0)
        ).values('tax_exemption_reason').annotate(
            exempt_total=Sum('subtotal')
        )
        
        total_exempt = Decimal('0')
        for exempt in exempt_invoices:
            reason = exempt['tax_exemption_reason'] or 'OTHER'
            amount = exempt['exempt_total'] or Decimal('0')
            result['exemption_breakdown'][reason] = amount
            total_exempt += amount
            
        result['exempt_sales'] = total_exempt
        result['taxable_sales'] = result['gross_sales'] - total_exempt
        
        # Calculate effective tax rates by location
        for loc_id, loc_data in result['location_breakdown'].items():
            if loc_data['gross_sales'] > 0:
                effective_rate = (loc_data['tax_collected'] / loc_data['gross_sales'] * 100).quantize(
                    Decimal('0.01'), rounding=ROUND_HALF_UP
                )
                loc_data['effective_tax_rate'] = f"{effective_rate}%"
                
        return result
        
    def apply_exemptions(self, invoice_items: List[Dict], exemption_certificates: List[Dict]) -> Tuple[Decimal, Decimal]:
        """
        Apply exemptions to invoice items based on certificates
        
        Returns:
            Tuple of (taxable_amount, exempt_amount)
        """
        taxable_amount = Decimal('0')
        exempt_amount = Decimal('0')
        
        # Create exemption lookup
        exemption_lookup = {cert['certificate_number']: cert for cert in exemption_certificates}
        
        for item in invoice_items:
            amount = Decimal(str(item.get('amount', 0)))
            
            # Check if item has exemption certificate
            if item.get('exemption_certificate') in exemption_lookup:
                cert = exemption_lookup[item['exemption_certificate']]
                
                # Validate certificate is not expired
                if cert.get('expiration_date'):
                    exp_date = datetime.strptime(cert['expiration_date'], '%Y-%m-%d').date()
                    if exp_date >= date.today():
                        exempt_amount += amount
                        continue
                        
            # Check product/service level exemptions
            if item.get('product_tax_exempt') or item.get('service_tax_exempt'):
                exempt_amount += amount
            else:
                taxable_amount += amount
                
        return taxable_amount, exempt_amount
        
    def calculate_special_rates(self, location: Location, product_type: str) -> Decimal:
        """
        Calculate special tax rates for specific products or locations
        
        Examples:
        - Reduced rates for groceries
        - Higher rates for luxury items
        - Special district taxes
        """
        base_rate = self.state_handler.tax_rate_base
        
        # State-specific special rates
        special_rates = {
            'CA': {
                'groceries': Decimal('0'),  # No tax on groceries
                'prescription_drugs': Decimal('0'),
                'district_tax': Decimal('0.01')  # Additional 1% for some districts
            },
            'NY': {
                'clothing_under_110': Decimal('0'),  # No tax on clothing under $110
                'prescription_drugs': Decimal('0'),
                'mctd_counties': ['New York', 'Bronx', 'Kings', 'Queens', 'Richmond',
                                 'Rockland', 'Nassau', 'Suffolk', 'Orange', 'Putnam',
                                 'Dutchess', 'Westchester']
            },
            'FL': {
                'groceries': Decimal('0'),
                'prescription_drugs': Decimal('0'),
                'prepared_food': base_rate  # Full rate on prepared food
            }
        }
        
        state_rates = special_rates.get(self.state_code, {})
        
        # Apply product-specific rates
        if product_type in state_rates:
            return state_rates[product_type]
            
        # Apply location-specific rates (e.g., MCTD in NY)
        if self.state_code == 'NY' and location.county in state_rates.get('mctd_counties', []):
            return base_rate + Decimal('0.00375')  # Additional 0.375% for MCTD
            
        # Apply district taxes for California
        if self.state_code == 'CA' and location.has_district_tax:
            return base_rate + state_rates.get('district_tax', Decimal('0'))
            
        return base_rate
        
    def generate_state_report(self, filing_data: Dict) -> Dict[str, Any]:
        """
        Generate state-specific tax report formatted for e-filing
        """
        if not self.state_handler:
            raise ValueError("State handler not initialized")
            
        # Validate filing data
        is_valid, errors = self.state_handler.validate_filing_data(filing_data)
        if not is_valid:
            raise ValidationError(f"Filing data validation failed: {', '.join(errors)}")
            
        # Get form requirements
        form_reqs = self.state_handler.get_form_requirements()
        
        # Build report structure
        report = {
            'state_code': self.state_code,
            'form_number': form_reqs['form_number'],
            'form_name': form_reqs['form_name'],
            'filing_period': filing_data['reporting_period'],
            'due_date': self.state_handler.calculate_due_date(
                datetime.strptime(filing_data['period_end'], '%Y-%m-%d').date()
            ).isoformat(),
            'filing_frequency': self.state_handler.get_filing_frequency(
                Decimal(str(filing_data.get('annual_revenue', 0)))
            )
        }
        
        # Add state-specific fields
        if self.state_code == 'CA':
            report['district_taxes'] = self._calculate_ca_district_taxes(filing_data)
        elif self.state_code == 'TX':
            report['prepayment_discount'] = self._calculate_tx_discount(filing_data)
        elif self.state_code == 'FL':
            report['collection_allowance'] = self._calculate_fl_allowance(filing_data)
        elif self.state_code == 'NY':
            report['jurisdiction_breakdown'] = self._calculate_ny_jurisdictions(filing_data)
            
        # Add common fields
        report.update({
            'gross_sales': filing_data.get('gross_sales', 0),
            'exempt_sales': filing_data.get('exempt_sales', 0),
            'taxable_sales': filing_data.get('taxable_sales', 0),
            'tax_collected': filing_data.get('tax_collected', 0),
            'tax_due': filing_data.get('tax_due', 0),
            'vendor_discount': filing_data.get('vendor_discount', 0),
            'net_tax_due': filing_data.get('net_tax_due', 0)
        })
        
        return report
        
    def _calculate_ca_district_taxes(self, filing_data: Dict) -> List[Dict]:
        """Calculate California district taxes"""
        districts = []
        location_breakdown = filing_data.get('location_breakdown', {})
        
        for loc_id, loc_data in location_breakdown.items():
            location = Location.objects.get(id=loc_id)
            if location.tax_district_code:
                districts.append({
                    'district_code': location.tax_district_code,
                    'district_name': location.tax_district_name,
                    'taxable_sales': loc_data['gross_sales'] - loc_data.get('exempt_sales', 0),
                    'district_rate': location.district_tax_rate,
                    'district_tax': loc_data.get('district_tax', 0)
                })
                
        return districts
        
    def _calculate_tx_discount(self, filing_data: Dict) -> Decimal:
        """Calculate Texas prepayment discount"""
        tax_due = Decimal(str(filing_data.get('tax_due', 0)))
        # 0.5% discount for timely filing
        return (tax_due * Decimal('0.005')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
    def _calculate_fl_allowance(self, filing_data: Dict) -> Decimal:
        """Calculate Florida collection allowance"""
        tax_collected = Decimal(str(filing_data.get('tax_collected', 0)))
        # 2.5% collection allowance, max $30
        allowance = tax_collected * Decimal('0.025')
        return min(allowance, Decimal('30')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
    def _calculate_ny_jurisdictions(self, filing_data: Dict) -> List[Dict]:
        """Calculate New York jurisdiction breakdown"""
        jurisdictions = []
        location_breakdown = filing_data.get('location_breakdown', {})
        
        mctd_counties = ['New York', 'Bronx', 'Kings', 'Queens', 'Richmond',
                        'Rockland', 'Nassau', 'Suffolk', 'Orange', 'Putnam',
                        'Dutchess', 'Westchester']
        
        for loc_id, loc_data in location_breakdown.items():
            location = Location.objects.get(id=loc_id)
            
            jurisdiction = {
                'county': location.county,
                'city': location.city,
                'state_tax': loc_data['gross_sales'] * Decimal('0.04'),
                'county_tax': loc_data['gross_sales'] * location.county_tax_rate,
                'city_tax': loc_data['gross_sales'] * location.city_tax_rate,
            }
            
            # Add MCTD tax if applicable
            if location.county in mctd_counties:
                jurisdiction['mctd_tax'] = loc_data['gross_sales'] * Decimal('0.00375')
                
            jurisdictions.append(jurisdiction)
            
        return jurisdictions
        
    def validate_multi_location_filing(self, location_ids: List[str]) -> Tuple[bool, List[str]]:
        """
        Validate that all locations can be filed together
        
        Some states require separate filings for different tax jurisdictions
        """
        errors = []
        
        # Get all locations
        locations = Location.objects.filter(
            id__in=location_ids,
            tenant_id=self.tenant_id
        )
        
        # Check all locations are in the same state
        states = locations.values_list('state', flat=True).distinct()
        if len(states) > 1:
            errors.append("All locations must be in the same state for combined filing")
            return False, errors
            
        # State-specific validation
        if self.state_code == 'CO':
            # Colorado home-rule cities require separate filing
            home_rule_cities = ['Denver', 'Aurora', 'Westminster', 'Lakewood']
            for location in locations:
                if location.city in home_rule_cities:
                    errors.append(f"{location.city} is a home-rule city and requires separate filing")
                    
        elif self.state_code == 'LA':
            # Louisiana parishes may have different requirements
            parishes = locations.values_list('county', flat=True).distinct()
            if len(parishes) > 1:
                errors.append("Louisiana requires separate filings for different parishes")
                
        return len(errors) == 0, errors
        
    def estimate_filing_fee(self, filing_data: Dict) -> Decimal:
        """
        Estimate state filing fees (if any)
        
        Most states don't charge for e-filing, but some may have fees
        """
        fees = {
            'CA': Decimal('0'),  # No fee
            'TX': Decimal('0'),
            'FL': Decimal('0'),
            'NY': Decimal('0'),
            'PA': Decimal('0'),
            # Some states may charge for paper filing
            'paper_filing_fee': Decimal('25.00')
        }
        
        # Check if e-filing is supported
        if self.state_handler and self.state_handler.get_form_requirements()['supports_efile']:
            return fees.get(self.state_code, Decimal('0'))
        else:
            return fees.get('paper_filing_fee')
            
    def get_filing_checklist(self) -> List[Dict[str, str]]:
        """
        Get a checklist of required items for filing
        """
        checklist = [
            {
                'item': 'Sales records for all locations',
                'required': True,
                'description': 'Detailed sales records including date, amount, and tax collected'
            },
            {
                'item': 'Exemption certificates',
                'required': True,
                'description': 'Valid exemption certificates for all exempt sales'
            },
            {
                'item': 'Point of Sale reports',
                'required': False,
                'description': 'Summary reports from your POS system'
            },
            {
                'item': 'Location tax rates',
                'required': True,
                'description': 'Current tax rates for each business location'
            }
        ]
        
        # Add state-specific requirements
        if self.state_code == 'CA':
            checklist.append({
                'item': 'District tax allocation',
                'required': True,
                'description': 'Breakdown of taxes collected for each district'
            })
        elif self.state_code == 'NY':
            checklist.append({
                'item': 'MCTD tax calculation',
                'required': True,
                'description': 'Metropolitan Commuter Transportation District tax if applicable'
            })
            
        return checklist