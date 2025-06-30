from abc import ABC, abstractmethod
from datetime import date, datetime
from decimal import Decimal
from typing import Dict, List, Optional, Tuple, Any
import re
from django.core.exceptions import ValidationError


class BaseStateHandler(ABC):
    """Base class for state-specific sales tax e-filing handlers"""
    
    def __init__(self, state_code: str, state_name: str):
        self.state_code = state_code
        self.state_name = state_name
        self.api_base_url = None  # To be set by each state
        self.api_version = "v1"
        
    @abstractmethod
    def get_filing_frequency(self, annual_revenue: Decimal) -> str:
        """Determine filing frequency based on annual revenue"""
        pass
    
    @abstractmethod
    def get_form_requirements(self) -> Dict[str, Any]:
        """Get state-specific form requirements"""
        pass
    
    @abstractmethod
    def validate_filing_data(self, data: Dict) -> Tuple[bool, List[str]]:
        """Validate filing data against state requirements"""
        pass
    
    @abstractmethod
    def calculate_due_date(self, period_end: date) -> date:
        """Calculate filing due date based on period end"""
        pass
    
    @abstractmethod
    def get_api_endpoints(self) -> Dict[str, str]:
        """Get state-specific API endpoints for e-filing"""
        pass
    
    def validate_ein(self, ein: str) -> bool:
        """Validate Employer Identification Number format"""
        pattern = r'^\d{2}-\d{7}$'
        return bool(re.match(pattern, ein))
    
    def validate_state_registration(self, registration_number: str) -> bool:
        """Basic validation for state registration number"""
        # Override in state-specific handlers for custom validation
        return bool(registration_number and len(registration_number) >= 5)
    
    def format_currency(self, amount: Decimal) -> str:
        """Format decimal as currency string"""
        return f"{amount:,.2f}"
    
    def get_exemption_codes(self) -> List[Dict[str, str]]:
        """Get list of valid exemption codes for the state"""
        # Common exemptions - override for state-specific
        return [
            {"code": "RESALE", "description": "Resale Certificate"},
            {"code": "EXEMPT", "description": "Tax Exempt Organization"},
            {"code": "GOVT", "description": "Government Agency"},
            {"code": "AGRI", "description": "Agricultural Exemption"},
        ]


class CaliforniaHandler(BaseStateHandler):
    """California (CA) sales tax e-filing handler"""
    
    def __init__(self):
        super().__init__("CA", "California")
        self.api_base_url = "https://onlineservices.cdtfa.ca.gov/api"
        self.tax_rate_base = Decimal("0.0725")  # 7.25% state rate
        
    def get_filing_frequency(self, annual_revenue: Decimal) -> str:
        if annual_revenue >= 1000000:
            return "monthly"
        elif annual_revenue >= 100000:
            return "quarterly"
        else:
            return "annually"
    
    def get_form_requirements(self) -> Dict[str, Any]:
        return {
            "form_number": "BOE-401-A",
            "form_name": "State, Local and District Sales and Use Tax Return",
            "required_fields": [
                "gross_sales",
                "taxable_sales",
                "tax_collected",
                "seller_permit_number",
                "reporting_period",
                "district_taxes"
            ],
            "supports_efile": True,
            "efile_formats": ["XML", "JSON"],
            "attachments_required": ["Schedule A - District Tax"],
        }
    
    def validate_filing_data(self, data: Dict) -> Tuple[bool, List[str]]:
        errors = []
        
        # Validate seller's permit format (e.g., XXX-XXXXXX)
        if not re.match(r'^\d{3}-\d{6}$', data.get('seller_permit_number', '')):
            errors.append("Invalid seller's permit number format")
            
        # Validate required amounts
        for field in ['gross_sales', 'taxable_sales', 'tax_collected']:
            if field not in data or data[field] < 0:
                errors.append(f"{field} must be a positive number")
                
        # California-specific: District taxes must be reported
        if 'district_taxes' not in data:
            errors.append("District tax information is required")
            
        return len(errors) == 0, errors
    
    def calculate_due_date(self, period_end: date) -> date:
        # California: Due on the last day of the month following the reporting period
        if period_end.month == 12:
            return date(period_end.year + 1, 1, 31)
        else:
            # Get last day of next month
            next_month = period_end.month + 1
            if next_month in [1, 3, 5, 7, 8, 10, 12]:
                day = 31
            elif next_month in [4, 6, 9, 11]:
                day = 30
            else:  # February
                day = 29 if period_end.year % 4 == 0 else 28
            return date(period_end.year, next_month, day)
    
    def get_api_endpoints(self) -> Dict[str, str]:
        return {
            "auth": f"{self.api_base_url}/auth/token",
            "validate": f"{self.api_base_url}/returns/validate",
            "submit": f"{self.api_base_url}/returns/submit",
            "status": f"{self.api_base_url}/returns/status",
            "districts": f"{self.api_base_url}/districts/lookup",
        }


class TexasHandler(BaseStateHandler):
    """Texas (TX) sales tax e-filing handler"""
    
    def __init__(self):
        super().__init__("TX", "Texas")
        self.api_base_url = "https://webfile.comptroller.texas.gov/api"
        self.tax_rate_base = Decimal("0.0625")  # 6.25% state rate
        
    def get_filing_frequency(self, annual_revenue: Decimal) -> str:
        if annual_revenue >= 500000:
            return "monthly"
        elif annual_revenue >= 20000:
            return "quarterly"
        else:
            return "annually"
    
    def get_form_requirements(self) -> Dict[str, Any]:
        return {
            "form_number": "01-114",
            "form_name": "Texas Sales and Use Tax Return",
            "required_fields": [
                "total_sales",
                "taxable_sales",
                "tax_due",
                "taxpayer_number",
                "outlet_number",
                "reporting_period"
            ],
            "supports_efile": True,
            "efile_formats": ["XML"],
            "prepayment_discount": Decimal("0.005"),  # 0.5% discount for timely filing
        }
    
    def validate_filing_data(self, data: Dict) -> Tuple[bool, List[str]]:
        errors = []
        
        # Validate Texas taxpayer number (11 digits)
        if not re.match(r'^\d{11}$', data.get('taxpayer_number', '')):
            errors.append("Invalid taxpayer number - must be 11 digits")
            
        # Validate outlet number (7 digits)
        if not re.match(r'^\d{7}$', data.get('outlet_number', '')):
            errors.append("Invalid outlet number - must be 7 digits")
            
        # Standard validations
        for field in ['total_sales', 'taxable_sales', 'tax_due']:
            if field not in data or data[field] < 0:
                errors.append(f"{field} must be a positive number")
                
        return len(errors) == 0, errors
    
    def calculate_due_date(self, period_end: date) -> date:
        # Texas: Due on the 20th of the month following the reporting period
        if period_end.month == 12:
            return date(period_end.year + 1, 1, 20)
        else:
            return date(period_end.year, period_end.month + 1, 20)
    
    def get_api_endpoints(self) -> Dict[str, str]:
        return {
            "auth": f"{self.api_base_url}/authentication",
            "validate": f"{self.api_base_url}/salestax/validate",
            "submit": f"{self.api_base_url}/salestax/file",
            "status": f"{self.api_base_url}/salestax/status",
            "payment": f"{self.api_base_url}/salestax/payment",
        }


