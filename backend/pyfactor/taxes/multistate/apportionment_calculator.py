"""
Multi-state tax apportionment calculator for businesses operating across multiple states.
Handles state income tax apportionment calculations including sales, payroll, and property factors.
"""

from decimal import Decimal, ROUND_HALF_UP
from enum import Enum
from typing import Dict, List, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


class ApportionmentMethod(Enum):
    """Apportionment methods used by different states"""
    SINGLE_SALES = "single_sales"
    EQUALLY_WEIGHTED = "equally_weighted"
    DOUBLE_WEIGHTED_SALES = "double_weighted_sales"
    CUSTOM_WEIGHTED = "custom_weighted"


class FilingMethod(Enum):
    """Filing method options for multi-state operations"""
    SEPARATE = "separate"
    COMBINED = "combined"
    CONSOLIDATED = "consolidated"


class ThrowbackRule(Enum):
    """Throwback and throwout rules"""
    THROWBACK = "throwback"
    THROWOUT = "throwout"
    NO_RULE = "no_rule"


class StateApportionmentConfig:
    """Configuration for state-specific apportionment rules"""
    
    # State apportionment configurations
    STATE_CONFIGS = {
        'CA': {
            'method': ApportionmentMethod.SINGLE_SALES,
            'throwback_rule': ThrowbackRule.THROWBACK,
            'market_sourcing': True,
            'combined_filing': True,
            'water_edge': True,
            'sales_weight': Decimal('1.0'),
            'payroll_weight': Decimal('0.0'),
            'property_weight': Decimal('0.0')
        },
        'NY': {
            'method': ApportionmentMethod.SINGLE_SALES,
            'throwback_rule': ThrowbackRule.THROWBACK,
            'market_sourcing': True,
            'combined_filing': False,
            'water_edge': False,
            'sales_weight': Decimal('1.0'),
            'payroll_weight': Decimal('0.0'),
            'property_weight': Decimal('0.0')
        },
        'TX': {
            'method': ApportionmentMethod.SINGLE_SALES,
            'throwback_rule': ThrowbackRule.NO_RULE,
            'market_sourcing': True,
            'combined_filing': False,
            'water_edge': False,
            'sales_weight': Decimal('1.0'),
            'payroll_weight': Decimal('0.0'),
            'property_weight': Decimal('0.0')
        },
        'FL': {
            'method': ApportionmentMethod.SINGLE_SALES,
            'throwback_rule': ThrowbackRule.NO_RULE,
            'market_sourcing': True,
            'combined_filing': False,
            'water_edge': False,
            'sales_weight': Decimal('1.0'),
            'payroll_weight': Decimal('0.0'),
            'property_weight': Decimal('0.0')
        },
        'IL': {
            'method': ApportionmentMethod.SINGLE_SALES,
            'throwback_rule': ThrowbackRule.THROWBACK,
            'market_sourcing': True,
            'combined_filing': False,
            'water_edge': False,
            'sales_weight': Decimal('1.0'),
            'payroll_weight': Decimal('0.0'),
            'property_weight': Decimal('0.0')
        },
        'PA': {
            'method': ApportionmentMethod.DOUBLE_WEIGHTED_SALES,
            'throwback_rule': ThrowbackRule.THROWBACK,
            'market_sourcing': False,
            'combined_filing': False,
            'water_edge': False,
            'sales_weight': Decimal('0.5'),
            'payroll_weight': Decimal('0.25'),
            'property_weight': Decimal('0.25')
        },
        'OH': {
            'method': ApportionmentMethod.SINGLE_SALES,
            'throwback_rule': ThrowbackRule.THROWOUT,
            'market_sourcing': True,
            'combined_filing': False,
            'water_edge': False,
            'sales_weight': Decimal('1.0'),
            'payroll_weight': Decimal('0.0'),
            'property_weight': Decimal('0.0')
        },
        'MI': {
            'method': ApportionmentMethod.SINGLE_SALES,
            'throwback_rule': ThrowbackRule.THROWBACK,
            'market_sourcing': True,
            'combined_filing': False,
            'water_edge': False,
            'sales_weight': Decimal('1.0'),
            'payroll_weight': Decimal('0.0'),
            'property_weight': Decimal('0.0')
        },
        'GA': {
            'method': ApportionmentMethod.SINGLE_SALES,
            'throwback_rule': ThrowbackRule.THROWBACK,
            'market_sourcing': True,
            'combined_filing': False,
            'water_edge': False,
            'sales_weight': Decimal('1.0'),
            'payroll_weight': Decimal('0.0'),
            'property_weight': Decimal('0.0')
        },
        'NC': {
            'method': ApportionmentMethod.SINGLE_SALES,
            'throwback_rule': ThrowbackRule.THROWBACK,
            'market_sourcing': True,
            'combined_filing': False,
            'water_edge': False,
            'sales_weight': Decimal('1.0'),
            'payroll_weight': Decimal('0.0'),
            'property_weight': Decimal('0.0')
        }
    }


