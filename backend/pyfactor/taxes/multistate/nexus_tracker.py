"""
Multi-state nexus tracking system for businesses operating across multiple states.
Handles economic nexus, physical presence nexus, sales tax nexus, and income tax nexus determination.
"""

from decimal import Decimal
from enum import Enum
from typing import Dict, List, Optional, Set, Tuple
from datetime import datetime, date
import logging

logger = logging.getLogger(__name__)


class NexusType(Enum):
    """Types of nexus that can be established"""
    PHYSICAL_PRESENCE = "physical_presence"
    ECONOMIC_SALES = "economic_sales"
    ECONOMIC_TRANSACTIONS = "economic_transactions"
    AFFILIATE = "affiliate"
    CLICK_THROUGH = "click_through"
    MARKETPLACE = "marketplace"
    FACTOR_PRESENCE = "factor_presence"


class TaxType(Enum):
    """Types of taxes affected by nexus"""
    SALES_TAX = "sales_tax"
    INCOME_TAX = "income_tax"
    FRANCHISE_TAX = "franchise_tax"
    GROSS_RECEIPTS = "gross_receipts"
    PAYROLL_TAX = "payroll_tax"


class ActivityType(Enum):
    """Types of business activities that can create nexus"""
    OFFICE = "office"
    WAREHOUSE = "warehouse"
    RETAIL_LOCATION = "retail_location"
    EMPLOYEE = "employee"
    INDEPENDENT_CONTRACTOR = "independent_contractor"
    SALES_REP = "sales_rep"
    REPAIR_SERVICE = "repair_service"
    INSTALLATION = "installation"
    TRADE_SHOW = "trade_show"
    DELIVERY = "delivery"
    PROPERTY_OWNERSHIP = "property_ownership"
    INVENTORY_STORAGE = "inventory_storage"