class FloridaHandler(BaseStateHandler):
    """Florida (FL) sales tax e-filing handler"""
    
    def __init__(self):
        super().__init__("FL", "Florida")
        self.api_base_url = "https://floridarevenue.com/eservices/api"
        self.tax_rate_base = Decimal("0.06")  # 6% state rate
        
    def get_filing_frequency(self, annual_revenue: Decimal) -> str:
        # Florida uses tax collected amount for frequency
        if annual_revenue * self.tax_rate_base >= 1000:  # Monthly if > $1000 tax/month
            return "monthly"
        elif annual_revenue * self.tax_rate_base >= 100:  # Quarterly if > $100 tax/month
            return "quarterly"
        else:
            return "annually"
    
    def get_form_requirements(self) -> Dict[str, Any]:
        return {
            "form_number": "DR-15",
            "form_name": "Sales and Use Tax Return",
            "required_fields": [
                "gross_sales",
                "exempt_sales",
                "taxable_amount",
                "tax_collected",
                "certificate_number",
                "collection_allowance"
            ],
            "supports_efile": True,
            "efile_formats": ["XML", "EDI"],
            "collection_allowance": Decimal("0.025"),  # 2.5% collection allowance
        }
    
    def validate_filing_data(self, data: Dict) -> Tuple[bool, List[str]]:
        errors = []
        
        # Validate certificate number format
        cert_num = data.get('certificate_number', '')
        if not re.match(r'^\d{2}-\d{11}-\d{1}$', cert_num):
            errors.append("Invalid certificate number format (XX-XXXXXXXXXXX-X)")
            
        # Florida specific: validate collection allowance
        if 'collection_allowance' in data:
            tax_collected = data.get('tax_collected', 0)
            max_allowance = min(tax_collected * self.get_form_requirements()['collection_allowance'], 30)
            if data['collection_allowance'] > max_allowance:
                errors.append(f"Collection allowance cannot exceed ${max_allowance:.2f}")
                
        # Standard validations
        for field in ['gross_sales', 'taxable_amount', 'tax_collected']:
            if field not in data or data[field] < 0:
                errors.append(f"{field} must be a positive number")
                
        return len(errors) == 0, errors
    
    def calculate_due_date(self, period_end: date) -> date:
        # Florida: Due on the 20th for monthly, last day for quarterly/annual
        if self.get_filing_frequency(Decimal("100000")) == "monthly":  # Example
            if period_end.month == 12:
                return date(period_end.year + 1, 1, 20)
            else:
                return date(period_end.year, period_end.month + 1, 20)
        else:
            # Last day of the month following
            if period_end.month == 12:
                return date(period_end.year + 1, 1, 31)
            else:
                next_month = period_end.month + 1
                if next_month in [1, 3, 5, 7, 8, 10, 12]:
                    day = 31
                elif next_month in [4, 6, 9, 11]:
                    day = 30
                else:
                    day = 29 if period_end.year % 4 == 0 else 28
                return date(period_end.year, next_month, day)
    
    def get_api_endpoints(self) -> Dict[str, str]:
        return {
            "auth": f"{self.api_base_url}/auth/login",
            "validate": f"{self.api_base_url}/dr15/validate",
            "submit": f"{self.api_base_url}/dr15/submit",
            "status": f"{self.api_base_url}/dr15/status",
            "suntax": f"{self.api_base_url}/suntax/rates",  # Discretionary sales surtax
        }


class NewYorkHandler(BaseStateHandler):
    """New York (NY) sales tax e-filing handler"""
    
    def __init__(self):
        super().__init__("NY", "New York")
        self.api_base_url = "https://www.tax.ny.gov/online/api"
        self.tax_rate_base = Decimal("0.04")  # 4% state rate
        
    def get_filing_frequency(self, annual_revenue: Decimal) -> str:
        if annual_revenue >= 3000000:
            return "monthly"
        elif annual_revenue >= 300000:
            return "quarterly"
        else:
            return "annually"
    
    def get_form_requirements(self) -> Dict[str, Any]:
        return {
            "form_number": "ST-100",
            "form_name": "New York State and Local Sales and Use Tax Return",
            "required_fields": [
                "gross_sales",
                "taxable_sales",
                "state_tax",
                "local_tax",
                "mctd_tax",  # Metropolitan Commuter Transportation District
                "certificate_of_authority",
                "vendor_id"
            ],
            "supports_efile": True,
            "efile_formats": ["XML"],
            "requires_schedule": ["Schedule A", "Schedule B"],  # Jurisdiction breakdown
        }
    
    def validate_filing_data(self, data: Dict) -> Tuple[bool, List[str]]:
        errors = []
        
        # Validate Certificate of Authority
        if not re.match(r'^\d{8}$', data.get('certificate_of_authority', '')):
            errors.append("Certificate of Authority must be 8 digits")
            
        # NY specific: MCTD tax applies to specific counties
        if 'mctd_applicable' in data and data['mctd_applicable']:
            if 'mctd_tax' not in data or data['mctd_tax'] < 0:
                errors.append("MCTD tax amount is required for applicable jurisdictions")
                
        # Validate vendor ID
        if not data.get('vendor_id'):
            errors.append("Vendor ID is required")
            
        # Standard validations
        for field in ['gross_sales', 'taxable_sales', 'state_tax', 'local_tax']:
            if field not in data or data[field] < 0:
                errors.append(f"{field} must be a positive number")
                
        return len(errors) == 0, errors
    
    def calculate_due_date(self, period_end: date) -> date:
        # New York: Due on the 20th of the month following
        if period_end.month == 12:
            return date(period_end.year + 1, 1, 20)
        else:
            return date(period_end.year, period_end.month + 1, 20)
    
    def get_api_endpoints(self) -> Dict[str, str]:
        return {
            "auth": f"{self.api_base_url}/auth",
            "validate": f"{self.api_base_url}/sales-tax/validate",
            "submit": f"{self.api_base_url}/sales-tax/file",
            "status": f"{self.api_base_url}/sales-tax/status",
            "jurisdictions": f"{self.api_base_url}/jurisdictions",
        }


