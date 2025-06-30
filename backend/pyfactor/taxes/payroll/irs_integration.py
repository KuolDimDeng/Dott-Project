"""
IRS Integration for Payroll Tax Filing
Handles e-filing, FIRE system integration, and acknowledgment processing
"""

import json
import xml.etree.ElementTree as ET
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Dict, Optional, List, Tuple
import requests
import hashlib
import hmac
from django.conf import settings
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


class IRSIntegration:
    """Handles IRS e-filing system integration"""
    
    # IRS endpoints (these would be real in production)
    IRS_TEST_ENDPOINT = "https://test.irs.gov/efile/api/v1"
    IRS_PROD_ENDPOINT = "https://efile.irs.gov/api/v1"
    
    # FIRE system endpoints
    FIRE_TEST_ENDPOINT = "https://test.fire.irs.gov/api/v1"
    FIRE_PROD_ENDPOINT = "https://fire.irs.gov/api/v1"
    
    # Form types
    FORM_941 = "941"
    FORM_944 = "944"
    FORM_W2 = "W2"
    FORM_1099 = "1099"
    
    # Submission statuses
    STATUS_PENDING = "PENDING"
    STATUS_ACCEPTED = "ACCEPTED"
    STATUS_REJECTED = "REJECTED"
    STATUS_PROCESSING = "PROCESSING"
    
    def __init__(self, is_production: bool = False):
        self.is_production = is_production
        self.base_url = self.IRS_PROD_ENDPOINT if is_production else self.IRS_TEST_ENDPOINT
        self.fire_url = self.FIRE_PROD_ENDPOINT if is_production else self.FIRE_TEST_ENDPOINT
        
    def submit_form_941(self, form_data: Dict, attachments: Optional[List[Dict]] = None) -> Dict:
        """Submit Form 941 to IRS e-file system"""
        
        # Validate form data
        validation_result = self._validate_form_941(form_data)
        if not validation_result['is_valid']:
            return {
                'success': False,
                'errors': validation_result['errors'],
                'submission_id': None
            }
        
        # Convert to IRS XML format
        xml_data = self._convert_to_irs_xml(form_data, self.FORM_941)
        
        # Sign the submission
        signature = self._sign_submission(xml_data)
        
        # Prepare submission package
        submission_package = {
            'form_type': self.FORM_941,
            'tax_year': form_data['year'],
            'tax_period': f"Q{form_data['quarter']}",
            'ein': form_data['ein'],
            'submission_type': 'ORIGINAL',  # or 'AMENDED'
            'xml_data': xml_data,
            'signature': signature,
            'attachments': attachments or [],
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Submit to IRS (placeholder for actual API call)
        try:
            response = self._submit_to_irs(submission_package)
            
            # Log submission
            self._log_submission(submission_package, response)
            
            return {
                'success': True,
                'submission_id': response.get('submission_id'),
                'tracking_number': response.get('tracking_number'),
                'status': self.STATUS_PENDING,
                'submitted_at': datetime.utcnow().isoformat(),
                'next_check': (datetime.utcnow() + timedelta(hours=1)).isoformat()
            }
            
        except Exception as e:
            logger.error(f"IRS submission failed: {str(e)}")
            return {
                'success': False,
                'errors': [str(e)],
                'submission_id': None
            }
    
    def check_submission_status(self, submission_id: str) -> Dict:
        """Check status of a submitted form"""
        
        # In production, this would call the IRS API
        # For now, return a mock response
        return {
            'submission_id': submission_id,
            'status': self.STATUS_ACCEPTED,
            'acknowledgment_date': datetime.utcnow().isoformat(),
            'acknowledgment_number': f"ACK{submission_id[:8]}",
            'messages': [],
            'errors': []
        }
    
    def retrieve_acknowledgment(self, submission_id: str) -> Optional[Dict]:
        """Retrieve IRS acknowledgment for a submission"""
        
        status_result = self.check_submission_status(submission_id)
        
        if status_result['status'] != self.STATUS_ACCEPTED:
            return None
            
        # Generate acknowledgment document
        acknowledgment = {
            'submission_id': submission_id,
            'acknowledgment_number': status_result['acknowledgment_number'],
            'acknowledgment_date': status_result['acknowledgment_date'],
            'form_type': self.FORM_941,
            'status': 'ACCEPTED',
            'pdf_url': f"/api/taxes/payroll/acknowledgment/{submission_id}/pdf",
            'xml_url': f"/api/taxes/payroll/acknowledgment/{submission_id}/xml"
        }
        
        return acknowledgment
    
    def submit_to_fire_system(self, form_type: str, data: Dict) -> Dict:
        """Submit information returns to FIRE system"""
        
        # Validate FIRE submission
        if form_type not in [self.FORM_W2, self.FORM_1099]:
            return {
                'success': False,
                'errors': ['Invalid form type for FIRE system']
            }
        
        # Create FIRE formatted file
        fire_file = self._create_fire_file(form_type, data)
        
        # Submit to FIRE (placeholder)
        try:
            # In production, this would upload to FIRE system
            response = {
                'submission_id': f"FIRE-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
                'receipt_date': datetime.utcnow().isoformat(),
                'status': 'RECEIVED'
            }
            
            return {
                'success': True,
                'submission_id': response['submission_id'],
                'receipt': response
            }
            
        except Exception as e:
            logger.error(f"FIRE submission failed: {str(e)}")
            return {
                'success': False,
                'errors': [str(e)]
            }
    
    def _validate_form_941(self, form_data: Dict) -> Dict:
        """Validate Form 941 against IRS business rules"""
        
        errors = []
        
        # EIN validation
        ein = form_data.get('ein', '').replace('-', '')
        if not ein or len(ein) != 9:
            errors.append("Invalid EIN format")
            
        # Quarter validation
        quarter = form_data.get('quarter')
        if quarter not in [1, 2, 3, 4]:
            errors.append("Invalid quarter")
            
        # Year validation
        year = form_data.get('year')
        current_year = datetime.now().year
        if not year or year < 2020 or year > current_year:
            errors.append("Invalid tax year")
            
        # Wage validation
        wages = Decimal(str(form_data.get('wages_tips_compensation', 0)))
        if wages < 0:
            errors.append("Wages cannot be negative")
            
        # Employee count validation
        employee_count = form_data.get('number_of_employees', 0)
        if employee_count < 0:
            errors.append("Employee count cannot be negative")
        if employee_count == 0 and wages > 0:
            errors.append("Cannot have wages without employees")
            
        # Tax calculation validation
        ss_wages = Decimal(str(form_data.get('social_security_wages', 0)))
        ss_tax = Decimal(str(form_data.get('social_security_tax', 0)))
        expected_ss_tax = ss_wages * Decimal('0.124')  # 12.4% combined rate
        
        if abs(ss_tax - expected_ss_tax) > Decimal('10'):  # Allow $10 variance
            errors.append("Social Security tax calculation appears incorrect")
            
        # Deposit schedule validation
        deposit_schedule = form_data.get('deposit_schedule')
        if deposit_schedule not in ['monthly', 'semiweekly']:
            errors.append("Invalid deposit schedule")
            
        return {
            'is_valid': len(errors) == 0,
            'errors': errors
        }
    
    def _convert_to_irs_xml(self, form_data: Dict, form_type: str) -> str:
        """Convert form data to IRS XML format"""
        
        # Create root element
        root = ET.Element('Return', xmlns='http://www.irs.gov/efile')
        
        # Add header
        header = ET.SubElement(root, 'ReturnHeader')
        ET.SubElement(header, 'TaxYear').text = str(form_data['year'])
        ET.SubElement(header, 'TaxPeriod').text = f"Q{form_data['quarter']}"
        ET.SubElement(header, 'ReturnType').text = form_type
        
        # Add filer information
        filer = ET.SubElement(header, 'Filer')
        ET.SubElement(filer, 'EIN').text = form_data['ein']
        ET.SubElement(filer, 'Name').text = form_data['name']
        
        if form_data.get('trade_name'):
            ET.SubElement(filer, 'TradeName').text = form_data['trade_name']
            
        # Add address
        address = ET.SubElement(filer, 'USAddress')
        addr_data = form_data.get('address', {})
        ET.SubElement(address, 'AddressLine1').text = addr_data.get('line1', '')
        if addr_data.get('line2'):
            ET.SubElement(address, 'AddressLine2').text = addr_data['line2']
        ET.SubElement(address, 'City').text = addr_data.get('city', '')
        ET.SubElement(address, 'State').text = addr_data.get('state', '')
        ET.SubElement(address, 'ZIPCode').text = addr_data.get('zip', '')
        
        # Add Form 941 data
        if form_type == self.FORM_941:
            form941 = ET.SubElement(root, 'IRS941')
            
            # Part 1: Answer these questions for this quarter
            part1 = ET.SubElement(form941, 'Part1')
            ET.SubElement(part1, 'NumberOfEmployees').text = str(form_data['number_of_employees'])
            ET.SubElement(part1, 'WagesTipsCompensation').text = str(form_data['wages_tips_compensation'])
            ET.SubElement(part1, 'FederalIncomeTaxWithheld').text = str(form_data['federal_income_tax_withheld'])
            
            # Social Security
            ET.SubElement(part1, 'SocialSecurityWages').text = str(form_data['social_security_wages'])
            ET.SubElement(part1, 'SocialSecurityTax').text = str(form_data['social_security_tax'])
            
            # Medicare
            ET.SubElement(part1, 'MedicareWagesTips').text = str(form_data['medicare_wages_tips'])
            ET.SubElement(part1, 'MedicareTax').text = str(form_data['medicare_tax'])
            ET.SubElement(part1, 'AdditionalMedicareTax').text = str(form_data['additional_medicare_tax'])
            
            # Part 2: Tell us about your deposit schedule
            part2 = ET.SubElement(form941, 'Part2')
            ET.SubElement(part2, 'DepositSchedule').text = form_data['deposit_schedule'].upper()
            ET.SubElement(part2, 'TotalTaxLiability').text = str(form_data['total_tax_after_adjustments'])
            
        # Convert to string
        return ET.tostring(root, encoding='unicode', method='xml')
    
    def _sign_submission(self, xml_data: str) -> str:
        """Create digital signature for submission"""
        
        # In production, this would use real PKI certificates
        # For now, create a simple HMAC signature
        secret_key = getattr(settings, 'IRS_SIGNING_KEY', 'test-key').encode()
        message = xml_data.encode()
        
        signature = hmac.new(secret_key, message, hashlib.sha256).hexdigest()
        
        return signature
    
    def _submit_to_irs(self, submission_package: Dict) -> Dict:
        """Submit package to IRS e-file system"""
        
        # In production, this would make actual API call
        # For now, return mock response
        
        submission_id = f"SUB{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        tracking_number = f"TRK{hashlib.md5(submission_id.encode()).hexdigest()[:10].upper()}"
        
        return {
            'submission_id': submission_id,
            'tracking_number': tracking_number,
            'status': self.STATUS_PENDING,
            'received_timestamp': datetime.utcnow().isoformat()
        }
    
    def _create_fire_file(self, form_type: str, data: Dict) -> bytes:
        """Create FIRE system formatted file"""
        
        # FIRE files use specific fixed-width formats
        # This is a simplified example
        
        lines = []
        
        # T Record (Transmitter)
        t_record = f"T{data['tax_year']}{data['ein']:>9}{' ':5}"
        t_record += f"{data['transmitter_name']:<40}"
        t_record += f"{data['transmitter_address']:<40}"
        lines.append(t_record)
        
        # B Records (Payer)
        for payer in data.get('payers', []):
            b_record = f"B{data['tax_year']}{payer['ein']:>9}"
            b_record += f"{payer['name']:<40}"
            lines.append(b_record)
            
            # C Records (Payee)
            for payee in payer.get('payees', []):
                c_record = f"C{payee['tin']:>9}"
                c_record += f"{payee['name']:<40}"
                c_record += f"{payee['amount']:>10}"
                lines.append(c_record)
        
        # F Record (End of File)
        f_record = f"F{len(lines)-1:>8}{' ':100}"
        lines.append(f_record)
        
        # Join with CRLF line endings as required by IRS
        return '\r\n'.join(lines).encode('ascii')
    
    def _log_submission(self, submission_package: Dict, response: Dict):
        """Log submission for audit trail"""
        
        # In production, this would save to database
        logger.info(f"IRS submission logged: {response['submission_id']}")
        
    def generate_test_file(self, form_type: str) -> Dict:
        """Generate test file for IRS Assurance Testing System (ATS)"""
        
        test_data = {
            'form_type': form_type,
            'test_scenario': 'STANDARD',
            'generated_at': datetime.utcnow().isoformat()
        }
        
        if form_type == self.FORM_941:
            test_data['form_data'] = {
                'ein': '00-0000000',
                'name': 'TEST COMPANY',
                'quarter': 1,
                'year': datetime.now().year,
                'number_of_employees': 10,
                'wages_tips_compensation': '50000.00',
                'federal_income_tax_withheld': '5000.00',
                'social_security_wages': '50000.00',
                'social_security_tax': '6200.00',
                'medicare_wages_tips': '50000.00',
                'medicare_tax': '1450.00'
            }
            
        return test_data
    
    def validate_tin(self, tin: str, tin_type: str = 'EIN') -> Dict:
        """Validate TIN (EIN/SSN) with IRS"""
        
        # Remove formatting
        tin_clean = tin.replace('-', '').replace(' ', '')
        
        # Basic validation
        if tin_type == 'EIN' and len(tin_clean) != 9:
            return {'valid': False, 'error': 'EIN must be 9 digits'}
        elif tin_type == 'SSN' and len(tin_clean) != 9:
            return {'valid': False, 'error': 'SSN must be 9 digits'}
            
        # In production, this would call IRS TIN Matching service
        # For now, return success for valid format
        return {
            'valid': True,
            'tin': tin_clean,
            'tin_type': tin_type,
            'matched': True
        }