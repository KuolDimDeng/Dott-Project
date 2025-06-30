from typing import Dict, List, Any, Optional
from datetime import datetime, date
from decimal import Decimal
import re


class FormFieldMapper:
    """Maps Django model data to PDF form fields with formatting rules"""
    
    # Currency formatter
    @staticmethod
    def format_currency(value: Any) -> str:
        """Format value as currency"""
        if value is None:
            return "$0.00"
        if isinstance(value, (Decimal, float, int)):
            return f"${float(value):,.2f}"
        return str(value)
    
    # Date formatter
    @staticmethod
    def format_date(value: Any, format_str: str = "%m/%d/%Y") -> str:
        """Format date value"""
        if value is None:
            return ""
        if isinstance(value, datetime):
            return value.strftime(format_str)
        if isinstance(value, date):
            return value.strftime(format_str)
        if isinstance(value, str):
            try:
                dt = datetime.strptime(value, "%Y-%m-%d")
                return dt.strftime(format_str)
            except:
                return value
        return str(value)
    
    # SSN/EIN formatter
    @staticmethod
    def format_ein(value: str) -> str:
        """Format EIN (XX-XXXXXXX)"""
        if not value:
            return ""
        # Remove any non-digits
        digits = re.sub(r'\D', '', value)
        if len(digits) == 9:
            return f"{digits[:2]}-{digits[2:]}"
        return value
    
    @staticmethod
    def format_ssn(value: str) -> str:
        """Format SSN (XXX-XX-XXXX)"""
        if not value:
            return ""
        # Remove any non-digits
        digits = re.sub(r'\D', '', value)
        if len(digits) == 9:
            return f"{digits[:3]}-{digits[3:5]}-{digits[5:]}"
        return value
    
    # Phone formatter
    @staticmethod
    def format_phone(value: str) -> str:
        """Format phone number"""
        if not value:
            return ""
        # Remove any non-digits
        digits = re.sub(r'\D', '', value)
        if len(digits) == 10:
            return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
        elif len(digits) == 11 and digits[0] == '1':
            return f"({digits[1:4]}) {digits[4:7]}-{digits[7:]}"
        return value