class PennsylvaniaHandler(BaseStateHandler):
    """Pennsylvania (PA) sales tax e-filing handler"""
    
    def __init__(self):
        super().__init__("PA", "Pennsylvania")
        self.api_base_url = "https://mypath.pa.gov/api"
        self.tax_rate_base = Decimal("0.06")  # 6% state rate
        
    def get_filing_frequency(self, annual_revenue: Decimal) -> str:
        if annual_revenue >= 600000:
            return "monthly"
        elif annual_revenue >= 75000:
            return "quarterly"
        else:
            return "annually"
    
    def get_form_requirements(self) -> Dict[str, Any]:
        return {
            "form_number": "PA-3",
            "form_name": "PA Sales, Use and Hotel Occupancy Tax Return",
            "required_fields": [
                "gross_sales",
                "taxable_sales",
                "tax_due",
                "sales_tax_license",
                "reporting_period",
                "discount_taken"
            ],
            "supports_efile": True,
            "efile_formats": ["XML"],
            "discount_rate": Decimal("0.01"),  # 1% discount for timely filing
        }
    
    def validate_filing_data(self, data: Dict) -> Tuple[bool, List[str]]:
        errors = []
        
        # Validate sales tax license (8 digits)
        if not re.match(r'^\d{8}$', data.get('sales_tax_license', '')):
            errors.append("Sales tax license must be 8 digits")
            
        # PA specific: discount validation
        if 'discount_taken' in data:
            max_discount = data.get('tax_due', 0) * self.get_form_requirements()['discount_rate']
            if data['discount_taken'] > max_discount:
                errors.append(f"Discount cannot exceed 1% of tax due (${max_discount:.2f})")
                
        # Standard validations
        for field in ['gross_sales', 'taxable_sales', 'tax_due']:
            if field not in data or data[field] < 0:
                errors.append(f"{field} must be a positive number")
                
        return len(errors) == 0, errors
    
    def calculate_due_date(self, period_end: date) -> date:
        # Pennsylvania: Due on the 20th of the month following
        if period_end.month == 12:
            return date(period_end.year + 1, 1, 20)
        else:
            return date(period_end.year, period_end.month + 1, 20)
    
    def get_api_endpoints(self) -> Dict[str, str]:
        return {
            "auth": f"{self.api_base_url}/auth/token",
            "validate": f"{self.api_base_url}/pa3/validate",
            "submit": f"{self.api_base_url}/pa3/submit",
            "status": f"{self.api_base_url}/pa3/status",
            "payment": f"{self.api_base_url}/payment/submit",
        }


class IllinoisHandler(BaseStateHandler):
    """Illinois (IL) sales tax e-filing handler"""
    
    def __init__(self):
        super().__init__("IL", "Illinois")
        self.api_base_url = "https://mytax.illinois.gov/api"
        self.tax_rate_base = Decimal("0.0625")  # 6.25% state rate
        
    def get_filing_frequency(self, annual_revenue: Decimal) -> str:
        # Illinois based on average monthly tax liability
        monthly_tax = (annual_revenue * self.tax_rate_base) / 12
        if monthly_tax >= 1000:
            return "monthly"
        elif monthly_tax >= 200:
            return "quarterly"
        else:
            return "annually"
    
    def get_form_requirements(self) -> Dict[str, Any]:
        return {
            "form_number": "ST-1",
            "form_name": "Sales and Use Tax Return",
            "required_fields": [
                "gross_receipts",
                "deductions",
                "net_taxable_receipts",
                "state_tax",
                "local_tax",
                "account_id",
                "location_codes"
            ],
            "supports_efile": True,
            "efile_formats": ["XML", "CSV"],
            "discount_rate": Decimal("0.0175"),  # 1.75% timely discount
        }
    
    def validate_filing_data(self, data: Dict) -> Tuple[bool, List[str]]:
        errors = []
        
        # Validate account ID format
        if not re.match(r'^\d{4}-\d{4}$', data.get('account_id', '')):
            errors.append("Account ID must be in format XXXX-XXXX")
            
        # Illinois specific: location codes required for multi-location
        if data.get('num_locations', 1) > 1 and not data.get('location_codes'):
            errors.append("Location codes are required for multi-location businesses")
            
        # Standard validations
        for field in ['gross_receipts', 'net_taxable_receipts', 'state_tax']:
            if field not in data or data[field] < 0:
                errors.append(f"{field} must be a positive number")
                
        return len(errors) == 0, errors
    
    def calculate_due_date(self, period_end: date) -> date:
        # Illinois: Due on the 20th of the month following
        if period_end.month == 12:
            return date(period_end.year + 1, 1, 20)
        else:
            return date(period_end.year, period_end.month + 1, 20)
    
    def get_api_endpoints(self) -> Dict[str, str]:
        return {
            "auth": f"{self.api_base_url}/auth/login",
            "validate": f"{self.api_base_url}/st1/validate",
            "submit": f"{self.api_base_url}/st1/file",
            "status": f"{self.api_base_url}/st1/status",
            "rates": f"{self.api_base_url}/rates/lookup",
        }


class OhioHandler(BaseStateHandler):
    """Ohio (OH) sales tax e-filing handler"""
    
    def __init__(self):
        super().__init__("OH", "Ohio")
        self.api_base_url = "https://bizfile.ohio.gov/api"
        self.tax_rate_base = Decimal("0.0575")  # 5.75% state rate
        
    def get_filing_frequency(self, annual_revenue: Decimal) -> str:
        # Ohio uses tax liability thresholds
        annual_tax = annual_revenue * self.tax_rate_base
        if annual_tax >= 9600:  # $800/month average
            return "monthly"
        elif annual_tax >= 4800:  # $400/month average
            return "quarterly"
        else:
            return "semi-annually"
    
    def get_form_requirements(self) -> Dict[str, Any]:
        return {
            "form_number": "UST-1",
            "form_name": "Universal Sales and Use Tax Return",
            "required_fields": [
                "gross_sales",
                "taxable_sales",
                "tax_due",
                "vendor_license",
                "county_codes",
                "transit_authority_tax"
            ],
            "supports_efile": True,
            "efile_formats": ["XML"],
            "accelerated_payment": True,  # Large vendors pay early
        }
    
    def validate_filing_data(self, data: Dict) -> Tuple[bool, List[str]]:
        errors = []
        
        # Validate vendor license
        if not re.match(r'^\d{8,10}$', data.get('vendor_license', '')):
            errors.append("Vendor license must be 8-10 digits")
            
        # Ohio specific: County codes required
        if not data.get('county_codes'):
            errors.append("County codes are required for Ohio filings")
            
        # Transit authority tax validation
        if data.get('has_transit_tax') and 'transit_authority_tax' not in data:
            errors.append("Transit authority tax amount is required")
            
        # Standard validations
        for field in ['gross_sales', 'taxable_sales', 'tax_due']:
            if field not in data or data[field] < 0:
                errors.append(f"{field} must be a positive number")
                
        return len(errors) == 0, errors
    
    def calculate_due_date(self, period_end: date) -> date:
        # Ohio: Due on the 23rd of the month following
        if period_end.month == 12:
            return date(period_end.year + 1, 1, 23)
        else:
            return date(period_end.year, period_end.month + 1, 23)
    
    def get_api_endpoints(self) -> Dict[str, str]:
        return {
            "auth": f"{self.api_base_url}/auth",
            "validate": f"{self.api_base_url}/ust1/validate",
            "submit": f"{self.api_base_url}/ust1/submit",
            "status": f"{self.api_base_url}/ust1/status",
            "counties": f"{self.api_base_url}/counties/list",
        }