class ApportionmentFactors:
    """Container for apportionment factor data"""
    
    def __init__(self):
        self.sales_factor: Dict[str, Decimal] = {}
        self.payroll_factor: Dict[str, Decimal] = {}
        self.property_factor: Dict[str, Decimal] = {}
        self.apportionment_percentage: Dict[str, Decimal] = {}


class ApportionmentCalculator:
    """
    Main calculator for multi-state tax apportionment.
    Handles various apportionment methods and state-specific rules.
    """
    
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.config = StateApportionmentConfig()
        
    def calculate_sales_factor(self, state: str, state_sales: Decimal, 
                             total_sales: Decimal, throwback_sales: Decimal = Decimal('0')) -> Decimal:
        """
        Calculate sales factor for a state including throwback/throwout rules.
        
        Args:
            state: State abbreviation
            state_sales: Sales in the state
            total_sales: Total sales everywhere
            throwback_sales: Sales that should be thrown back to this state
            
        Returns:
            Sales factor as decimal percentage
        """
        if total_sales == 0:
            return Decimal('0')
            
        state_config = self.config.STATE_CONFIGS.get(state, {})
        throwback_rule = state_config.get('throwback_rule', ThrowbackRule.NO_RULE)
        
        # Apply throwback/throwout rules
        adjusted_state_sales = state_sales
        adjusted_total_sales = total_sales
        
        if throwback_rule == ThrowbackRule.THROWBACK:
            # Add throwback sales to both numerator and denominator
            adjusted_state_sales += throwback_sales
            
        elif throwback_rule == ThrowbackRule.THROWOUT:
            # Remove throwout sales from denominator only
            adjusted_total_sales -= throwback_sales
            
        if adjusted_total_sales == 0:
            return Decimal('0')
            
        factor = adjusted_state_sales / adjusted_total_sales
        return factor.quantize(Decimal('0.000001'), rounding=ROUND_HALF_UP)
    
    def calculate_payroll_factor(self, state: str, state_payroll: Decimal, 
                               total_payroll: Decimal) -> Decimal:
        """
        Calculate payroll factor for a state.
        
        Args:
            state: State abbreviation
            state_payroll: Payroll in the state
            total_payroll: Total payroll everywhere
            
        Returns:
            Payroll factor as decimal percentage
        """
        if total_payroll == 0:
            return Decimal('0')
            
        factor = state_payroll / total_payroll
        return factor.quantize(Decimal('0.000001'), rounding=ROUND_HALF_UP)
    
    def calculate_property_factor(self, state: str, state_property: Decimal, 
                                total_property: Decimal) -> Decimal:
        """
        Calculate property factor for a state.
        
        Args:
            state: State abbreviation
            state_property: Property value in the state
            total_property: Total property value everywhere
            
        Returns:
            Property factor as decimal percentage
        """
        if total_property == 0:
            return Decimal('0')
            
        factor = state_property / total_property
        return factor.quantize(Decimal('0.000001'), rounding=ROUND_HALF_UP)
    
    def calculate_apportionment_percentage(self, state: str, sales_factor: Decimal,
                                         payroll_factor: Decimal, property_factor: Decimal) -> Decimal:
        """
        Calculate final apportionment percentage based on state-specific weighting.
        
        Args:
            state: State abbreviation
            sales_factor: Calculated sales factor
            payroll_factor: Calculated payroll factor
            property_factor: Calculated property factor
            
        Returns:
            Final apportionment percentage
        """
        state_config = self.config.STATE_CONFIGS.get(state, {})
        
        sales_weight = state_config.get('sales_weight', Decimal('1.0'))
        payroll_weight = state_config.get('payroll_weight', Decimal('0.0'))
        property_weight = state_config.get('property_weight', Decimal('0.0'))
        
        # Calculate weighted average
        weighted_factor = (
            (sales_factor * sales_weight) +
            (payroll_factor * payroll_weight) +
            (property_factor * property_weight)
        )
        
        # Normalize by total weights
        total_weight = sales_weight + payroll_weight + property_weight
        if total_weight > 0:
            apportionment = weighted_factor / total_weight
        else:
            apportionment = Decimal('0')
            
        return apportionment.quantize(Decimal('0.000001'), rounding=ROUND_HALF_UP)
    
    def calculate_multistate_apportionment(self, business_data: Dict) -> ApportionmentFactors:
        """
        Calculate apportionment factors for all states where business operates.
        
        Args:
            business_data: Dictionary containing business operation data
            
        Returns:
            ApportionmentFactors object with calculated factors
        """
        factors = ApportionmentFactors()
        
        states = business_data.get('states', [])
        total_sales = Decimal(str(business_data.get('total_sales', 0)))
        total_payroll = Decimal(str(business_data.get('total_payroll', 0)))
        total_property = Decimal(str(business_data.get('total_property', 0)))
        
        # Calculate throwback/throwout adjustments
        throwback_adjustments = self._calculate_throwback_adjustments(business_data)
        
        for state in states:
            state_sales = Decimal(str(business_data.get(f'{state}_sales', 0)))
            state_payroll = Decimal(str(business_data.get(f'{state}_payroll', 0)))
            state_property = Decimal(str(business_data.get(f'{state}_property', 0)))
            
            throwback_sales = throwback_adjustments.get(state, Decimal('0'))
            
            # Calculate individual factors
            sales_factor = self.calculate_sales_factor(
                state, state_sales, total_sales, throwback_sales
            )
            payroll_factor = self.calculate_payroll_factor(
                state, state_payroll, total_payroll
            )
            property_factor = self.calculate_property_factor(
                state, state_property, total_property
            )
            
            # Calculate final apportionment percentage
            apportionment = self.calculate_apportionment_percentage(
                state, sales_factor, payroll_factor, property_factor
            )
            
            factors.sales_factor[state] = sales_factor
            factors.payroll_factor[state] = payroll_factor
            factors.property_factor[state] = property_factor
            factors.apportionment_percentage[state] = apportionment
            
        return factors
    
    def _calculate_throwback_adjustments(self, business_data: Dict) -> Dict[str, Decimal]:
        """
        Calculate throwback/throwout adjustments for states.
        
        Args:
            business_data: Business operation data
            
        Returns:
            Dictionary of throwback adjustments by state
        """
        adjustments = {}
        states = business_data.get('states', [])
        
        # Identify sales with no nexus (nowhere sales)
        nowhere_sales = Decimal(str(business_data.get('nowhere_sales', 0)))
        
        # Find states with throwback rules
        throwback_states = []
        for state in states:
            state_config = self.config.STATE_CONFIGS.get(state, {})
            if state_config.get('throwback_rule') == ThrowbackRule.THROWBACK:
                throwback_states.append(state)
        
        # Distribute nowhere sales to throwback states based on sales activity
        if throwback_states and nowhere_sales > 0:
            total_throwback_state_sales = sum(
                Decimal(str(business_data.get(f'{state}_sales', 0)))
                for state in throwback_states
            )
            
            if total_throwback_state_sales > 0:
                for state in throwback_states:
                    state_sales = Decimal(str(business_data.get(f'{state}_sales', 0)))
                    proportion = state_sales / total_throwback_state_sales
                    adjustments[state] = nowhere_sales * proportion
        
        return adjustments
    
    def determine_filing_method(self, states: List[str], total_income: Decimal) -> FilingMethod:
        """
        Determine the appropriate filing method based on states and income.
        
        Args:
            states: List of states where business operates
            total_income: Total business income
            
        Returns:
            Recommended filing method
        """
        # Check if any states require combined filing
        combined_required = any(
            self.config.STATE_CONFIGS.get(state, {}).get('combined_filing', False)
            for state in states
        )
        
        if combined_required:
            return FilingMethod.COMBINED
        
        # For high-income multi-state businesses, consider combined filing
        if len(states) > 3 and total_income > 10000000:  # $10M threshold
            return FilingMethod.COMBINED
        
        return FilingMethod.SEPARATE
    
    def validate_apportionment_factors(self, factors: ApportionmentFactors) -> List[str]:
        """
        Validate calculated apportionment factors for consistency.
        
        Args:
            factors: Calculated apportionment factors
            
        Returns:
            List of validation warnings/errors
        """
        warnings = []
        
        # Check if total apportionment exceeds 100%
        total_apportionment = sum(factors.apportionment_percentage.values())
        if total_apportionment > Decimal('1.01'):  # Allow small rounding differences
            warnings.append(f"Total apportionment exceeds 100%: {total_apportionment:.4%}")
        
        # Check for negative factors
        for state, factor in factors.apportionment_percentage.items():
            if factor < 0:
                warnings.append(f"Negative apportionment factor for {state}: {factor:.4%}")
        
        # Check for extremely high individual state factors
        for state, factor in factors.apportionment_percentage.items():
            if factor > Decimal('0.90'):  # 90% threshold
                warnings.append(f"High apportionment factor for {state}: {factor:.4%}")
        
        return warnings
    
    def get_state_tax_rates(self, state: str, income_level: Decimal) -> Dict[str, Decimal]:
        """
        Get state-specific tax rates for income level.
        
        Args:
            state: State abbreviation
            income_level: Taxable income level
            
        Returns:
            Dictionary of applicable tax rates
        """
        # This would integrate with existing state tax rate data
        # For now, returning placeholder structure
        return {
            'corporate_rate': Decimal('0.0'),
            'franchise_rate': Decimal('0.0'),
            'minimum_tax': Decimal('0.0')
        }
    
    def calculate_state_tax_liability(self, state: str, apportioned_income: Decimal) -> Dict[str, Decimal]:
        """
        Calculate state tax liability based on apportioned income.
        
        Args:
            state: State abbreviation
            apportioned_income: Income apportioned to the state
            
        Returns:
            Dictionary of calculated tax amounts
        """
        rates = self.get_state_tax_rates(state, apportioned_income)
        
        corporate_tax = apportioned_income * rates['corporate_rate']
        franchise_tax = apportioned_income * rates['franchise_rate']
        minimum_tax = rates['minimum_tax']
        
        total_tax = max(corporate_tax + franchise_tax, minimum_tax)
        
        return {
            'apportioned_income': apportioned_income,
            'corporate_tax': corporate_tax,
            'franchise_tax': franchise_tax,
            'minimum_tax': minimum_tax,
            'total_tax': total_tax
        }


