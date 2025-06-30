from decimal import Decimal
from typing import Dict, List, Optional, Tuple
from datetime import datetime, date
import json
from django.db import models
from django.conf import settings
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from reportlab.lib.colors import black, red
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os
import tempfile
from io import BytesIO

from hr.models import Employee
from payroll.models import PayrollRun, PayrollTransaction
from users.models import Business
from custom_auth.models import Tenant
from taxes.models import TaxSettings


class W2Generator:
    def __init__(self, tenant_id: int, tax_year: int):
        self.tenant_id = tenant_id
        self.tax_year = tax_year
        self.tenant = Tenant.objects.get(id=tenant_id)
        self.business = Business.objects.filter(tenant_id=tenant_id).first()
        
    def generate_all_w2s(self) -> List[Dict]:
        """Generate W-2s for all employees"""
        employees = Employee.objects.filter(
            tenant_id=self.tenant_id,
            status='active'
        )
        
        w2_data = []
        for employee in employees:
            if self._employee_has_wages(employee):
                w2_info = self._generate_employee_w2(employee)
                if w2_info:
                    w2_data.append(w2_info)
                    
        return w2_data
    
    def _employee_has_wages(self, employee: Employee) -> bool:
        """Check if employee has wages for the tax year"""
        return PayrollRun.objects.filter(
            tenant_id=self.tenant_id,
            employee=employee,
            pay_date__year=self.tax_year,
            status='paid'
        ).exists()
    
    def _generate_employee_w2(self, employee: Employee) -> Optional[Dict]:
        """Generate W-2 data for a single employee"""
        # Get all payroll records for the year
        payrolls = PayrollRun.objects.filter(
            tenant_id=self.tenant_id,
            employee=employee,
            pay_date__year=self.tax_year,
            status='paid'
        ).order_by('pay_date')
        
        if not payrolls.exists():
            return None
            
        # Calculate totals
        wage_data = self._calculate_wage_totals(employee, payrolls)
        tax_data = self._calculate_tax_totals(employee, payrolls)
        state_data = self._calculate_state_totals(employee, payrolls)
        
        w2_data = {
            'employee': {
                'ssn': employee.ssn,
                'name': f"{employee.first_name} {employee.middle_name or ''} {employee.last_name}".strip(),
                'address': employee.address,
                'city': employee.city,
                'state': employee.state,
                'zip': employee.zip_code,
                'employee_id': employee.id
            },
            'employer': {
                'ein': self.business.ein if self.business else '',
                'name': self.business.name if self.business else self.tenant.company_name,
                'address': self.business.address if self.business else '',
                'city': self.business.city if self.business else '',
                'state': self.business.state if self.business else '',
                'zip': self.business.zip_code if self.business else '',
            },
            'wages': wage_data,
            'taxes': tax_data,
            'state_data': state_data,
            'tax_year': self.tax_year,
            'control_number': self._generate_control_number(employee),
            'generated_date': datetime.now().isoformat()
        }
        
        return w2_data
    
    def _calculate_wage_totals(self, employee: Employee, payrolls) -> Dict:
        """Calculate wage totals for W-2"""
        totals = {
            'wages_tips_other': Decimal('0.00'),
            'federal_taxable': Decimal('0.00'),
            'social_security_wages': Decimal('0.00'),
            'medicare_wages': Decimal('0.00'),
            'social_security_tips': Decimal('0.00'),
            'allocated_tips': Decimal('0.00'),
            'advance_eic': Decimal('0.00'),
            'dependent_care': Decimal('0.00'),
            'nonqualified_plans': Decimal('0.00'),
            'box12_codes': {},
            'box14_other': {}
        }
        
        for payroll in payrolls:
            items = PayrollTransaction.objects.filter(payroll_run=payroll)
            
            for item in items:
                if item.item_type == 'earning':
                    totals['wages_tips_other'] += item.amount
                    totals['federal_taxable'] += item.amount
                    
                    # Check SS wage base limit ($160,200 for 2023)
                    ss_wage_base = Decimal('160200.00')  # Should be configurable by year
                    if totals['social_security_wages'] < ss_wage_base:
                        ss_amount = min(item.amount, ss_wage_base - totals['social_security_wages'])
                        totals['social_security_wages'] += ss_amount
                    
                    totals['medicare_wages'] += item.amount
                    
                elif item.item_type == 'deduction':
                    # Handle pre-tax deductions
                    if item.description in ['401k', '401(k)', 'Retirement']:
                        totals['box12_codes']['D'] = totals['box12_codes'].get('D', Decimal('0.00')) + item.amount
                        totals['federal_taxable'] -= item.amount
                    elif item.description in ['Health Insurance', 'Medical']:
                        totals['box12_codes']['DD'] = totals['box12_codes'].get('DD', Decimal('0.00')) + item.amount
                        totals['federal_taxable'] -= item.amount
                        
        return totals
    
    def _calculate_tax_totals(self, employee: Employee, payrolls) -> Dict:
        """Calculate tax withholding totals"""
        totals = {
            'federal_withheld': Decimal('0.00'),
            'social_security_withheld': Decimal('0.00'),
            'medicare_withheld': Decimal('0.00'),
            'social_security_employer': Decimal('0.00'),
            'medicare_employer': Decimal('0.00')
        }
        
        for payroll in payrolls:
            items = PayrollTransaction.objects.filter(payroll_run=payroll)
            
            for item in items:
                if item.item_type == 'tax':
                    if 'federal' in item.description.lower() and 'income' in item.description.lower():
                        totals['federal_withheld'] += item.amount
                    elif 'social security' in item.description.lower() or 'ss' in item.description.lower():
                        totals['social_security_withheld'] += item.amount
                        totals['social_security_employer'] += item.amount  # Employer matches
                    elif 'medicare' in item.description.lower():
                        totals['medicare_withheld'] += item.amount
                        totals['medicare_employer'] += item.amount  # Employer matches
                        
        return totals
    
    def _calculate_state_totals(self, employee: Employee, payrolls) -> List[Dict]:
        """Calculate state tax totals"""
        state_data = {}
        
        for payroll in payrolls:
            items = PayrollTransaction.objects.filter(payroll_run=payroll)
            
            for item in items:
                if item.item_type == 'tax' and 'state' in item.description.lower():
                    # Extract state code from description
                    state_code = employee.state  # Default to employee's state
                    
                    if state_code not in state_data:
                        state_data[state_code] = {
                            'state': state_code,
                            'state_wages': Decimal('0.00'),
                            'state_tax_withheld': Decimal('0.00'),
                            'local_wages': Decimal('0.00'),
                            'local_tax_withheld': Decimal('0.00'),
                            'locality_name': ''
                        }
                    
                    state_data[state_code]['state_tax_withheld'] += item.amount
                    
            # Add wages to state totals
            if employee.state in state_data:
                earnings = items.filter(item_type='earning').aggregate(
                    total=models.Sum('amount')
                )['total'] or Decimal('0.00')
                state_data[employee.state]['state_wages'] += earnings
                
        return list(state_data.values())
    
    def _generate_control_number(self, employee: Employee) -> str:
        """Generate unique control number for W-2"""
        return f"W2-{self.tax_year}-{self.tenant_id}-{employee.id}"
    
    def generate_w2_pdf(self, w2_data: Dict) -> BytesIO:
        """Generate PDF for W-2 form"""
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        
        # Generate all copies (Copy A, B, C, D, 1, 2)
        copies = [
            ('Copy A', 'For Social Security Administration'),
            ('Copy B', 'To Be Filed With Employee\'s FEDERAL Tax Return'),
            ('Copy C', 'For EMPLOYEE\'S RECORDS'),
            ('Copy D', 'For Employer'),
            ('Copy 1', 'For State, City, or Local Tax Department'),
            ('Copy 2', 'To Be Filed With Employee\'s State Tax Return')
        ]
        
        for copy_type, copy_desc in copies:
            self._draw_w2_form(c, w2_data, copy_type, copy_desc)
            c.showPage()
            
        c.save()
        buffer.seek(0)
        return buffer
    
    def _draw_w2_form(self, c: canvas.Canvas, data: Dict, copy_type: str, copy_desc: str):
        """Draw a single W-2 form copy"""
        # Set up the page
        width, height = letter
        
        # Draw form header
        c.setFont("Helvetica-Bold", 10)
        c.drawString(0.5*inch, height - 0.5*inch, f"Form W-2 Wage and Tax Statement {data['tax_year']}")
        c.drawString(width - 2.5*inch, height - 0.5*inch, copy_type)
        
        c.setFont("Helvetica", 8)
        c.drawString(0.5*inch, height - 0.7*inch, copy_desc)
        
        # Draw form boxes
        y_start = height - 1.2*inch
        
        # Box a - Employee's SSN
        self._draw_box(c, 0.5*inch, y_start, 2*inch, 0.5*inch, 
                      "a Employee's social security number", data['employee']['ssn'])
        
        # Box b - Employer ID
        self._draw_box(c, 2.6*inch, y_start, 2*inch, 0.5*inch,
                      "b Employer identification number (EIN)", data['employer']['ein'])
        
        # Box c - Employer's name and address
        y = y_start - 0.6*inch
        self._draw_box(c, 0.5*inch, y, 4.1*inch, 1*inch,
                      "c Employer's name, address, and ZIP code",
                      f"{data['employer']['name']}\n{data['employer']['address']}\n{data['employer']['city']}, {data['employer']['state']} {data['employer']['zip']}")
        
        # Box d - Control number
        self._draw_box(c, 4.7*inch, y_start, 3*inch, 0.5*inch,
                      "d Control number", data['control_number'])
        
        # Box e - Employee's name
        y = y - 1.1*inch
        self._draw_box(c, 0.5*inch, y, 4.1*inch, 0.8*inch,
                      "e Employee's first name and initial, last name",
                      f"{data['employee']['name']}\n{data['employee']['address']}\n{data['employee']['city']}, {data['employee']['state']} {data['employee']['zip']}")
        
        # Wage and tax boxes
        y = y - 1*inch
        box_data = [
            ("1", "Wages, tips, other compensation", data['wages']['wages_tips_other']),
            ("2", "Federal income tax withheld", data['taxes']['federal_withheld']),
            ("3", "Social security wages", data['wages']['social_security_wages']),
            ("4", "Social security tax withheld", data['taxes']['social_security_withheld']),
            ("5", "Medicare wages and tips", data['wages']['medicare_wages']),
            ("6", "Medicare tax withheld", data['taxes']['medicare_withheld']),
            ("7", "Social security tips", data['wages']['social_security_tips']),
            ("8", "Allocated tips", data['wages']['allocated_tips']),
            ("9", "Advance EIC payment", data['wages']['advance_eic']),
            ("10", "Dependent care benefits", data['wages']['dependent_care']),
            ("11", "Nonqualified plans", data['wages']['nonqualified_plans']),
        ]
        
        # Draw boxes 1-6 (left column)
        for i in range(6):
            box_num, label, value = box_data[i]
            self._draw_box(c, 0.5*inch, y - (i*0.6*inch), 3.5*inch, 0.5*inch,
                          f"{box_num} {label}", f"${value:,.2f}")
        
        # Draw boxes 7-11 (right column)
        for i in range(6, min(11, len(box_data))):
            box_num, label, value = box_data[i]
            self._draw_box(c, 4.1*inch, y - ((i-6)*0.6*inch), 3.5*inch, 0.5*inch,
                          f"{box_num} {label}", f"${value:,.2f}" if value else "")
        
        # Box 12 - Codes
        y = y - 3.8*inch
        if data['wages']['box12_codes']:
            codes_text = "\n".join([f"{code} ${amount:,.2f}" 
                                   for code, amount in data['wages']['box12_codes'].items()])
            self._draw_box(c, 0.5*inch, y, 3.5*inch, 0.8*inch, "12", codes_text)
        
        # Box 14 - Other
        if data['wages']['box14_other']:
            other_text = "\n".join([f"{desc}: ${amount:,.2f}" 
                                   for desc, amount in data['wages']['box14_other'].items()])
            self._draw_box(c, 4.1*inch, y, 3.5*inch, 0.8*inch, "14 Other", other_text)
        
        # State and local taxes
        if data['state_data']:
            y = y - 1*inch
            for i, state_info in enumerate(data['state_data'][:2]):  # Max 2 states per form
                x_offset = 0.5*inch if i == 0 else 4.1*inch
                
                self._draw_box(c, x_offset, y, 0.8*inch, 0.4*inch, "15 State", state_info['state'])
                self._draw_box(c, x_offset + 0.9*inch, y, 1.5*inch, 0.4*inch, 
                              "Employer's state ID number", "")
                
                self._draw_box(c, x_offset, y - 0.5*inch, 1.2*inch, 0.4*inch, 
                              "16 State wages", f"${state_info['state_wages']:,.2f}")
                self._draw_box(c, x_offset + 1.3*inch, y - 0.5*inch, 1.2*inch, 0.4*inch,
                              "17 State tax", f"${state_info['state_tax_withheld']:,.2f}")
    
    def _draw_box(self, c: canvas.Canvas, x: float, y: float, width: float, height: float, 
                  label: str, value: str):
        """Draw a form box with label and value"""
        # Draw box
        c.rect(x, y, width, height)
        
        # Draw label
        c.setFont("Helvetica", 6)
        c.drawString(x + 2, y + height - 10, label)
        
        # Draw value
        c.setFont("Helvetica", 9)
        if '\n' in str(value):
            lines = str(value).split('\n')
            for i, line in enumerate(lines):
                c.drawString(x + 2, y + height - 20 - (i*10), line)
        else:
            c.drawString(x + 2, y + height - 20, str(value))
    
    def generate_w3_transmittal(self, w2_data_list: List[Dict]) -> BytesIO:
        """Generate W-3 transmittal form"""
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        
        # Calculate totals from all W-2s
        totals = {
            'wages': Decimal('0.00'),
            'federal_tax': Decimal('0.00'),
            'ss_wages': Decimal('0.00'),
            'ss_tax': Decimal('0.00'),
            'medicare_wages': Decimal('0.00'),
            'medicare_tax': Decimal('0.00'),
            'ss_tips': Decimal('0.00'),
            'allocated_tips': Decimal('0.00'),
            'advance_eic': Decimal('0.00'),
            'dependent_care': Decimal('0.00'),
            'nonqualified': Decimal('0.00'),
            'num_forms': len(w2_data_list)
        }
        
        for w2 in w2_data_list:
            totals['wages'] += w2['wages']['wages_tips_other']
            totals['federal_tax'] += w2['taxes']['federal_withheld']
            totals['ss_wages'] += w2['wages']['social_security_wages']
            totals['ss_tax'] += w2['taxes']['social_security_withheld']
            totals['medicare_wages'] += w2['wages']['medicare_wages']
            totals['medicare_tax'] += w2['taxes']['medicare_withheld']
            totals['ss_tips'] += w2['wages']['social_security_tips']
            totals['allocated_tips'] += w2['wages']['allocated_tips']
            totals['advance_eic'] += w2['wages']['advance_eic']
            totals['dependent_care'] += w2['wages']['dependent_care']
            totals['nonqualified'] += w2['wages']['nonqualified_plans']
        
        # Draw W-3 form
        width, height = letter
        
        c.setFont("Helvetica-Bold", 12)
        c.drawString(0.5*inch, height - 0.5*inch, f"Form W-3 Transmittal of Wage and Tax Statements {self.tax_year}")
        
        c.setFont("Helvetica", 10)
        c.drawString(0.5*inch, height - 0.8*inch, "Send this entire page with the entire Copy A page of Forms W-2 to the Social Security Administration.")
        
        # Draw form fields
        y = height - 1.5*inch
        
        # Control number
        self._draw_box(c, 0.5*inch, y, 2*inch, 0.5*inch, "a Control number", f"W3-{self.tax_year}-{self.tenant_id}")
        
        # Kind of Payer
        self._draw_box(c, 2.6*inch, y, 2*inch, 0.5*inch, "b Kind of Payer", "941")
        
        # Total number of forms
        self._draw_box(c, 4.7*inch, y, 1.5*inch, 0.5*inch, "c Total number of Forms W-2", str(totals['num_forms']))
        
        # Employer identification
        y = y - 0.6*inch
        employer = w2_data_list[0]['employer'] if w2_data_list else {}
        self._draw_box(c, 0.5*inch, y, 2*inch, 0.5*inch, "d Establishment number", "")
        self._draw_box(c, 2.6*inch, y, 3*inch, 0.5*inch, "e Employer identification number (EIN)", employer.get('ein', ''))
        
        # Employer name and address
        y = y - 0.6*inch
        self._draw_box(c, 0.5*inch, y, 5*inch, 1*inch, "f Employer's name",
                      f"{employer.get('name', '')}\n{employer.get('address', '')}\n{employer.get('city', '')}, {employer.get('state', '')} {employer.get('zip', '')}")
        
        # Wage totals
        y = y - 1.2*inch
        wage_boxes = [
            ("1", "Wages, tips, other compensation", totals['wages']),
            ("2", "Federal income tax withheld", totals['federal_tax']),
            ("3", "Social security wages", totals['ss_wages']),
            ("4", "Social security tax withheld", totals['ss_tax']),
            ("5", "Medicare wages and tips", totals['medicare_wages']),
            ("6", "Medicare tax withheld", totals['medicare_tax']),
            ("7", "Social security tips", totals['ss_tips']),
            ("8", "Allocated tips", totals['allocated_tips']),
            ("9", "Advance EIC payments", totals['advance_eic']),
            ("10", "Dependent care benefits", totals['dependent_care']),
            ("11", "Nonqualified plans", totals['nonqualified']),
        ]
        
        for i, (box_num, label, value) in enumerate(wage_boxes):
            x = 0.5*inch if i < 6 else 4*inch
            y_offset = (i % 6) * 0.6*inch
            self._draw_box(c, x, y - y_offset, 3*inch, 0.5*inch,
                          f"{box_num} {label}", f"${value:,.2f}" if value else "")
        
        # Signature line
        y = y - 4*inch
        c.line(0.5*inch, y, 4*inch, y)
        c.setFont("Helvetica", 8)
        c.drawString(0.5*inch, y - 0.2*inch, "Signature")
        
        c.line(4.5*inch, y, 6*inch, y)
        c.drawString(4.5*inch, y - 0.2*inch, "Date")
        
        c.line(6.5*inch, y, 7.5*inch, y)
        c.drawString(6.5*inch, y - 0.2*inch, "Title")
        
        c.showPage()
        c.save()
        buffer.seek(0)
        return buffer
    
    def generate_employee_w2_correction(self, employee_id: int, corrections: Dict) -> Dict:
        """Generate a W-2c (corrected W-2) for an employee"""
        employee = Employee.objects.get(id=employee_id, tenant_id=self.tenant_id)
        
        # Get original W-2 data
        original_w2 = self._generate_employee_w2(employee)
        
        # Apply corrections
        corrected_w2 = original_w2.copy()
        for field_path, new_value in corrections.items():
            # Navigate nested dictionary path
            keys = field_path.split('.')
            target = corrected_w2
            for key in keys[:-1]:
                target = target[key]
            target[keys[-1]] = new_value
        
        # Create W-2c data
        w2c_data = {
            'original': original_w2,
            'corrected': corrected_w2,
            'correction_date': datetime.now().isoformat(),
            'correction_number': self._generate_correction_number(employee)
        }
        
        return w2c_data
    
    def _generate_correction_number(self, employee: Employee) -> str:
        """Generate unique correction number"""
        return f"W2C-{self.tax_year}-{self.tenant_id}-{employee.id}-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    def _get_employer_info(self) -> Dict:
        """Get employer information for forms"""
        return {
            'ein': self.business.ein if self.business else '',
            'name': self.business.name if self.business else self.tenant.company_name,
            'address': self.business.address if self.business else '',
            'city': self.business.city if self.business else '',
            'state': self.business.state if self.business else '',
            'zip': self.business.zip_code if self.business else '',
        }