class NorthCarolinaHandler(BaseStateHandler):
    """North Carolina (NC) sales tax e-filing handler"""
    
    def __init__(self):
        super().__init__("NC", "North Carolina")
        self.api_base_url = "https://eservices.ncdor.gov/api"
        self.tax_rate_base = Decimal("0.0475")  # 4.75% state rate
        
    def get_filing_frequency(self, annual_revenue: Decimal) -> str:
        # NC based on average monthly liability
        monthly_tax = (annual_revenue * self.tax_rate_base) / 12
        if monthly_tax >= 100:
            return "monthly"
        elif monthly_tax >= 20:
            return "quarterly"
        else:
            return "annually"
    
    def get_form_requirements(self) -> Dict[str, Any]:
        return {
            "form_number": "E-500",
            "form_name": "Sales and Use Tax Return",
            "required_fields": [
                "gross_sales",
                "exempt_sales",
                "state_taxable_sales",
                "county_taxable_sales",
                "state_tax",
                "county_tax",
                "account_id"
            ],
            "supports_efile": True,
            "efile_formats": ["XML", "CSV"],
            "county_rate": Decimal("0.02"),  # Additional 2-2.75% county rate
        }
    
    def validate_filing_data(self, data: Dict) -> Tuple[bool, List[str]]:
        errors = []
        
        # Validate account ID (FEIN + 3-digit suffix)
        if not re.match(r'^\d{2}-\d{7}-\d{3}$', data.get('account_id', '')):
            errors.append("Account ID must be in format XX-XXXXXXX-XXX")
            
        # NC specific: County tax is mandatory
        if 'county_tax' not in data or data['county_tax'] < 0:
            errors.append("County tax amount is required")
            
        # Validate state vs county taxable sales
        if data.get('state_taxable_sales', 0) != data.get('county_taxable_sales', 0):
            errors.append("State and county taxable sales should typically match")
            
        # Standard validations
        for field in ['gross_sales', 'state_taxable_sales', 'state_tax']:
            if field not in data or data[field] < 0:
                errors.append(f"{field} must be a positive number")
                
        return len(errors) == 0, errors
    
    def calculate_due_date(self, period_end: date) -> date:
        # North Carolina: Due on the 15th of the month following
        if period_end.month == 12:
            return date(period_end.year + 1, 1, 15)
        else:
            return date(period_end.year, period_end.month + 1, 15)
    
    def get_api_endpoints(self) -> Dict[str, str]:
        return {
            "auth": f"{self.api_base_url}/auth/oauth",
            "validate": f"{self.api_base_url}/e500/validate",
            "submit": f"{self.api_base_url}/e500/submit",
            "status": f"{self.api_base_url}/e500/status",
            "rates": f"{self.api_base_url}/rates/combined",
        }


class GeorgiaHandler(BaseStateHandler):
    """Georgia (GA) sales tax e-filing handler"""
    
    def __init__(self):
        super().__init__("GA", "Georgia")
        self.api_base_url = "https://gtc.dor.ga.gov/api"
        self.tax_rate_base = Decimal("0.04")  # 4% state rate
        
    def get_filing_frequency(self, annual_revenue: Decimal) -> str:
        # Georgia based on gross sales
        if annual_revenue >= 5000000:
            return "monthly"
        elif annual_revenue >= 200000:
            return "quarterly"
        else:
            return "annually"
    
    def get_form_requirements(self) -> Dict[str, Any]:
        return {
            "form_number": "ST-3",
            "form_name": "State Sales and Use Tax Return",
            "required_fields": [
                "gross_sales",
                "deductions",
                "net_taxable_sales",
                "state_tax",
                "local_tax",
                "sales_tax_number",
                "local_jurisdiction_codes"
            ],
            "supports_efile": True,
            "efile_formats": ["XML"],
            "prepayment_required": False,
        }
    
    def validate_filing_data(self, data: Dict) -> Tuple[bool, List[str]]:
        errors = []
        
        # Validate sales tax number
        if not re.match(r'^\d{9}$', data.get('sales_tax_number', '')):
            errors.append("Sales tax number must be 9 digits")
            
        # Georgia specific: Local jurisdiction codes
        if data.get('has_local_tax') and not data.get('local_jurisdiction_codes'):
            errors.append("Local jurisdiction codes required when local tax is collected")
            
        # Standard validations
        for field in ['gross_sales', 'net_taxable_sales', 'state_tax']:
            if field not in data or data[field] < 0:
                errors.append(f"{field} must be a positive number")
                
        return len(errors) == 0, errors
    
    def calculate_due_date(self, period_end: date) -> date:
        # Georgia: Due on the 20th of the month following
        if period_end.month == 12:
            return date(period_end.year + 1, 1, 20)
        else:
            return date(period_end.year, period_end.month + 1, 20)
    
    def get_api_endpoints(self) -> Dict[str, str]:
        return {
            "auth": f"{self.api_base_url}/authentication",
            "validate": f"{self.api_base_url}/st3/validate",
            "submit": f"{self.api_base_url}/st3/file",
            "status": f"{self.api_base_url}/st3/status",
            "jurisdictions": f"{self.api_base_url}/jurisdictions",
        }


class NewJerseyHandler(BaseStateHandler):
    """New Jersey (NJ) sales tax e-filing handler"""
    
    def __init__(self):
        super().__init__("NJ", "New Jersey")
        self.api_base_url = "https://www.state.nj.us/treasury/taxation/api"
        self.tax_rate_base = Decimal("0.06625")  # 6.625% state rate
        
    def get_filing_frequency(self, annual_revenue: Decimal) -> str:
        # NJ based on tax liability
        annual_tax = annual_revenue * self.tax_rate_base
        if annual_tax >= 30000:
            return "monthly"
        elif annual_tax >= 500:
            return "quarterly"
        else:
            return "annually"
    
    def get_form_requirements(self) -> Dict[str, Any]:
        return {
            "form_number": "ST-51",
            "form_name": "Monthly Remittance Statement for Sales and Use Tax",
            "required_fields": [
                "gross_receipts",
                "deductions",
                "taxable_receipts",
                "tax_due",
                "certificate_number",
                "urban_enterprise_zone"
            ],
            "supports_efile": True,
            "efile_formats": ["XML"],
            "uez_rate": Decimal("0.03125"),  # Reduced rate for Urban Enterprise Zones
        }
    
    def validate_filing_data(self, data: Dict) -> Tuple[bool, List[str]]:
        errors = []
        
        # Validate certificate number (12 digits)
        if not re.match(r'^\d{12}$', data.get('certificate_number', '')):
            errors.append("Certificate number must be 12 digits")
            
        # NJ specific: UEZ validation
        if data.get('urban_enterprise_zone'):
            if 'uez_sales' not in data:
                errors.append("UEZ sales amount required when in Urban Enterprise Zone")
                
        # Standard validations
        for field in ['gross_receipts', 'taxable_receipts', 'tax_due']:
            if field not in data or data[field] < 0:
                errors.append(f"{field} must be a positive number")
                
        return len(errors) == 0, errors
    
    def calculate_due_date(self, period_end: date) -> date:
        # New Jersey: Due on the 20th of the month following
        if period_end.month == 12:
            return date(period_end.year + 1, 1, 20)
        else:
            return date(period_end.year, period_end.month + 1, 20)
    
    def get_api_endpoints(self) -> Dict[str, str]:
        return {
            "auth": f"{self.api_base_url}/auth/login",
            "validate": f"{self.api_base_url}/st51/validate",
            "submit": f"{self.api_base_url}/st51/submit",
            "status": f"{self.api_base_url}/st51/status",
            "uez": f"{self.api_base_url}/uez/locations",
        }