class MultistateReturnProcessor:
    """Processor for generating multi-state tax returns"""
    
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.calculator = ApportionmentCalculator(tenant_id)
    
    def process_multistate_return(self, business_data: Dict) -> Dict:
        """
        Process complete multi-state tax return.
        
        Args:
            business_data: Complete business data for all states
            
        Returns:
            Complete multi-state return data
        """
        # Calculate apportionment factors
        factors = self.calculator.calculate_multistate_apportionment(business_data)
        
        # Validate factors
        warnings = self.calculator.validate_apportionment_factors(factors)
        
        # Calculate state-by-state tax liability
        states = business_data.get('states', [])
        total_income = Decimal(str(business_data.get('total_income', 0)))
        state_liabilities = {}
        
        for state in states:
            apportioned_income = total_income * factors.apportionment_percentage[state]
            state_liabilities[state] = self.calculator.calculate_state_tax_liability(
                state, apportioned_income
            )
        
        # Determine filing method
        filing_method = self.calculator.determine_filing_method(states, total_income)
        
        return {
            'tenant_id': self.tenant_id,
            'filing_method': filing_method.value,
            'apportionment_factors': {
                'sales_factors': dict(factors.sales_factor),
                'payroll_factors': dict(factors.payroll_factor),
                'property_factors': dict(factors.property_factor),
                'apportionment_percentages': dict(factors.apportionment_percentage)
            },
            'state_liabilities': state_liabilities,
            'total_tax_due': sum(
                liability['total_tax'] for liability in state_liabilities.values()
            ),
            'validation_warnings': warnings,
            'calculation_date': business_data.get('calculation_date'),
            'tax_year': business_data.get('tax_year')
        }