class Form941Template:
    """Template for IRS Form 941 - Employer's Quarterly Federal Tax Return"""
    
    @staticmethod
    def get_field_mapping() -> Dict[str, Dict[str, Any]]:
        """Get field mapping for Form 941"""
        return {
            # Business Information
            'business_name': {
                'pdf_field': 'business_name',
                'required': True,
                'type': 'text',
                'max_length': 100
            },
            'ein': {
                'pdf_field': 'ein',
                'required': True,
                'type': 'text',
                'formatter': FormFieldMapper.format_ein
            },
            'address': {
                'pdf_field': 'address',
                'required': True,
                'type': 'text'
            },
            'city': {
                'pdf_field': 'city',
                'required': True,
                'type': 'text'
            },
            'state': {
                'pdf_field': 'state',
                'required': True,
                'type': 'text',
                'max_length': 2
            },
            'zip': {
                'pdf_field': 'zip',
                'required': True,
                'type': 'text'
            },
            
            # Part 1 - Answer these questions
            'num_employees': {
                'pdf_field': 'num_employees',
                'required': True,
                'type': 'number',
                'default': 0
            },
            'total_wages': {
                'pdf_field': 'total_wages',
                'required': True,
                'type': 'currency',
                'formatter': FormFieldMapper.format_currency
            },
            'federal_tax_withheld': {
                'pdf_field': 'federal_tax_withheld',
                'required': True,
                'type': 'currency',
                'formatter': FormFieldMapper.format_currency
            },
            'no_wages_subject': {
                'pdf_field': 'no_wages_checkbox',
                'required': False,
                'type': 'checkbox',
                'default': False
            },
            
            # Social Security and Medicare
            'ss_wages': {
                'pdf_field': 'ss_wages',
                'required': True,
                'type': 'currency',
                'formatter': FormFieldMapper.format_currency
            },
            'ss_tax': {
                'pdf_field': 'ss_tax',
                'required': True,
                'type': 'currency',
                'formatter': FormFieldMapper.format_currency,
                'calculation': 'ss_wages * 0.124'  # 6.2% employee + 6.2% employer
            },
            'medicare_wages': {
                'pdf_field': 'medicare_wages',
                'required': True,
                'type': 'currency',
                'formatter': FormFieldMapper.format_currency
            },
            'medicare_tax': {
                'pdf_field': 'medicare_tax',
                'required': True,
                'type': 'currency',
                'formatter': FormFieldMapper.format_currency,
                'calculation': 'medicare_wages * 0.029'  # 1.45% employee + 1.45% employer
            },
            
            # Part 2 - Deposit Schedule
            'deposit_schedule': {
                'pdf_field': 'deposit_schedule',
                'required': True,
                'type': 'select',
                'options': ['monthly', 'semiweekly'],
                'default': 'monthly'
            },
            'month1_liability': {
                'pdf_field': 'month1_liability',
                'required': False,
                'type': 'currency',
                'formatter': FormFieldMapper.format_currency,
                'condition': 'deposit_schedule == "monthly"'
            },
            'month2_liability': {
                'pdf_field': 'month2_liability',
                'required': False,
                'type': 'currency',
                'formatter': FormFieldMapper.format_currency,
                'condition': 'deposit_schedule == "monthly"'
            },
            'month3_liability': {
                'pdf_field': 'month3_liability',
                'required': False,
                'type': 'currency',
                'formatter': FormFieldMapper.format_currency,
                'condition': 'deposit_schedule == "monthly"'
            },
            'total_liability': {
                'pdf_field': 'total_liability',
                'required': True,
                'type': 'currency',
                'formatter': FormFieldMapper.format_currency
            }
        }
    
    @staticmethod
    def validate_data(data: Dict[str, Any]) -> List[str]:
        """Validate form data and return list of errors"""
        errors = []
        mapping = Form941Template.get_field_mapping()
        
        # Check required fields
        for field_name, field_config in mapping.items():
            if field_config.get('required') and field_name not in data:
                errors.append(f"Required field '{field_name}' is missing")
        
        # Validate quarter
        if 'quarter' in data and data['quarter'] not in [1, 2, 3, 4]:
            errors.append("Quarter must be 1, 2, 3, or 4")
        
        # Validate deposit schedule
        if data.get('deposit_schedule') == 'monthly':
            if not all(k in data for k in ['month1_liability', 'month2_liability', 'month3_liability']):
                errors.append("Monthly deposit schedule requires liability for all 3 months")
        
        # Validate calculations
        if 'ss_wages' in data and 'ss_tax' in data:
            expected_ss_tax = float(data.get('ss_wages', 0)) * 0.124
            actual_ss_tax = float(data.get('ss_tax', 0))
            if abs(expected_ss_tax - actual_ss_tax) > 0.01:
                errors.append(f"Social Security tax calculation error: expected ${expected_ss_tax:.2f}, got ${actual_ss_tax:.2f}")
        
        return errors
    
    @staticmethod
    def prepare_data(raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare and format data for PDF generation"""
        mapping = Form941Template.get_field_mapping()
        prepared_data = {}
        
        for field_name, field_config in mapping.items():
            value = raw_data.get(field_name)
            
            # Apply default if missing
            if value is None and 'default' in field_config:
                value = field_config['default']
            
            # Apply formatter if specified
            if value is not None and 'formatter' in field_config:
                value = field_config['formatter'](value)
            
            # Apply calculation if specified and value is missing
            if value is None and 'calculation' in field_config:
                calc = field_config['calculation']
                # Simple calculation parser (expand as needed)
                if '*' in calc:
                    parts = calc.split('*')
                    if parts[0].strip() in raw_data:
                        base_value = float(raw_data[parts[0].strip()])
                        multiplier = float(parts[1].strip())
                        value = base_value * multiplier
            
            if value is not None:
                prepared_data[field_name] = value
        
        return prepared_data


class Form940Template:
    """Template for IRS Form 940 - Employer's Annual Federal Unemployment Tax Return"""
    
    @staticmethod
    def get_field_mapping() -> Dict[str, Dict[str, Any]]:
        """Get field mapping for Form 940"""
        return {
            # Business Information
            'business_name': {
                'pdf_field': 'business_name',
                'required': True,
                'type': 'text'
            },
            'ein': {
                'pdf_field': 'ein',
                'required': True,
                'type': 'text',
                'formatter': FormFieldMapper.format_ein
            },
            'address': {
                'pdf_field': 'address',
                'required': True,
                'type': 'text'
            },
            'city': {
                'pdf_field': 'city',
                'required': True,
                'type': 'text'
            },
            'state': {
                'pdf_field': 'state',
                'required': True,
                'type': 'text'
            },
            'zip': {
                'pdf_field': 'zip',
                'required': True,
                'type': 'text'
            },
            
            # Part 1 - Tell us about your return
            'single_state': {
                'pdf_field': 'single_state',
                'required': False,
                'type': 'text',
                'max_length': 2
            },
            'multi_state': {
                'pdf_field': 'multi_state_checkbox',
                'required': False,
                'type': 'checkbox',
                'default': False
            },
            'credit_reduction': {
                'pdf_field': 'credit_reduction_checkbox',
                'required': False,
                'type': 'checkbox',
                'default': False
            },
            
            # Part 2 - Determine FUTA tax
            'total_payments': {
                'pdf_field': 'total_payments',
                'required': True,
                'type': 'currency',
                'formatter': FormFieldMapper.format_currency
            },
            'exempt_payments': {
                'pdf_field': 'exempt_payments',
                'required': True,
                'type': 'currency',
                'formatter': FormFieldMapper.format_currency,
                'default': 0
            },
            'excess_payments': {
                'pdf_field': 'excess_payments',
                'required': True,
                'type': 'currency',
                'formatter': FormFieldMapper.format_currency,
                'default': 0
            },
            'subtotal_exempt': {
                'pdf_field': 'subtotal_exempt',
                'required': True,
                'type': 'currency',
                'formatter': FormFieldMapper.format_currency,
                'calculation': 'exempt_payments + excess_payments'
            },
            'taxable_wages': {
                'pdf_field': 'taxable_wages',
                'required': True,
                'type': 'currency',
                'formatter': FormFieldMapper.format_currency,
                'calculation': 'total_payments - subtotal_exempt'
            },
            'futa_tax': {
                'pdf_field': 'futa_tax',
                'required': True,
                'type': 'currency',
                'formatter': FormFieldMapper.format_currency,
                'calculation': 'taxable_wages * 0.006'
            }
        }
    
    @staticmethod
    def validate_data(data: Dict[str, Any]) -> List[str]:
        """Validate form data and return list of errors"""
        errors = []
        mapping = Form940Template.get_field_mapping()
        
        # Check required fields
        for field_name, field_config in mapping.items():
            if field_config.get('required') and field_name not in data:
                errors.append(f"Required field '{field_name}' is missing")
        
        # Validate state information
        if not data.get('single_state') and not data.get('multi_state'):
            errors.append("Must specify either single state or multi-state filing")
        
        # Validate calculations
        if all(k in data for k in ['total_payments', 'exempt_payments', 'excess_payments', 'taxable_wages']):
            expected_taxable = float(data['total_payments']) - float(data['exempt_payments']) - float(data['excess_payments'])
            actual_taxable = float(data['taxable_wages'])
            if abs(expected_taxable - actual_taxable) > 0.01:
                errors.append(f"Taxable wages calculation error: expected ${expected_taxable:.2f}, got ${actual_taxable:.2f}")
        
        return errors
    
    @staticmethod
    def prepare_data(raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare and format data for PDF generation"""
        mapping = Form940Template.get_field_mapping()
        prepared_data = {}
        
        # Calculate dependent fields
        if 'exempt_payments' in raw_data and 'excess_payments' in raw_data:
            raw_data['subtotal_exempt'] = float(raw_data.get('exempt_payments', 0)) + float(raw_data.get('excess_payments', 0))
        
        if 'total_payments' in raw_data and 'subtotal_exempt' in raw_data:
            raw_data['taxable_wages'] = float(raw_data.get('total_payments', 0)) - float(raw_data.get('subtotal_exempt', 0))
        
        if 'taxable_wages' in raw_data:
            raw_data['futa_tax'] = float(raw_data.get('taxable_wages', 0)) * 0.006
        
        # Format fields
        for field_name, field_config in mapping.items():
            value = raw_data.get(field_name)
            
            if value is None and 'default' in field_config:
                value = field_config['default']
            
            if value is not None and 'formatter' in field_config:
                value = field_config['formatter'](value)
            
            if value is not None:
                prepared_data[field_name] = value
        
        return prepared_data


class StateSalesTaxTemplate:
    """Template for state sales tax returns"""
    
    @staticmethod
    def get_field_mapping(state_code: str) -> Dict[str, Dict[str, Any]]:
        """Get field mapping for state sales tax form"""
        # Base mapping common to all states
        base_mapping = {
            # Business Information
            'business_name': {
                'pdf_field': 'business_name',
                'required': True,
                'type': 'text'
            },
            'ein': {
                'pdf_field': 'state_tax_id',
                'required': True,
                'type': 'text'
            },
            'address': {
                'pdf_field': 'address',
                'required': True,
                'type': 'text'
            },
            'city': {
                'pdf_field': 'city',
                'required': True,
                'type': 'text'
            },
            'state': {
                'pdf_field': 'state',
                'required': True,
                'type': 'text'
            },
            'zip': {
                'pdf_field': 'zip',
                'required': True,
                'type': 'text'
            },
            
            # Sales data
            'gross_sales': {
                'pdf_field': 'gross_sales',
                'required': True,
                'type': 'currency',
                'formatter': FormFieldMapper.format_currency
            },
            'exempt_sales': {
                'pdf_field': 'exempt_sales',
                'required': True,
                'type': 'currency',
                'formatter': FormFieldMapper.format_currency,
                'default': 0
            },
            'taxable_sales': {
                'pdf_field': 'taxable_sales',
                'required': True,
                'type': 'currency',
                'formatter': FormFieldMapper.format_currency,
                'calculation': 'gross_sales - exempt_sales'
            },
            'tax_rate': {
                'pdf_field': 'tax_rate',
                'required': True,
                'type': 'percentage'
            },
            'sales_tax_due': {
                'pdf_field': 'sales_tax_due',
                'required': True,
                'type': 'currency',
                'formatter': FormFieldMapper.format_currency,
                'calculation': 'taxable_sales * tax_rate / 100'
            },
            
            # Use tax
            'use_tax_purchases': {
                'pdf_field': 'use_tax_purchases',
                'required': False,
                'type': 'currency',
                'formatter': FormFieldMapper.format_currency,
                'default': 0
            },
            'use_tax_due': {
                'pdf_field': 'use_tax_due',
                'required': False,
                'type': 'currency',
                'formatter': FormFieldMapper.format_currency,
                'calculation': 'use_tax_purchases * tax_rate / 100'
            },
            
            # Totals
            'total_tax_due': {
                'pdf_field': 'total_tax_due',
                'required': True,
                'type': 'currency',
                'formatter': FormFieldMapper.format_currency,
                'calculation': 'sales_tax_due + use_tax_due'
            },
            'credits': {
                'pdf_field': 'credits',
                'required': False,
                'type': 'currency',
                'formatter': FormFieldMapper.format_currency,
                'default': 0
            },
            'net_tax_due': {
                'pdf_field': 'net_tax_due',
                'required': True,
                'type': 'currency',
                'formatter': FormFieldMapper.format_currency,
                'calculation': 'total_tax_due - credits'
            }
        }
        
        # State-specific adjustments
        state_specific = {
            'CA': {
                'district_tax': {
                    'pdf_field': 'district_tax',
                    'required': False,
                    'type': 'currency',
                    'formatter': FormFieldMapper.format_currency
                }
            },
            'NY': {
                'local_tax': {
                    'pdf_field': 'local_tax',
                    'required': False,
                    'type': 'currency',
                    'formatter': FormFieldMapper.format_currency
                }
            },
            'TX': {
                'outlet_count': {
                    'pdf_field': 'outlet_count',
                    'required': True,
                    'type': 'number'
                }
            }
        }
        
        # Merge base with state-specific fields
        mapping = base_mapping.copy()
        if state_code in state_specific:
            mapping.update(state_specific[state_code])
        
        return mapping
    
    @staticmethod
    def get_state_tax_rates() -> Dict[str, float]:
        """Get standard state tax rates"""
        return {
            'AL': 4.0, 'AK': 0.0, 'AZ': 5.6, 'AR': 6.5, 'CA': 7.25,
            'CO': 2.9, 'CT': 6.35, 'DE': 0.0, 'FL': 6.0, 'GA': 4.0,
            'HI': 4.0, 'ID': 6.0, 'IL': 6.25, 'IN': 7.0, 'IA': 6.0,
            'KS': 6.5, 'KY': 6.0, 'LA': 4.45, 'ME': 5.5, 'MD': 6.0,
            'MA': 6.25, 'MI': 6.0, 'MN': 6.875, 'MS': 7.0, 'MO': 4.225,
            'MT': 0.0, 'NE': 5.5, 'NV': 6.85, 'NH': 0.0, 'NJ': 6.625,
            'NM': 5.125, 'NY': 4.0, 'NC': 4.75, 'ND': 5.0, 'OH': 5.75,
            'OK': 4.5, 'OR': 0.0, 'PA': 6.0, 'RI': 7.0, 'SC': 6.0,
            'SD': 4.5, 'TN': 7.0, 'TX': 6.25, 'UT': 6.1, 'VT': 6.0,
            'VA': 5.3, 'WA': 6.5, 'WV': 6.0, 'WI': 5.0, 'WY': 4.0
        }
    
    @staticmethod
    def validate_data(data: Dict[str, Any], state_code: str) -> List[str]:
        """Validate form data and return list of errors"""
        errors = []
        mapping = StateSalesTaxTemplate.get_field_mapping(state_code)
        
        # Check required fields
        for field_name, field_config in mapping.items():
            if field_config.get('required') and field_name not in data:
                errors.append(f"Required field '{field_name}' is missing")
        
        # Validate calculations
        if 'gross_sales' in data and 'exempt_sales' in data and 'taxable_sales' in data:
            expected = float(data['gross_sales']) - float(data.get('exempt_sales', 0))
            actual = float(data['taxable_sales'])
            if abs(expected - actual) > 0.01:
                errors.append(f"Taxable sales calculation error: expected ${expected:.2f}, got ${actual:.2f}")
        
        # Validate tax rate
        if 'tax_rate' in data:
            standard_rate = StateSalesTaxTemplate.get_state_tax_rates().get(state_code, 0)
            if float(data['tax_rate']) < standard_rate:
                errors.append(f"Tax rate {data['tax_rate']}% is below state minimum {standard_rate}%")
        
        return errors
    
    @staticmethod
    def prepare_data(raw_data: Dict[str, Any], state_code: str) -> Dict[str, Any]:
        """Prepare and format data for PDF generation"""
        mapping = StateSalesTaxTemplate.get_field_mapping(state_code)
        prepared_data = {}
        
        # Set default tax rate if not provided
        if 'tax_rate' not in raw_data:
            raw_data['tax_rate'] = StateSalesTaxTemplate.get_state_tax_rates().get(state_code, 0)
        
        # Calculate dependent fields
        if 'gross_sales' in raw_data:
            raw_data['taxable_sales'] = float(raw_data['gross_sales']) - float(raw_data.get('exempt_sales', 0))
        
        if 'taxable_sales' in raw_data and 'tax_rate' in raw_data:
            raw_data['sales_tax_due'] = float(raw_data['taxable_sales']) * float(raw_data['tax_rate']) / 100
        
        if 'use_tax_purchases' in raw_data and 'tax_rate' in raw_data:
            raw_data['use_tax_due'] = float(raw_data['use_tax_purchases']) * float(raw_data['tax_rate']) / 100
        
        if 'sales_tax_due' in raw_data:
            raw_data['total_tax_due'] = float(raw_data.get('sales_tax_due', 0)) + float(raw_data.get('use_tax_due', 0))
        
        if 'total_tax_due' in raw_data:
            raw_data['net_tax_due'] = float(raw_data['total_tax_due']) - float(raw_data.get('credits', 0))
        
        # Format fields
        for field_name, field_config in mapping.items():
            value = raw_data.get(field_name)
            
            if value is None and 'default' in field_config:
                value = field_config['default']
            
            if value is not None and 'formatter' in field_config:
                value = field_config['formatter'](value)
            
            if value is not None:
                prepared_data[field_name] = value
        
        return prepared_data


class FormTemplateRegistry:
    """Registry for all available form templates"""
    
    _templates = {
        '941': Form941Template,
        '940': Form940Template,
    }
    
    @classmethod
    def get_template(cls, form_type: str):
        """Get template class for form type"""
        if form_type in cls._templates:
            return cls._templates[form_type]
        elif form_type.startswith('STATE_SALES_'):
            return StateSalesTaxTemplate
        else:
            raise ValueError(f"Unknown form type: {form_type}")
    
    @classmethod
    def register_template(cls, form_type: str, template_class):
        """Register a new form template"""
        cls._templates[form_type] = template_class
    
    @classmethod
    def list_templates(cls) -> List[str]:
        """List all available form types"""
        return list(cls._templates.keys()) + ['STATE_SALES_*']