class VirginiaHandler(BaseStateHandler):
    """Virginia (VA) sales tax e-filing handler"""
    
    def __init__(self):
        super().__init__("VA", "Virginia")
        self.api_base_url = "https://www.tax.virginia.gov/api"
        self.tax_rate_base = Decimal("0.043")  # 4.3% state rate + 1% local
        
    def get_filing_frequency(self, annual_revenue: Decimal) -> str:
        # Virginia based on annual sales
        if annual_revenue >= 960000:
            return "monthly"
        elif annual_revenue >= 12000:
            return "quarterly"
        else:
            return "annually"
    
    def get_form_requirements(self) -> Dict[str, Any]:
        return {
            "form_number": "ST-9",
            "form_name": "Retail Sales and Use Tax Return",
            "required_fields": [
                "gross_sales",
                "exempt_sales",
                "taxable_sales",
                "state_tax",
                "local_tax",
                "dealer_account_number",
                "discount_taken"
            ],
            "supports_efile": True,
            "efile_formats": ["XML"],
            "dealer_discount": Decimal("0.011"),  # 1.1% dealer discount
        }
    
    def validate_filing_data(self, data: Dict) -> Tuple[bool, List[str]]:
        errors = []
        
        # Validate dealer account number
        if not re.match(r'^\d{2}-\d{6}$', data.get('dealer_account_number', '')):
            errors.append("Dealer account number must be in format XX-XXXXXX")
            
        # VA specific: Discount validation
        if 'discount_taken' in data:
            max_discount = data.get('state_tax', 0) * self.get_form_requirements()['dealer_discount']
            if data['discount_taken'] > max_discount:
                errors.append(f"Dealer discount cannot exceed ${max_discount:.2f}")
                
        # Standard validations
        for field in ['gross_sales', 'taxable_sales', 'state_tax']:
            if field not in data or data[field] < 0:
                errors.append(f"{field} must be a positive number")
                
        return len(errors) == 0, errors
    
    def calculate_due_date(self, period_end: date) -> date:
        # Virginia: Due on the 20th of the month following
        if period_end.month == 12:
            return date(period_end.year + 1, 1, 20)
        else:
            return date(period_end.year, period_end.month + 1, 20)
    
    def get_api_endpoints(self) -> Dict[str, str]:
        return {
            "auth": f"{self.api_base_url}/auth/token",
            "validate": f"{self.api_base_url}/st9/validate",
            "submit": f"{self.api_base_url}/st9/file",
            "status": f"{self.api_base_url}/st9/status",
            "localities": f"{self.api_base_url}/localities/rates",
        }


class WashingtonHandler(BaseStateHandler):
    """Washington (WA) sales tax e-filing handler"""
    
    def __init__(self):
        super().__init__("WA", "Washington")
        self.api_base_url = "https://secure.dor.wa.gov/api"
        self.tax_rate_base = Decimal("0.065")  # 6.5% state rate
        
    def get_filing_frequency(self, annual_revenue: Decimal) -> str:
        # Washington based on annual gross income
        if annual_revenue >= 4800000:
            return "monthly"
        elif annual_revenue >= 28000:
            return "quarterly"
        else:
            return "annually"
    
    def get_form_requirements(self) -> Dict[str, Any]:
        return {
            "form_number": "Combined Excise Tax Return",
            "form_name": "Washington Combined Excise Tax Return",
            "required_fields": [
                "gross_income",
                "retailing_income",
                "retail_sales_tax",
                "b_and_o_tax",
                "tax_registration_number",
                "location_codes"
            ],
            "supports_efile": True,
            "efile_formats": ["XML", "EDI"],
            "includes_b_and_o": True,  # Business & Occupation tax
        }
    
    def validate_filing_data(self, data: Dict) -> Tuple[bool, List[str]]:
        errors = []
        
        # Validate tax registration number (UBI)
        if not re.match(r'^\d{9}$', data.get('tax_registration_number', '')):
            errors.append("Tax registration number (UBI) must be 9 digits")
            
        # WA specific: B&O tax required
        if 'b_and_o_tax' not in data:
            errors.append("Business & Occupation tax calculation is required")
            
        # Location codes for multi-location
        if data.get('num_locations', 1) > 1 and not data.get('location_codes'):
            errors.append("Location codes required for multi-location businesses")
            
        # Standard validations
        for field in ['gross_income', 'retailing_income', 'retail_sales_tax']:
            if field not in data or data[field] < 0:
                errors.append(f"{field} must be a positive number")
                
        return len(errors) == 0, errors
    
    def calculate_due_date(self, period_end: date) -> date:
        # Washington: Due on the 25th of the month following
        if period_end.month == 12:
            return date(period_end.year + 1, 1, 25)
        else:
            return date(period_end.year, period_end.month + 1, 25)
    
    def get_api_endpoints(self) -> Dict[str, str]:
        return {
            "auth": f"{self.api_base_url}/auth",
            "validate": f"{self.api_base_url}/excise/validate",
            "submit": f"{self.api_base_url}/excise/file",
            "status": f"{self.api_base_url}/excise/status",
            "rates": f"{self.api_base_url}/rates/lookup",
        }