class StateNexusConfig:
    """Configuration for state-specific nexus rules"""
    
    # Economic nexus thresholds by state
    ECONOMIC_NEXUS_THRESHOLDS = {
        'AL': {'sales': Decimal('250000'), 'transactions': 200},
        'AK': {'sales': Decimal('100000'), 'transactions': 200},
        'AZ': {'sales': Decimal('100000'), 'transactions': 200},
        'AR': {'sales': Decimal('100000'), 'transactions': 200},
        'CA': {'sales': Decimal('500000'), 'transactions': None},
        'CO': {'sales': Decimal('100000'), 'transactions': 200},
        'CT': {'sales': Decimal('100000'), 'transactions': 200},
        'DE': {'sales': Decimal('100000'), 'transactions': 200},
        'FL': {'sales': Decimal('100000'), 'transactions': None},
        'GA': {'sales': Decimal('100000'), 'transactions': 200},
        'HI': {'sales': Decimal('100000'), 'transactions': 200},
        'ID': {'sales': Decimal('100000'), 'transactions': 200},
        'IL': {'sales': Decimal('100000'), 'transactions': 200},
        'IN': {'sales': Decimal('100000'), 'transactions': 200},
        'IA': {'sales': Decimal('100000'), 'transactions': 200},
        'KS': {'sales': Decimal('100000'), 'transactions': 200},
        'KY': {'sales': Decimal('100000'), 'transactions': 200},
        'LA': {'sales': Decimal('100000'), 'transactions': 200},
        'ME': {'sales': Decimal('100000'), 'transactions': 200},
        'MD': {'sales': Decimal('100000'), 'transactions': 200},
        'MA': {'sales': Decimal('100000'), 'transactions': None},
        'MI': {'sales': Decimal('100000'), 'transactions': 200},
        'MN': {'sales': Decimal('100000'), 'transactions': 200},
        'MS': {'sales': Decimal('250000'), 'transactions': None},
        'MO': {'sales': Decimal('100000'), 'transactions': None},
        'MT': {'sales': None, 'transactions': None},  # No sales tax
        'NE': {'sales': Decimal('100000'), 'transactions': 200},
        'NV': {'sales': Decimal('100000'), 'transactions': 200},
        'NH': {'sales': None, 'transactions': None},  # No sales tax
        'NJ': {'sales': Decimal('100000'), 'transactions': 200},
        'NM': {'sales': Decimal('100000'), 'transactions': None},
        'NY': {'sales': Decimal('500000'), 'transactions': 100},
        'NC': {'sales': Decimal('100000'), 'transactions': 200},
        'ND': {'sales': Decimal('100000'), 'transactions': 200},
        'OH': {'sales': Decimal('100000'), 'transactions': 200},
        'OK': {'sales': Decimal('100000'), 'transactions': None},
        'OR': {'sales': None, 'transactions': None},  # No sales tax
        'PA': {'sales': Decimal('100000'), 'transactions': None},
        'RI': {'sales': Decimal('100000'), 'transactions': 200},
        'SC': {'sales': Decimal('100000'), 'transactions': None},
        'SD': {'sales': Decimal('100000'), 'transactions': 200},
        'TN': {'sales': Decimal('100000'), 'transactions': None},
        'TX': {'sales': Decimal('500000'), 'transactions': None},
        'UT': {'sales': Decimal('100000'), 'transactions': 200},
        'VT': {'sales': Decimal('100000'), 'transactions': 200},
        'VA': {'sales': Decimal('100000'), 'transactions': 200},
        'WA': {'sales': Decimal('100000'), 'transactions': 200},
        'WV': {'sales': Decimal('100000'), 'transactions': 200},
        'WI': {'sales': Decimal('100000'), 'transactions': 200},
        'WY': {'sales': Decimal('100000'), 'transactions': 200},
        'DC': {'sales': Decimal('100000'), 'transactions': 200}
    }
    
    # Income tax nexus thresholds by state
    INCOME_TAX_NEXUS_THRESHOLDS = {
        'CA': {'sales': Decimal('500000'), 'property': Decimal('50000'), 'payroll': Decimal('50000')},
        'NY': {'sales': Decimal('1000000'), 'property': Decimal('1000000'), 'payroll': Decimal('1000000')},
        'TX': {'sales': Decimal('500000'), 'property': None, 'payroll': None},  # Franchise tax
        'FL': {'sales': Decimal('1000000'), 'property': None, 'payroll': None},
        'IL': {'sales': Decimal('500000'), 'property': Decimal('100000'), 'payroll': Decimal('100000')},
        'PA': {'sales': Decimal('500000'), 'property': Decimal('100000'), 'payroll': Decimal('100000')},
        'OH': {'sales': Decimal('500000'), 'property': Decimal('50000'), 'payroll': Decimal('50000')},
        'MI': {'sales': Decimal('350000'), 'property': Decimal('50000'), 'payroll': Decimal('50000')},
        'GA': {'sales': Decimal('500000'), 'property': Decimal('100000'), 'payroll': Decimal('100000')},
        'NC': {'sales': Decimal('500000'), 'property': Decimal('100000'), 'payroll': Decimal('100000')},
    }
    
    # Physical presence activities that create nexus
    PHYSICAL_PRESENCE_ACTIVITIES = {
        'office': True,
        'warehouse': True,
        'retail_location': True,
        'employee': True,
        'independent_contractor': False,  # Depends on activities
        'sales_rep': False,  # Protected in many states
        'repair_service': True,
        'installation': True,
        'trade_show': False,  # Usually temporary exemption
        'delivery': False,  # Depends on frequency and method
        'property_ownership': True,
        'inventory_storage': True
    }


class NexusActivity:
    """Represents a business activity that may create nexus"""
    
    def __init__(self, activity_type: ActivityType, state: str, 
                 start_date: date, end_date: Optional[date] = None,
                 description: str = "", value: Optional[Decimal] = None):
        self.activity_type = activity_type
        self.state = state
        self.start_date = start_date
        self.end_date = end_date
        self.description = description
        self.value = value  # For economic activities
        
    def is_active(self, check_date: date) -> bool:
        """Check if activity is active on a given date"""
        if self.start_date > check_date:
            return False
        if self.end_date and self.end_date < check_date:
            return False
        return True


class NexusStatus:
    """Represents nexus status for a state and tax type"""
    
    def __init__(self, state: str, tax_type: TaxType, 
                 has_nexus: bool = False, nexus_types: Set[NexusType] = None,
                 effective_date: Optional[date] = None, 
                 threshold_analysis: Dict = None):
        self.state = state
        self.tax_type = tax_type
        self.has_nexus = has_nexus
        self.nexus_types = nexus_types or set()
        self.effective_date = effective_date
        self.threshold_analysis = threshold_analysis or {}


