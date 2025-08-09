"""
Tax calculation service for POS transactions.
Implements destination-based taxation with fallback to origin-based.
"""

from decimal import Decimal
from typing import Dict, Optional, List, Tuple
from django.db import models
from taxes.models import GlobalSalesTaxRate
from users.models import BusinessSettings, UserProfile
from crm.models import Customer
from pyfactor.logging_config import get_logger

logger = get_logger()


class TaxService:
    """Service for calculating taxes on POS transactions."""
    
    @staticmethod
    def calculate_transaction_tax(
        customer: Optional[Customer],
        items: List[Dict],
        business_settings: BusinessSettings,
        user_profile: UserProfile,
        use_shipping_address: bool = True
    ) -> Dict:
        """
        Calculate tax for a POS transaction using smart international taxation.
        
        Phase 1 Approach:
        - Domestic sales: Origin or destination-based taxation
        - International sales: Zero tax (export exemption)
        
        Args:
            customer: Customer object (optional)
            items: List of items with product/service details
            business_settings: Business settings for origin location
            use_shipping_address: Whether to use shipping address (vs billing)
            
        Returns:
            Dict with tax calculation details including:
            - total_tax_amount: Total tax amount
            - tax_rate: Effective tax rate (weighted average)
            - tax_jurisdiction: Breakdown of tax components
            - tax_calculation_method: Method used (domestic/international/origin)
            - line_items: Tax details per item
        """
        try:
            # Get tenant ID for override checking
            from custom_auth.rls import get_current_tenant_id
            tenant_id = get_current_tenant_id()
            
            # Step 1: Determine tax location
            tax_location = TaxService._determine_tax_location(
                customer, user_profile, use_shipping_address
            )
            
            # Step 2: Check if this is an international sale (Phase 1 approach)
            # Convert business country to ISO code for comparison
            from utils.country_codes import get_country_iso_code
            business_country = get_country_iso_code(user_profile.country) if user_profile.country else None
            customer_country = tax_location['country']
            
            logger.info(f"[TaxService] Walk-in customer tax - Business: {user_profile.country} -> {business_country}, Customer location: {customer_country}, Tax method: {tax_location.get('method')}")
            
            # If business country is not set, skip international check
            if not business_country:
                business_country = customer_country  # Assume domestic sale
            
            # International sales = zero tax (export exemption)
            if business_country != customer_country:
                logger.info(f"International sale detected: {business_country} → {customer_country}. Applying zero tax.")
                return TaxService._create_zero_tax_response(
                    items, tax_location, "international_export"
                )
            
            logger.info(f"Domestic sale: Tax calculation using {tax_location['method']} method: "
                       f"{tax_location['country']}, {tax_location['state']}, {tax_location['county']}")
            
            # Step 3: Get applicable tax rates for domestic sales
            tax_rates = TaxService._get_tax_rates(
                tax_location['country'],
                tax_location['state'],
                tax_location['county'],
                tenant_id
            )
            
            # Step 4: Calculate tax for each item
            line_items = []
            total_tax = Decimal('0')
            total_taxable = Decimal('0')
            
            for item in items:
                item_tax_info = TaxService._calculate_item_tax(
                    item, tax_rates, customer
                )
                line_items.append(item_tax_info)
                total_tax += item_tax_info['tax_amount']
                if not item_tax_info['is_exempt']:
                    total_taxable += item_tax_info['taxable_amount']
            
            # Calculate effective tax rate
            effective_rate = (total_tax / total_taxable * 100) if total_taxable > 0 else Decimal('0')
            
            # Build jurisdiction info
            jurisdiction_info = {
                'country': tax_location['country'],
                'state': tax_location['state'],
                'county': tax_location['county'],
                'state_rate': str(tax_rates['state_rate']),
                'county_rate': str(tax_rates['county_rate']),
                'total_rate': str(tax_rates['total_rate']),
                'components': tax_rates['components'],
                'source': tax_rates.get('source', 'global')
            }
            
            # Add override information if applicable
            if tax_rates.get('source') == 'tenant_override':
                jurisdiction_info.update({
                    'override_id': tax_rates.get('override_id'),
                    'override_reason': tax_rates.get('override_reason'),
                    'is_custom_rate': True
                })
            else:
                jurisdiction_info['is_custom_rate'] = False
            
            return {
                'total_tax_amount': total_tax,
                'tax_rate': effective_rate,
                'tax_jurisdiction': jurisdiction_info,
                'tax_calculation_method': tax_location['method'],
                'line_items': line_items
            }
            
        except Exception as e:
            logger.error(f"Error calculating transaction tax: {str(e)}")
            # Return origin-based tax as fallback
            return TaxService._fallback_tax_calculation(items, user_profile)
    
    @staticmethod
    def _determine_tax_location(
        customer: Optional[Customer],
        user_profile: UserProfile,
        use_shipping_address: bool
    ) -> Dict:
        """
        Determine the location to use for tax calculation.
        Priority: Customer shipping → Customer billing → Business origin
        """
        # Check if customer is tax exempt
        if customer and customer.is_tax_exempt:
            from django.utils import timezone
            # Verify exemption is still valid
            if not customer.tax_exempt_expiry or customer.tax_exempt_expiry >= timezone.now().date():
                return {
                    'method': 'exempt',
                    'country': customer.shipping_country or customer.billing_country,
                    'state': customer.shipping_state or customer.billing_state,
                    'county': customer.shipping_county or customer.billing_county
                }
        
        # Try shipping address first (if requested)
        if customer and use_shipping_address:
            if customer.shipping_country and customer.shipping_state:
                return {
                    'method': 'destination',
                    'country': customer.shipping_country,
                    'state': customer.shipping_state,
                    'county': customer.shipping_county or ''
                }
        
        # Try billing address
        if customer and customer.billing_country and customer.billing_state:
            return {
                'method': 'billing',
                'country': customer.billing_country,
                'state': customer.billing_state,
                'county': customer.billing_county or ''
            }
        
        # Fall back to business origin
        # Convert country name to ISO code if needed
        from utils.country_codes import get_country_iso_code
        
        country_value = get_country_iso_code(user_profile.country)
        
        logger.info(f"Walk-in customer tax location - Business country: {user_profile.country} -> ISO: {country_value}")
        
        return {
            'method': 'origin',
            'country': country_value,
            'state': user_profile.state or '',
            'county': user_profile.county or ''
        }
    
    @staticmethod
    def _get_tax_rates(country: str, state: str, county: str, tenant_id: str = None) -> Dict:
        """
        Get tax rates for the given location.
        Checks tenant overrides first, then falls back to global rates.
        For USA, returns state and county rates separately.
        """
        try:
            rates = {
                'state_rate': Decimal('0'),
                'county_rate': Decimal('0'),
                'total_rate': Decimal('0'),
                'components': [],
                'source': 'global'  # Track whether rate came from override or global
            }
            
            # Check for tenant override first
            if tenant_id:
                from taxes.models import SalesTaxJurisdictionOverride
                
                override = SalesTaxJurisdictionOverride.objects.filter(
                    tenant_id=tenant_id,
                    country=country,
                    region_code=state,
                    locality=county,
                    is_active=True
                ).first()
                
                if override:
                    rates.update({
                        'state_rate': override.state_rate,
                        'county_rate': override.county_rate,
                        'total_rate': override.total_rate,
                        'source': 'tenant_override',
                        'override_id': override.id,
                        'override_reason': override.override_reason
                    })
                    
                    # Add components for breakdown
                    if override.country_rate > 0:
                        rates['components'].append({
                            'type': 'country',
                            'name': str(override.country),
                            'rate': str(override.country_rate)
                        })
                    
                    if override.state_rate > 0:
                        rates['components'].append({
                            'type': 'state', 
                            'name': override.region_name or state,
                            'rate': str(override.state_rate)
                        })
                    
                    if override.county_rate > 0:
                        rates['components'].append({
                            'type': 'county',
                            'name': override.locality_name or county,
                            'rate': str(override.county_rate)
                        })
                    
                    return rates
            
            # For non-USA countries, get country-level rate
            if country != 'US':
                logger.info(f"[TaxService] Looking up tax rate for country: {country}")
                
                # Hard-coded fallback for South Sudan
                if country == 'SS':
                    logger.info(f"[TaxService] Using hard-coded rate for South Sudan: 18%")
                    rates['total_rate'] = Decimal('0.18')
                    rates['components'].append({
                        'type': 'country',
                        'name': 'South Sudan',
                        'rate': '0.18'
                    })
                    return rates
                
                country_rate = GlobalSalesTaxRate.objects.filter(
                    country=country,
                    region_code='',
                    is_current=True
                ).first()
                
                if country_rate:
                    logger.info(f"[TaxService] Found tax rate for {country}: {country_rate.rate * 100}%")
                    rates['total_rate'] = country_rate.rate
                    rates['components'].append({
                        'type': 'country',
                        'name': country,
                        'rate': str(country_rate.rate)
                    })
                else:
                    logger.warning(f"[TaxService] No tax rate found for country: {country}")
                    
                    # Additional hard-coded rates for common African countries
                    hardcoded_rates = {
                        'KE': ('Kenya', Decimal('0.16')),
                        'NG': ('Nigeria', Decimal('0.075')),
                        'GH': ('Ghana', Decimal('0.125')),
                        'UG': ('Uganda', Decimal('0.18')),
                        'TZ': ('Tanzania', Decimal('0.18')),
                        'RW': ('Rwanda', Decimal('0.18')),
                        'ET': ('Ethiopia', Decimal('0.15')),
                        'ZA': ('South Africa', Decimal('0.15')),
                    }
                    
                    if country in hardcoded_rates:
                        name, rate = hardcoded_rates[country]
                        logger.info(f"[TaxService] Using hard-coded rate for {name}: {rate * 100}%")
                        rates['total_rate'] = rate
                        rates['components'].append({
                            'type': 'country',
                            'name': name,
                            'rate': str(rate)
                        })
                
                return rates
            
            # For USA, get state rate
            if state:
                state_rate = GlobalSalesTaxRate.objects.filter(
                    country='US',
                    region_code=state,
                    locality='',
                    is_current=True
                ).first()
                
                if state_rate:
                    rates['state_rate'] = state_rate.rate
                    rates['components'].append({
                        'type': 'state',
                        'name': state,
                        'rate': str(state_rate.rate)
                    })
            
            # Get county rate (aggregate rate that includes state)
            if county and state:
                county_rate = GlobalSalesTaxRate.objects.filter(
                    country='US',
                    region_code=state,
                    locality=county,
                    is_current=True
                ).first()
                
                if county_rate:
                    # County rate is aggregate (includes state)
                    rates['county_rate'] = county_rate.rate - rates['state_rate']
                    rates['total_rate'] = county_rate.rate
                    rates['components'].append({
                        'type': 'county',
                        'name': county,
                        'rate': str(rates['county_rate'])
                    })
                else:
                    # No county rate, use state rate only
                    rates['total_rate'] = rates['state_rate']
            else:
                # No county specified, use state rate only
                rates['total_rate'] = rates['state_rate']
            
            return rates
            
        except Exception as e:
            logger.error(f"Error getting tax rates: {str(e)}")
            return {
                'state_rate': Decimal('0'),
                'county_rate': Decimal('0'),
                'total_rate': Decimal('0'),
                'components': []
            }
    
    @staticmethod
    def _calculate_item_tax(
        item: Dict,
        tax_rates: Dict,
        customer: Optional[Customer]
    ) -> Dict:
        """Calculate tax for a single line item."""
        quantity = item['quantity']
        unit_price = item['unit_price']
        discount_percentage = item.get('discount_percentage', Decimal('0'))
        
        # Calculate base amounts
        subtotal = quantity * unit_price
        discount_amount = subtotal * discount_percentage / 100
        taxable_amount = subtotal - discount_amount
        
        # Check if item is tax exempt
        is_exempt = False
        tax_amount = Decimal('0')
        
        # Check product-level exemption
        if item['type'] == 'product' and hasattr(item['item'], 'is_tax_exempt'):
            is_exempt = item['item'].is_tax_exempt
        
        # Check customer-level exemption (already checked in location determination)
        if customer and customer.is_tax_exempt:
            from django.utils import timezone
            if not customer.tax_exempt_expiry or customer.tax_exempt_expiry >= timezone.now().date():
                is_exempt = True
        
        # Calculate tax if not exempt
        if not is_exempt:
            tax_amount = taxable_amount * tax_rates['total_rate'] / 100
        
        return {
            'item_name': item['item'].name,
            'quantity': quantity,
            'unit_price': unit_price,
            'subtotal': subtotal,
            'discount_amount': discount_amount,
            'taxable_amount': taxable_amount,
            'tax_rate': tax_rates['total_rate'],
            'tax_amount': tax_amount,
            'is_exempt': is_exempt
        }
    
    @staticmethod
    def _fallback_tax_calculation(
        items: List[Dict],
        user_profile: UserProfile
    ) -> Dict:
        """Fallback tax calculation using business origin."""
        try:
            # Get business location tax rate
            tax_rate = Decimal('0')
            
            if user_profile.state and user_profile.country:
                state_rate = GlobalSalesTaxRate.objects.filter(
                    country=str(user_profile.country),
                    region_code=user_profile.state,
                    locality='',
                    is_current=True
                ).first()
                
                if state_rate:
                    tax_rate = state_rate.rate
            
            # Calculate simple tax
            total_taxable = sum(
                item['quantity'] * item['unit_price'] 
                for item in items
            )
            total_tax = total_taxable * tax_rate / 100
            
            return {
                'total_tax_amount': total_tax,
                'tax_rate': tax_rate,
                'tax_jurisdiction': {
                    'country': str(user_profile.country) if user_profile.country else 'US',
                    'state': user_profile.state or '',
                    'county': user_profile.county or '',
                    'state_rate': str(tax_rate),
                    'county_rate': '0',
                    'total_rate': str(tax_rate),
                    'components': []
                },
                'tax_calculation_method': 'origin',
                'line_items': []
            }
            
        except Exception as e:
            logger.error(f"Error in fallback tax calculation: {str(e)}")
            return {
                'total_tax_amount': Decimal('0'),
                'tax_rate': Decimal('0'),
                'tax_jurisdiction': {},
                'tax_calculation_method': 'error',
                'line_items': []
            }
    
    @staticmethod
    def _create_zero_tax_response(
        items: List[Dict],
        tax_location: Dict,
        method: str
    ) -> Dict:
        """
        Create a zero-tax response for international sales or tax-exempt transactions.
        """
        line_items = []
        total_taxable = Decimal('0')
        
        for item in items:
            quantity = item['quantity']
            unit_price = item['unit_price']
            discount_percentage = item.get('discount_percentage', Decimal('0'))
            
            # Calculate base amounts
            subtotal = quantity * unit_price
            discount_amount = subtotal * discount_percentage / 100
            taxable_amount = subtotal - discount_amount
            total_taxable += taxable_amount
            
            line_items.append({
                'item_name': item['item'].name,
                'quantity': quantity,
                'unit_price': unit_price,
                'subtotal': subtotal,
                'discount_amount': discount_amount,
                'taxable_amount': taxable_amount,
                'tax_rate': Decimal('0'),
                'tax_amount': Decimal('0'),
                'is_exempt': True,
                'exemption_reason': 'International export' if method == 'international_export' else 'Tax exempt'
            })
        
        # Build jurisdiction info for international sales
        jurisdiction_info = {
            'country': tax_location['country'],
            'state': tax_location.get('state', ''),
            'county': tax_location.get('county', ''),
            'state_rate': '0.0000',
            'county_rate': '0.0000',
            'total_rate': '0.0000',
            'components': [],
            'source': 'international_exempt' if method == 'international_export' else 'exempt',
            'is_custom_rate': False,
            'exemption_reason': 'Export exemption - no tax on international sales' if method == 'international_export' else 'Tax exempt'
        }
        
        return {
            'total_tax_amount': Decimal('0'),
            'tax_rate': Decimal('0'),
            'tax_jurisdiction': jurisdiction_info,
            'tax_calculation_method': method,
            'line_items': line_items,
            'total_taxable_amount': total_taxable
        }