class MassachusettsHandler(BaseStateHandler):
    """Massachusetts (MA) sales tax e-filing handler"""
    
    def __init__(self):
        super().__init__("MA", "Massachusetts")
        self.api_base_url = "https://mtc.smartfile.com/api"
        self.tax_rate_base = Decimal("0.0625")  # 6.25% state rate
        
    def get_filing_frequency(self, annual_revenue: Decimal) -> str:
        # MA based on annual sales
        if annual_revenue >= 1200000:
            return "monthly"
        elif annual_revenue >= 100000:
            return "quarterly"
        else:
            return "annually"
    
    def get_form_requirements(self) -> Dict[str, Any]:
        return {
            "form_number": "ST-9",
            "form_name": "Massachusetts Sales and Use Tax Return",
            "required_fields": [
                "gross_sales",
                "exempt_sales",
                "taxable_sales",
                "tax_due",
                "vendor_registration",
                "sales_tax_on_meals"
            ],
            "supports_efile": True,
            "efile_formats": ["XML"],
            "meals_tax_rate": Decimal("0.0075"),  # Additional 0.75% on meals
        }
    
    def validate_filing_data(self, data: Dict) -> Tuple[bool, List[str]]:
        errors = []
        
        # Validate vendor registration
        if not re.match(r'^[A-Z0-9]{8}$', data.get('vendor_registration', '')):
            errors.append("Vendor registration must be 8 alphanumeric characters")
            
        # MA specific: Meals tax
        if data.get('has_meal_sales') and 'sales_tax_on_meals' not in data:
            errors.append("Meals tax amount required when meal sales are present")
            
        # Standard validations
        for field in ['gross_sales', 'taxable_sales', 'tax_due']:
            if field not in data or data[field] < 0:
                errors.append(f"{field} must be a positive number")
                
        return len(errors) == 0, errors
    
    def calculate_due_date(self, period_end: date) -> date:
        # Massachusetts: Due on the 20th of the month following
        if period_end.month == 12:
            return date(period_end.year + 1, 1, 20)
        else:
            return date(period_end.year, period_end.month + 1, 20)
    
    def get_api_endpoints(self) -> Dict[str, str]:
        return {
            "auth": f"{self.api_base_url}/auth/login",
            "validate": f"{self.api_base_url}/st9/validate",
            "submit": f"{self.api_base_url}/st9/submit",
            "status": f"{self.api_base_url}/st9/status",
            "webfile": "https://wfb.dor.state.ma.us/webfile/",
        }


class ArizonaHandler(BaseStateHandler):
    """Arizona (AZ) sales tax e-filing handler"""
    
    def __init__(self):
        super().__init__("AZ", "Arizona")
        self.api_base_url = "https://aztaxes.gov/api"
        self.tax_rate_base = Decimal("0.056")  # 5.6% state rate
        
    def get_filing_frequency(self, annual_revenue: Decimal) -> str:
        # Arizona based on average monthly tax liability
        monthly_tax = (annual_revenue * self.tax_rate_base) / 12
        if monthly_tax >= 500:
            return "monthly"
        elif monthly_tax >= 100:
            return "quarterly"
        else:
            return "annually"
    
    def get_form_requirements(self) -> Dict[str, Any]:
        return {
            "form_number": "TPT-2",
            "form_name": "Transaction Privilege Tax Return",
            "required_fields": [
                "gross_income",
                "deductions",
                "taxable_income",
                "state_tax",
                "county_tax",
                "city_tax",
                "license_number"
            ],
            "supports_efile": True,
            "efile_formats": ["XML"],
            "tpt_classifications": True,  # Multiple business classifications
        }
    
    def validate_filing_data(self, data: Dict) -> Tuple[bool, List[str]]:
        errors = []
        
        # Validate license number
        if not re.match(r'^\d{10}$', data.get('license_number', '')):
            errors.append("License number must be 10 digits")
            
        # AZ specific: Must have at least one tax (state/county/city)
        taxes = ['state_tax', 'county_tax', 'city_tax']
        if not any(data.get(tax, 0) > 0 for tax in taxes):
            errors.append("At least one tax amount (state/county/city) must be greater than zero")
            
        # Standard validations
        for field in ['gross_income', 'taxable_income']:
            if field not in data or data[field] < 0:
                errors.append(f"{field} must be a positive number")
                
        return len(errors) == 0, errors
    
    def calculate_due_date(self, period_end: date) -> date:
        # Arizona: Due on the 20th of the month following
        if period_end.month == 12:
            return date(period_end.year + 1, 1, 20)
        else:
            return date(period_end.year, period_end.month + 1, 20)
    
    def get_api_endpoints(self) -> Dict[str, str]:
        return {
            "auth": f"{self.api_base_url}/authentication",
            "validate": f"{self.api_base_url}/tpt/validate",
            "submit": f"{self.api_base_url}/tpt/file",
            "status": f"{self.api_base_url}/tpt/status",
            "jurisdictions": f"{self.api_base_url}/jurisdictions/rates",
        }


class MarylandHandler(BaseStateHandler):
    """Maryland (MD) sales tax e-filing handler"""
    
    def __init__(self):
        super().__init__("MD", "Maryland")
        self.api_base_url = "https://interactive.marylandtaxes.gov/api"
        self.tax_rate_base = Decimal("0.06")  # 6% state rate
        
    def get_filing_frequency(self, annual_revenue: Decimal) -> str:
        # Maryland based on annual gross receipts
        if annual_revenue >= 3600000:
            return "monthly"
        elif annual_revenue >= 200000:
            return "quarterly"
        else:
            return "annually"
    
    def get_form_requirements(self) -> Dict[str, Any]:
        return {
            "form_number": "Form 202",
            "form_name": "Sales and Use Tax Return",
            "required_fields": [
                "gross_sales",
                "taxable_sales",
                "tax_due",
                "prepaid_tax",
                "net_tax_due",
                "registration_number"
            ],
            "supports_efile": True,
            "efile_formats": ["XML"],
            "vendor_discount": Decimal("0.012"),  # 1.2% for timely filing
        }
    
    def validate_filing_data(self, data: Dict) -> Tuple[bool, List[str]]:
        errors = []
        
        # Validate registration number
        if not re.match(r'^\d{8}[A-Z]$', data.get('registration_number', '')):
            errors.append("Registration number must be 8 digits followed by a letter")
            
        # MD specific: Prepaid tax credit
        if 'prepaid_tax' in data and data['prepaid_tax'] > data.get('tax_due', 0):
            errors.append("Prepaid tax cannot exceed tax due")
            
        # Standard validations
        for field in ['gross_sales', 'taxable_sales', 'tax_due']:
            if field not in data or data[field] < 0:
                errors.append(f"{field} must be a positive number")
                
        return len(errors) == 0, errors
    
    def calculate_due_date(self, period_end: date) -> date:
        # Maryland: Due on the 20th of the month following
        if period_end.month == 12:
            return date(period_end.year + 1, 1, 20)
        else:
            return date(period_end.year, period_end.month + 1, 20)
    
    def get_api_endpoints(self) -> Dict[str, str]:
        return {
            "auth": f"{self.api_base_url}/auth",
            "validate": f"{self.api_base_url}/sales-tax/validate",
            "submit": f"{self.api_base_url}/sales-tax/file",
            "status": f"{self.api_base_url}/sales-tax/status",
            "bfile": "https://bfile.marylandtaxes.gov/",
        }