class NexusTracker:
    """
    Main tracker for monitoring nexus across all states and tax types.
    Handles economic nexus, physical presence nexus, and compliance monitoring.
    """
    
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.config = StateNexusConfig()
        self.activities: List[NexusActivity] = []
        
    def add_activity(self, activity: NexusActivity):
        """Add a business activity that may create nexus"""
        self.activities.append(activity)
        logger.info(f"Added nexus activity: {activity.activity_type.value} in {activity.state}")
    
    def remove_activity(self, activity: NexusActivity):
        """Remove a business activity"""
        if activity in self.activities:
            self.activities.remove(activity)
            logger.info(f"Removed nexus activity: {activity.activity_type.value} in {activity.state}")
    
    def check_economic_nexus(self, state: str, sales_data: Dict, 
                           check_date: date = None) -> Tuple[bool, Dict]:
        """
        Check if economic nexus thresholds are met for sales tax.
        
        Args:
            state: State abbreviation
            sales_data: Dictionary with sales and transaction data
            check_date: Date to check against (defaults to today)
            
        Returns:
            Tuple of (has_nexus, analysis_details)
        """
        if check_date is None:
            check_date = date.today()
            
        thresholds = self.config.ECONOMIC_NEXUS_THRESHOLDS.get(state, {})
        
        if not thresholds.get('sales') and not thresholds.get('transactions'):
            # No sales tax in this state
            return False, {'reason': 'no_sales_tax'}
        
        analysis = {
            'state': state,
            'check_date': check_date,
            'thresholds': thresholds,
            'actual_sales': sales_data.get('sales', Decimal('0')),
            'actual_transactions': sales_data.get('transactions', 0),
            'threshold_met': False,
            'reasons': []
        }
        
        # Check sales threshold
        sales_threshold = thresholds.get('sales')
        if sales_threshold and sales_data.get('sales', Decimal('0')) >= sales_threshold:
            analysis['threshold_met'] = True
            analysis['reasons'].append(f"Sales exceed ${sales_threshold:,.2f}")
        
        # Check transaction threshold
        transaction_threshold = thresholds.get('transactions')
        if transaction_threshold and sales_data.get('transactions', 0) >= transaction_threshold:
            analysis['threshold_met'] = True
            analysis['reasons'].append(f"Transactions exceed {transaction_threshold}")
        
        return analysis['threshold_met'], analysis
    
    def check_physical_presence_nexus(self, state: str, 
                                    check_date: date = None) -> Tuple[bool, Dict]:
        """
        Check if physical presence nexus exists in a state.
        
        Args:
            state: State abbreviation
            check_date: Date to check against (defaults to today)
            
        Returns:
            Tuple of (has_nexus, analysis_details)
        """
        if check_date is None:
            check_date = date.today()
        
        analysis = {
            'state': state,
            'check_date': check_date,
            'has_nexus': False,
            'nexus_activities': [],
            'reasons': []
        }
        
        # Check each activity for this state
        for activity in self.activities:
            if activity.state == state and activity.is_active(check_date):
                creates_nexus = self.config.PHYSICAL_PRESENCE_ACTIVITIES.get(
                    activity.activity_type.value, False
                )
                
                if creates_nexus:
                    analysis['has_nexus'] = True
                    analysis['nexus_activities'].append({
                        'type': activity.activity_type.value,
                        'description': activity.description,
                        'start_date': activity.start_date
                    })
                    analysis['reasons'].append(
                        f"{activity.activity_type.value}: {activity.description}"
                    )
        
        return analysis['has_nexus'], analysis
    
    def check_income_tax_nexus(self, state: str, business_data: Dict,
                             check_date: date = None) -> Tuple[bool, Dict]:
        """
        Check if income tax nexus exists in a state.
        
        Args:
            state: State abbreviation
            business_data: Business financial data
            check_date: Date to check against
            
        Returns:
            Tuple of (has_nexus, analysis_details)
        """
        if check_date is None:
            check_date = date.today()
            
        thresholds = self.config.INCOME_TAX_NEXUS_THRESHOLDS.get(state, {})
        
        analysis = {
            'state': state,
            'check_date': check_date,
            'thresholds': thresholds,
            'has_nexus': False,
            'reasons': []
        }
        
        # First check physical presence
        physical_nexus, _ = self.check_physical_presence_nexus(state, check_date)
        if physical_nexus:
            analysis['has_nexus'] = True
            analysis['reasons'].append("Physical presence nexus")
            return True, analysis
        
        # Check economic thresholds for income tax
        if not thresholds:
            return False, analysis
        
        # Check sales factor
        sales_threshold = thresholds.get('sales')
        if sales_threshold:
            state_sales = business_data.get(f'{state}_sales', Decimal('0'))
            if state_sales >= sales_threshold:
                analysis['has_nexus'] = True
                analysis['reasons'].append(
                    f"Sales in {state} exceed ${sales_threshold:,.2f}"
                )
        
        # Check property factor
        property_threshold = thresholds.get('property')
        if property_threshold:
            state_property = business_data.get(f'{state}_property', Decimal('0'))
            if state_property >= property_threshold:
                analysis['has_nexus'] = True
                analysis['reasons'].append(
                    f"Property in {state} exceeds ${property_threshold:,.2f}"
                )
        
        # Check payroll factor
        payroll_threshold = thresholds.get('payroll')
        if payroll_threshold:
            state_payroll = business_data.get(f'{state}_payroll', Decimal('0'))
            if state_payroll >= payroll_threshold:
                analysis['has_nexus'] = True
                analysis['reasons'].append(
                    f"Payroll in {state} exceeds ${payroll_threshold:,.2f}"
                )
        
        return analysis['has_nexus'], analysis
    
    def get_all_nexus_status(self, business_data: Dict, 
                           check_date: date = None) -> Dict[str, Dict[TaxType, NexusStatus]]:
        """
        Get comprehensive nexus status for all states and tax types.
        
        Args:
            business_data: Complete business data
            check_date: Date to check against
            
        Returns:
            Dictionary of nexus status by state and tax type
        """
        if check_date is None:
            check_date = date.today()
            
        all_states = set()
        
        # Get states from activities
        all_states.update(activity.state for activity in self.activities)
        
        # Get states from business data
        for key in business_data.keys():
            if '_sales' in key or '_payroll' in key or '_property' in key:
                state = key.split('_')[0].upper()
                if len(state) == 2:  # Valid state abbreviation
                    all_states.add(state)
        
        nexus_status = {}
        
        for state in all_states:
            nexus_status[state] = {}
            
            # Check sales tax nexus
            if state in self.config.ECONOMIC_NEXUS_THRESHOLDS:
                sales_data = {
                    'sales': business_data.get(f'{state}_sales', Decimal('0')),
                    'transactions': business_data.get(f'{state}_transactions', 0)
                }
                
                economic_nexus, economic_analysis = self.check_economic_nexus(
                    state, sales_data, check_date
                )
                physical_nexus, physical_analysis = self.check_physical_presence_nexus(
                    state, check_date
                )
                
                has_sales_nexus = economic_nexus or physical_nexus
                nexus_types = set()
                
                if economic_nexus:
                    nexus_types.add(NexusType.ECONOMIC_SALES)
                if physical_nexus:
                    nexus_types.add(NexusType.PHYSICAL_PRESENCE)
                
                nexus_status[state][TaxType.SALES_TAX] = NexusStatus(
                    state=state,
                    tax_type=TaxType.SALES_TAX,
                    has_nexus=has_sales_nexus,
                    nexus_types=nexus_types,
                    effective_date=check_date if has_sales_nexus else None,
                    threshold_analysis={
                        'economic': economic_analysis,
                        'physical': physical_analysis
                    }
                )
            
            # Check income tax nexus
            income_nexus, income_analysis = self.check_income_tax_nexus(
                state, business_data, check_date
            )
            
            income_nexus_types = set()
            if income_nexus:
                if any('Physical presence' in reason for reason in income_analysis['reasons']):
                    income_nexus_types.add(NexusType.PHYSICAL_PRESENCE)
                else:
                    income_nexus_types.add(NexusType.FACTOR_PRESENCE)
            
            nexus_status[state][TaxType.INCOME_TAX] = NexusStatus(
                state=state,
                tax_type=TaxType.INCOME_TAX,
                has_nexus=income_nexus,
                nexus_types=income_nexus_types,
                effective_date=check_date if income_nexus else None,
                threshold_analysis=income_analysis
            )
        
        return nexus_status
    
    def get_compliance_requirements(self, nexus_status: Dict) -> Dict[str, List[str]]:
        """
        Get compliance requirements based on nexus status.
        
        Args:
            nexus_status: Nexus status by state and tax type
            
        Returns:
            Dictionary of compliance requirements by state
        """
        requirements = {}
        
        for state, tax_types in nexus_status.items():
            state_requirements = []
            
            if TaxType.SALES_TAX in tax_types and tax_types[TaxType.SALES_TAX].has_nexus:
                state_requirements.extend([
                    "Register for sales tax permit",
                    "File periodic sales tax returns",
                    "Collect and remit sales tax on taxable sales",
                    "Maintain transaction records",
                    "Monitor exemption certificates"
                ])
            
            if TaxType.INCOME_TAX in tax_types and tax_types[TaxType.INCOME_TAX].has_nexus:
                state_requirements.extend([
                    "Register for income/franchise tax",
                    "File annual income tax return",
                    "Make estimated tax payments",
                    "Calculate proper apportionment",
                    "Maintain apportionment documentation"
                ])
            
            if state_requirements:
                requirements[state] = state_requirements
        
        return requirements
    
    def monitor_threshold_proximity(self, business_data: Dict, 
                                  proximity_percentage: Decimal = Decimal('0.80')) -> Dict:
        """
        Monitor proximity to nexus thresholds for early warning.
        
        Args:
            business_data: Business financial data
            proximity_percentage: Threshold proximity to warn at (default 80%)
            
        Returns:
            Dictionary of states approaching thresholds
        """
        warnings = {}
        
        for state, thresholds in self.config.ECONOMIC_NEXUS_THRESHOLDS.items():
            state_warnings = []
            
            # Check sales threshold proximity
            sales_threshold = thresholds.get('sales')
            if sales_threshold:
                current_sales = business_data.get(f'{state}_sales', Decimal('0'))
                warning_threshold = sales_threshold * proximity_percentage
                
                if current_sales >= warning_threshold and current_sales < sales_threshold:
                    percentage = (current_sales / sales_threshold) * 100
                    state_warnings.append({
                        'type': 'sales',
                        'current': current_sales,
                        'threshold': sales_threshold,
                        'percentage': percentage,
                        'remaining': sales_threshold - current_sales
                    })
            
            # Check transaction threshold proximity
            transaction_threshold = thresholds.get('transactions')
            if transaction_threshold:
                current_transactions = business_data.get(f'{state}_transactions', 0)
                warning_threshold = transaction_threshold * proximity_percentage
                
                if current_transactions >= warning_threshold and current_transactions < transaction_threshold:
                    percentage = (current_transactions / transaction_threshold) * 100
                    state_warnings.append({
                        'type': 'transactions',
                        'current': current_transactions,
                        'threshold': transaction_threshold,
                        'percentage': percentage,
                        'remaining': transaction_threshold - current_transactions
                    })
            
            if state_warnings:
                warnings[state] = state_warnings
        
        return warnings
    
    def get_nexus_establishment_date(self, state: str, tax_type: TaxType) -> Optional[date]:
        """
        Determine when nexus was first established in a state.
        
        Args:
            state: State abbreviation
            tax_type: Type of tax nexus
            
        Returns:
            Date when nexus was established, or None
        """
        earliest_date = None
        
        # Check physical presence activities
        for activity in self.activities:
            if activity.state == state:
                creates_nexus = self.config.PHYSICAL_PRESENCE_ACTIVITIES.get(
                    activity.activity_type.value, False
                )
                if creates_nexus:
                    if earliest_date is None or activity.start_date < earliest_date:
                        earliest_date = activity.start_date
        
        return earliest_date
    
    def validate_nexus_data(self, business_data: Dict) -> List[str]:
        """
        Validate nexus-related business data for completeness and accuracy.
        
        Args:
            business_data: Business data to validate
            
        Returns:
            List of validation errors or warnings
        """
        warnings = []
        
        # Check for missing state data
        states_with_activities = set(activity.state for activity in self.activities)
        
        for state in states_with_activities:
            if f'{state}_sales' not in business_data:
                warnings.append(f"Missing sales data for {state}")
            if f'{state}_transactions' not in business_data:
                warnings.append(f"Missing transaction count for {state}")
        
        # Check for suspicious data patterns
        for state in states_with_activities:
            sales = business_data.get(f'{state}_sales', Decimal('0'))
            transactions = business_data.get(f'{state}_transactions', 0)
            
            if sales > 0 and transactions == 0:
                warnings.append(f"Sales reported for {state} but no transactions")
            
            if transactions > 0 and sales == 0:
                warnings.append(f"Transactions reported for {state} but no sales")
        
        return warnings