class MichiganHandler(BaseStateHandler):
    """Michigan (MI) sales tax e-filing handler"""
    
    def __init__(self):
        super().__init__("MI", "Michigan")
        self.api_base_url = "https://mto.treasury.michigan.gov/api"
        self.tax_rate_base = Decimal("0.06")  # 6% state rate
        
    def get_filing_frequency(self, annual_revenue: Decimal) -> str:
        # Michigan based on sales tax liability
        annual_tax = annual_revenue * self.tax_rate_base
        if annual_tax >= 60000:  # $5000/month
            return "monthly"
        elif annual_tax >= 9600:  # $800/month
            return "quarterly"
        else:
            return "annually"
    
    def get_form_requirements(self) -> Dict[str, Any]:
        return {
            "form_number": "5080",
            "form_name": "Monthly/Quarterly Sales, Use and Withholding Tax Return",
            "required_fields": [
                "gross_sales",
                "rental_receipts",
                "use_tax_purchases",
                "sales_tax_due",
                "use_tax_due",
                "account_number"
            ],
            "supports_efile": True,
            "efile_formats": ["XML"],
            "combined_return": True,  # Includes withholding tax
        }
    
    def validate_filing_data(self, data: Dict) -> Tuple[bool, List[str]]:
        errors = []
        
        # Validate account number
        if not re.match(r'^[A-Z0-9]{10}$', data.get('account_number', '')):
            errors.append("Account number must be 10 alphanumeric characters")
            
        # MI specific: Use tax required
        if 'use_tax_due' not in data:
            errors.append("Use tax amount is required (enter 0 if none)")
            
        # Standard validations
        for field in ['gross_sales', 'sales_tax_due']:
            if field not in data or data[field] < 0:
                errors.append(f"{field} must be a positive number")
                
        return len(errors) == 0, errors
    
    def calculate_due_date(self, period_end: date) -> date:
        # Michigan: Due on the 20th of the month following
        if period_end.month == 12:
            return date(period_end.year + 1, 1, 20)
        else:
            return date(period_end.year, period_end.month + 1, 20)
    
    def get_api_endpoints(self) -> Dict[str, str]:
        return {
            "auth": f"{self.api_base_url}/auth/login",
            "validate": f"{self.api_base_url}/sales-use/validate",
            "submit": f"{self.api_base_url}/sales-use/file",
            "status": f"{self.api_base_url}/sales-use/status",
            "mto": "https://mto.treasury.michigan.gov/",
        }


class TennesseeHandler(BaseStateHandler):
    """Tennessee (TN) sales tax e-filing handler"""
    
    def __init__(self):
        super().__init__("TN", "Tennessee")
        self.api_base_url = "https://tntap.tn.gov/api"
        self.tax_rate_base = Decimal("0.07")  # 7% state rate
        
    def get_filing_frequency(self, annual_revenue: Decimal) -> str:
        # Tennessee based on average monthly liability
        monthly_tax = (annual_revenue * self.tax_rate_base) / 12
        if monthly_tax >= 200:
            return "monthly"
        elif monthly_tax >= 50:
            return "quarterly"
        else:
            return "annually"
    
    def get_form_requirements(self) -> Dict[str, Any]:
        return {
            "form_number": "SLS 450",
            "form_name": "Sales and Use Tax Return",
            "required_fields": [
                "gross_sales",
                "exempt_sales",
                "taxable_sales",
                "state_tax",
                "local_tax",
                "account_number",
                "location_id"
            ],
            "supports_efile": True,
            "efile_formats": ["XML"],
            "single_article_cap": Decimal("1600"),  # Tax cap on single articles
        }
    
    def validate_filing_data(self, data: Dict) -> Tuple[bool, List[str]]:
        errors = []
        
        # Validate account number
        if not re.match(r'^\d{10}$', data.get('account_number', '')):
            errors.append("Account number must be 10 digits")
            
        # TN specific: Local tax required
        if 'local_tax' not in data:
            errors.append("Local tax amount is required")
            
        # Location ID for multi-location
        if data.get('num_locations', 1) > 1 and not data.get('location_id'):
            errors.append("Location ID required for multi-location businesses")
            
        # Standard validations
        for field in ['gross_sales', 'taxable_sales', 'state_tax']:
            if field not in data or data[field] < 0:
                errors.append(f"{field} must be a positive number")
                
        return len(errors) == 0, errors
    
    def calculate_due_date(self, period_end: date) -> date:
        # Tennessee: Due on the 20th of the month following
        if period_end.month == 12:
            return date(period_end.year + 1, 1, 20)
        else:
            return date(period_end.year, period_end.month + 1, 20)
    
    def get_api_endpoints(self) -> Dict[str, str]:
        return {
            "auth": f"{self.api_base_url}/auth",
            "validate": f"{self.api_base_url}/sls450/validate",
            "submit": f"{self.api_base_url}/sls450/file",
            "status": f"{self.api_base_url}/sls450/status",
            "rates": f"{self.api_base_url}/rates/combined",
        }


class IndianaHandler(BaseStateHandler):
    """Indiana (IN) sales tax e-filing handler"""
    
    def __init__(self):
        super().__init__("IN", "Indiana")
        self.api_base_url = "https://intime.dor.in.gov/api"
        self.tax_rate_base = Decimal("0.07")  # 7% state rate
        
    def get_filing_frequency(self, annual_revenue: Decimal) -> str:
        # Indiana based on average monthly tax
        monthly_tax = (annual_revenue * self.tax_rate_base) / 12
        if monthly_tax >= 1000:
            return "monthly"
        elif monthly_tax >= 83.33:  # $1000 annually
            return "quarterly"
        else:
            return "annually"
    
    def get_form_requirements(self) -> Dict[str, Any]:
        return {
            "form_number": "ST-103",
            "form_name": "Indiana Sales Tax Return",
            "required_fields": [
                "gross_retail_income",
                "exemptions",
                "taxable_gross_income",
                "sales_tax",
                "vendor_compensation",
                "taxpayer_id"
            ],
            "supports_efile": True,
            "efile_formats": ["XML"],
            "vendor_compensation": Decimal("0.007"),  # 0.7% collection allowance
        }
    
    def validate_filing_data(self, data: Dict) -> Tuple[bool, List[str]]:
        errors = []
        
        # Validate taxpayer ID (TID)
        if not re.match(r'^\d{10}$', data.get('taxpayer_id', '')):
            errors.append("Taxpayer ID must be 10 digits")
            
        # IN specific: Vendor compensation validation
        if 'vendor_compensation' in data:
            max_comp = min(data.get('sales_tax', 0) * self.get_form_requirements()['vendor_compensation'], 1000)
            if data['vendor_compensation'] > max_comp:
                errors.append(f"Vendor compensation cannot exceed ${max_comp:.2f}")
                
        # Standard validations
        for field in ['gross_retail_income', 'taxable_gross_income', 'sales_tax']:
            if field not in data or data[field] < 0:
                errors.append(f"{field} must be a positive number")
                
        return len(errors) == 0, errors
    
    def calculate_due_date(self, period_end: date) -> date:
        # Indiana: Due on the 30th of the month following
        if period_end.month == 12:
            return date(period_end.year + 1, 1, 30)
        else:
            # Handle months with less than 30 days
            next_month = period_end.month + 1
            if next_month in [1, 3, 5, 7, 8, 10, 12]:
                day = 30
            elif next_month in [4, 6, 9, 11]:
                day = 30
            else:  # February
                day = 28  # Use 28 for consistency
            return date(period_end.year, next_month, day)
    
    def get_api_endpoints(self) -> Dict[str, str]:
        return {
            "auth": f"{self.api_base_url}/authentication",
            "validate": f"{self.api_base_url}/st103/validate",
            "submit": f"{self.api_base_url}/st103/submit",
            "status": f"{self.api_base_url}/st103/status",
            "intime": "https://intime.dor.in.gov/",
        }


class WisconsinHandler(BaseStateHandler):
    """Wisconsin (WI) sales tax e-filing handler"""
    
    def __init__(self):
        super().__init__("WI", "Wisconsin")
        self.api_base_url = "https://tap.revenue.wi.gov/api"
        self.tax_rate_base = Decimal("0.05")  # 5% state rate
        
    def get_filing_frequency(self, annual_revenue: Decimal) -> str:
        # Wisconsin based on sales tax due
        annual_tax = annual_revenue * self.tax_rate_base
        if annual_tax >= 3600:  # $300/month
            return "monthly"
        elif annual_tax >= 600:  # $50/month
            return "quarterly"
        else:
            return "annually"
    
    def get_form_requirements(self) -> Dict[str, Any]:
        return {
            "form_number": "ST-12",
            "form_name": "Sales and Use Tax Return",
            "required_fields": [
                "total_sales",
                "taxable_sales",
                "state_tax",
                "county_tax",
                "stadium_tax",
                "seller_permit"
            ],
            "supports_efile": True,
            "efile_formats": ["XML"],
            "county_rates_vary": True,
        }
    
    def validate_filing_data(self, data: Dict) -> Tuple[bool, List[str]]:
        errors = []
        
        # Validate seller's permit
        if not re.match(r'^\d{15}$', data.get('seller_permit', '')):
            errors.append("Seller's permit must be 15 digits")
            
        # WI specific: County tax validation
        if data.get('has_county_tax') and 'county_tax' not in data:
            errors.append("County tax amount required for applicable counties")
            
        # Stadium tax for certain counties
        if data.get('stadium_district') and 'stadium_tax' not in data:
            errors.append("Stadium tax required for applicable districts")
            
        # Standard validations
        for field in ['total_sales', 'taxable_sales', 'state_tax']:
            if field not in data or data[field] < 0:
                errors.append(f"{field} must be a positive number")
                
        return len(errors) == 0, errors
    
    def calculate_due_date(self, period_end: date) -> date:
        # Wisconsin: Due on the last day of the month following
        if period_end.month == 12:
            return date(period_end.year + 1, 1, 31)
        else:
            next_month = period_end.month + 1
            if next_month in [1, 3, 5, 7, 8, 10, 12]:
                day = 31
            elif next_month in [4, 6, 9, 11]:
                day = 30
            else:  # February
                day = 29 if period_end.year % 4 == 0 else 28
            return date(period_end.year, next_month, day)
    
    def get_api_endpoints(self) -> Dict[str, str]:
        return {
            "auth": f"{self.api_base_url}/auth/login",
            "validate": f"{self.api_base_url}/st12/validate",
            "submit": f"{self.api_base_url}/st12/file",
            "status": f"{self.api_base_url}/st12/status",
            "rates": f"{self.api_base_url}/rates/lookup",
        }


class ColoradoHandler(BaseStateHandler):
    """Colorado (CO) sales tax e-filing handler"""
    
    def __init__(self):
        super().__init__("CO", "Colorado")
        self.api_base_url = "https://www.colorado.gov/revenueonline/api"
        self.tax_rate_base = Decimal("0.029")  # 2.9% state rate
        
    def get_filing_frequency(self, annual_revenue: Decimal) -> str:
        # Colorado based on annual tax liability
        annual_tax = annual_revenue * self.tax_rate_base
        if annual_tax >= 3000:
            return "monthly"
        elif annual_tax >= 300:
            return "quarterly"
        else:
            return "annually"
    
    def get_form_requirements(self) -> Dict[str, Any]:
        return {
            "form_number": "DR 0100",
            "form_name": "Retail Sales Tax Return",
            "required_fields": [
                "gross_sales",
                "deductions",
                "net_taxable_sales",
                "state_tax",
                "local_tax",
                "account_number",
                "city_county_codes"
            ],
            "supports_efile": True,
            "efile_formats": ["XML"],
            "home_rule_cities": True,  # Some cities collect their own tax
        }
    
    def validate_filing_data(self, data: Dict) -> Tuple[bool, List[str]]:
        errors = []
        
        # Validate account number
        if not re.match(r'^\d{8}-\d{4}$', data.get('account_number', '')):
            errors.append("Account number must be in format XXXXXXXX-XXXX")
            
        # CO specific: City/county codes required
        if not data.get('city_county_codes'):
            errors.append("City/county codes are required")
            
        # Home rule city validation
        if data.get('has_home_rule_sales'):
            errors.append("Note: Home rule city sales must be filed separately with the city")
            
        # Standard validations
        for field in ['gross_sales', 'net_taxable_sales', 'state_tax']:
            if field not in data or data[field] < 0:
                errors.append(f"{field} must be a positive number")
                
        return len(errors) == 0, errors
    
    def calculate_due_date(self, period_end: date) -> date:
        # Colorado: Due on the 20th of the month following
        if period_end.month == 12:
            return date(period_end.year + 1, 1, 20)
        else:
            return date(period_end.year, period_end.month + 1, 20)
    
    def get_api_endpoints(self) -> Dict[str, str]:
        return {
            "auth": f"{self.api_base_url}/auth",
            "validate": f"{self.api_base_url}/dr0100/validate",
            "submit": f"{self.api_base_url}/dr0100/file",
            "status": f"{self.api_base_url}/dr0100/status",
            "jurisdictions": f"{self.api_base_url}/jurisdictions",
            "revenue_online": "https://www.colorado.gov/revenueonline/",
        }


# Factory function to get the appropriate handler
def get_state_handler(state_code: str) -> Optional[BaseStateHandler]:
    """Get the appropriate state handler based on state code"""
    handlers = {
        'CA': CaliforniaHandler,
        'TX': TexasHandler,
        'FL': FloridaHandler,
        'NY': NewYorkHandler,
        'PA': PennsylvaniaHandler,
        'IL': IllinoisHandler,
        'OH': OhioHandler,
        'NC': NorthCarolinaHandler,
        'GA': GeorgiaHandler,
        'NJ': NewJerseyHandler,
        'VA': VirginiaHandler,
        'WA': WashingtonHandler,
        'MA': MassachusettsHandler,
        'AZ': ArizonaHandler,
        'MD': MarylandHandler,
        'MI': MichiganHandler,
        'TN': TennesseeHandler,
        'IN': IndianaHandler,
        'WI': WisconsinHandler,
        'CO': ColoradoHandler,
    }
    
    handler_class = handlers.get(state_code.upper())
    if handler_class:
        return handler_class()
    return None