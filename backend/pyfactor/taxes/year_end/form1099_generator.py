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
from io import BytesIO

from purchases.models import Vendor, Purchase, PurchaseOrder
from sales.models import Invoice
from users.models import Business
from custom_auth.models import Tenant
from taxes.models import TaxSettings


class Form1099Generator:
    def __init__(self, tenant_id: int, tax_year: int):
        self.tenant_id = tenant_id
        self.tax_year = tax_year
        self.tenant = Tenant.objects.get(id=tenant_id)
        self.business = Business.objects.filter(tenant_id=tenant_id).first()
        
        # IRS thresholds for 1099 reporting
        self.thresholds = {
            '1099-NEC': Decimal('600.00'),  # Nonemployee compensation
            '1099-MISC': {
                'rent': Decimal('600.00'),
                'prizes': Decimal('600.00'),
                'other_income': Decimal('600.00'),
                'medical': Decimal('600.00'),
                'fishing': Decimal('600.00'),
                'attorney': Decimal('600.00'),
                'substitute_dividends': Decimal('10.00'),
                'crop_insurance': Decimal('600.00'),
                'gross_proceeds': Decimal('600.00')
            }
        }
    
    def generate_all_1099s(self) -> Dict[str, List[Dict]]:
        """Generate all 1099 forms for vendors"""
        vendors = Vendor.objects.filter(
            tenant_id=self.tenant_id,
            is_1099_vendor=True
        )
        
        forms_data = {
            '1099-NEC': [],
            '1099-MISC': []
        }
        
        for vendor in vendors:
            # Check if vendor requires 1099
            vendor_payments = self._calculate_vendor_payments(vendor)
            
            # Generate 1099-NEC if applicable
            if vendor_payments['nonemployee_compensation'] >= self.thresholds['1099-NEC']:
                nec_data = self._generate_1099_nec(vendor, vendor_payments)
                if nec_data:
                    forms_data['1099-NEC'].append(nec_data)
            
            # Generate 1099-MISC if applicable
            misc_data = self._check_1099_misc_requirements(vendor, vendor_payments)
            if misc_data:
                forms_data['1099-MISC'].append(misc_data)
                
        return forms_data
    
    def _calculate_vendor_payments(self, vendor: Vendor) -> Dict[str, Decimal]:
        """Calculate total payments to vendor by category"""
        payments = {
            'nonemployee_compensation': Decimal('0.00'),
            'rent': Decimal('0.00'),
            'royalties': Decimal('0.00'),
            'other_income': Decimal('0.00'),
            'medical_payments': Decimal('0.00'),
            'attorney_payments': Decimal('0.00'),
            'fishing_proceeds': Decimal('0.00'),
            'substitute_dividends': Decimal('0.00'),
            'crop_insurance': Decimal('0.00'),
            'gross_proceeds': Decimal('0.00'),
            'federal_tax_withheld': Decimal('0.00'),
            'state_tax_withheld': Decimal('0.00')
        }
        
        # Get all purchases from this vendor
        purchases = Purchase.objects.filter(
            tenant_id=self.tenant_id,
            vendor=vendor,
            payment_date__year=self.tax_year,
            status='paid'
        )
        
        for purchase in purchases:
            # Categorize payments based on purchase type/description
            category = self._categorize_payment(purchase)
            if category in payments:
                payments[category] += purchase.total_amount
                
        # Also check direct payments from invoices
        direct_payments = Invoice.objects.filter(
            tenant_id=self.tenant_id,
            date__year=self.tax_year,
            vendor=vendor,
            status='paid'
        )
        
        for payment in direct_payments:
            if payment.total_amount:
                category = self._categorize_payment_by_description(payment.description or '')
                if category in payments:
                    payments[category] += payment.total_amount
                    
        return payments
    
    def _categorize_payment(self, purchase: Purchase) -> str:
        """Categorize payment based on purchase details"""
        description = purchase.description.lower() if purchase.description else ''
        
        if any(term in description for term in ['service', 'consulting', 'freelance', 'contract']):
            return 'nonemployee_compensation'
        elif 'rent' in description:
            return 'rent'
        elif 'legal' in description or 'attorney' in description:
            return 'attorney_payments'
        elif 'medical' in description or 'health' in description:
            return 'medical_payments'
        elif 'royalty' in description or 'royalties' in description:
            return 'royalties'
        else:
            return 'other_income'
    
    def _categorize_purchase(self, purchase: Purchase) -> str:
        """Categorize purchase payment"""
        description = purchase.description.lower() if purchase.description else ''
        
        if any(term in description for term in ['professional services', 'contract labor', 'consulting']):
            return 'nonemployee_compensation'
        elif 'rent' in description:
            return 'rent'
        elif 'legal' in description:
            return 'attorney_payments'
        else:
            return self._categorize_payment_by_description(description)
    
    def _categorize_payment_by_description(self, description: str) -> str:
        """Helper to categorize by description"""
        description = description.lower()
        if any(term in description for term in ['service', 'consulting', 'freelance']):
            return 'nonemployee_compensation'
        elif 'rent' in description:
            return 'rent'
        elif 'legal' in description:
            return 'attorney_payments'
        else:
            return 'other_income'
    
    def _is_vendor_payment(self, purchase: Purchase, vendor: Vendor) -> bool:
        """Check if purchase is a payment to vendor"""
        vendor_name = vendor.company_name or f"{vendor.first_name} {vendor.last_name}"
        return (vendor_name.lower() in purchase.description.lower() and
                purchase.total_amount and purchase.total_amount > 0)
    
    def _generate_1099_nec(self, vendor: Vendor, payments: Dict) -> Optional[Dict]:
        """Generate 1099-NEC data for vendor"""
        if payments['nonemployee_compensation'] < self.thresholds['1099-NEC']:
            return None
            
        return {
            'form_type': '1099-NEC',
            'tax_year': self.tax_year,
            'payer': {
                'name': self.business.name if self.business else self.tenant.company_name,
                'tin': self.business.ein if self.business else '',
                'address': self.business.address if self.business else '',
                'city': self.business.city if self.business else '',
                'state': self.business.state if self.business else '',
                'zip': self.business.zip_code if self.business else '',
                'phone': self.business.phone if self.business else ''
            },
            'recipient': {
                'name': vendor.company_name or f"{vendor.first_name} {vendor.last_name}",
                'tin': vendor.tax_id_number,
                'address': vendor.address,
                'city': vendor.city,
                'state': vendor.state,
                'zip': vendor.zip_code,
                'account_number': vendor.account_number or ''
            },
            'amounts': {
                'box1_nonemployee_compensation': payments['nonemployee_compensation'],
                'box4_federal_tax_withheld': payments['federal_tax_withheld'],
                'box5_state_tax_withheld': payments['state_tax_withheld'],
                'box6_state_income': payments['nonemployee_compensation']  # Usually same as box 1
            },
            'state_info': {
                'state': vendor.state,
                'payer_state_no': '',
                'state_income': payments['nonemployee_compensation']
            },
            'corrected': False,
            'void': False,
            'generated_date': datetime.now().isoformat()
        }
    
    def _check_1099_misc_requirements(self, vendor: Vendor, payments: Dict) -> Optional[Dict]:
        """Check if vendor requires 1099-MISC and generate if needed"""
        misc_required = False
        misc_amounts = {}
        
        # Check each box threshold
        threshold_checks = {
            'box1_rents': ('rent', self.thresholds['1099-MISC']['rent']),
            'box2_royalties': ('royalties', self.thresholds['1099-MISC']['other_income']),
            'box3_other_income': ('other_income', self.thresholds['1099-MISC']['other_income']),
            'box6_medical': ('medical_payments', self.thresholds['1099-MISC']['medical']),
            'box7_fishing': ('fishing_proceeds', self.thresholds['1099-MISC']['fishing']),
            'box10_gross_proceeds': ('gross_proceeds', self.thresholds['1099-MISC']['gross_proceeds']),
            'box14_attorney': ('attorney_payments', self.thresholds['1099-MISC']['attorney'])
        }
        
        for box_name, (payment_type, threshold) in threshold_checks.items():
            if payments[payment_type] >= threshold:
                misc_required = True
                misc_amounts[box_name] = payments[payment_type]
            else:
                misc_amounts[box_name] = Decimal('0.00')
                
        if not misc_required:
            return None
            
        return {
            'form_type': '1099-MISC',
            'tax_year': self.tax_year,
            'payer': {
                'name': self.business.name if self.business else self.tenant.company_name,
                'tin': self.business.ein if self.business else '',
                'address': self.business.address if self.business else '',
                'city': self.business.city if self.business else '',
                'state': self.business.state if self.business else '',
                'zip': self.business.zip_code if self.business else '',
                'phone': self.business.phone if self.business else ''
            },
            'recipient': {
                'name': vendor.company_name or f"{vendor.first_name} {vendor.last_name}",
                'tin': vendor.tax_id_number,
                'address': vendor.address,
                'city': vendor.city,
                'state': vendor.state,
                'zip': vendor.zip_code,
                'account_number': vendor.account_number or ''
            },
            'amounts': misc_amounts,
            'box4_federal_tax_withheld': payments['federal_tax_withheld'],
            'state_info': {
                'state': vendor.state,
                'payer_state_no': '',
                'state_tax_withheld': payments['state_tax_withheld']
            },
            'corrected': False,
            'void': False,
            'generated_date': datetime.now().isoformat()
        }
    
    def generate_1099_pdf(self, form_data: Dict) -> BytesIO:
        """Generate PDF for 1099 form"""
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        
        if form_data['form_type'] == '1099-NEC':
            copies = [
                ('Copy A', 'For Internal Revenue Service Center'),
                ('Copy B', 'For Recipient'),
                ('Copy C', 'For Payer'),
                ('Copy 1', 'For State Tax Department'),
                ('Copy 2', 'To be filed with recipient\'s state income tax return')
            ]
        else:  # 1099-MISC
            copies = [
                ('Copy A', 'For Internal Revenue Service Center'),
                ('Copy B', 'For Recipient'),
                ('Copy C', 'For Payer'),
                ('Copy 1', 'For State Tax Department'),
                ('Copy 2', 'To be filed with recipient\'s state income tax return')
            ]
        
        for copy_type, copy_desc in copies:
            if form_data['form_type'] == '1099-NEC':
                self._draw_1099_nec_form(c, form_data, copy_type, copy_desc)
            else:
                self._draw_1099_misc_form(c, form_data, copy_type, copy_desc)
            c.showPage()
            
        c.save()
        buffer.seek(0)
        return buffer
    
    def _draw_1099_nec_form(self, c: canvas.Canvas, data: Dict, copy_type: str, copy_desc: str):
        """Draw 1099-NEC form"""
        width, height = letter
        
        # Header
        c.setFont("Helvetica-Bold", 10)
        c.drawString(0.5*inch, height - 0.5*inch, f"Form 1099-NEC Nonemployee Compensation {data['tax_year']}")
        c.drawString(width - 2*inch, height - 0.5*inch, copy_type)
        
        c.setFont("Helvetica", 8)
        c.drawString(0.5*inch, height - 0.7*inch, copy_desc)
        
        # Void/Corrected checkboxes
        y = height - 1*inch
        c.rect(0.5*inch, y, 0.2*inch, 0.2*inch)
        c.drawString(0.8*inch, y + 0.05*inch, "VOID")
        if data.get('void'):
            c.drawString(0.55*inch, y + 0.05*inch, "X")
            
        c.rect(1.5*inch, y, 0.2*inch, 0.2*inch)
        c.drawString(1.8*inch, y + 0.05*inch, "CORRECTED")
        if data.get('corrected'):
            c.drawString(1.55*inch, y + 0.05*inch, "X")
        
        # Payer information
        y = y - 0.5*inch
        self._draw_box(c, 0.5*inch, y, 3.5*inch, 1*inch, "PAYER'S name, street address, city, state, ZIP code, and telephone no.",
                      f"{data['payer']['name']}\n{data['payer']['address']}\n{data['payer']['city']}, {data['payer']['state']} {data['payer']['zip']}\n{data['payer']['phone']}")
        
        # Payer's TIN
        self._draw_box(c, 4.1*inch, y + 0.5*inch, 2*inch, 0.4*inch, "PAYER'S TIN", data['payer']['tin'])
        
        # Recipient's TIN
        self._draw_box(c, 4.1*inch, y, 2*inch, 0.4*inch, "RECIPIENT'S TIN", data['recipient']['tin'])
        
        # Recipient information
        y = y - 1.1*inch
        self._draw_box(c, 0.5*inch, y, 3.5*inch, 1*inch, "RECIPIENT'S name, street address, city, state, and ZIP code",
                      f"{data['recipient']['name']}\n{data['recipient']['address']}\n{data['recipient']['city']}, {data['recipient']['state']} {data['recipient']['zip']}")
        
        # Account number
        if data['recipient'].get('account_number'):
            self._draw_box(c, 4.1*inch, y + 0.6*inch, 2*inch, 0.3*inch, "Account number", data['recipient']['account_number'])
        
        # Amount boxes
        y = y - 1.2*inch
        
        # Box 1 - Nonemployee compensation
        self._draw_box(c, 0.5*inch, y, 2.5*inch, 0.5*inch, 
                      "1 Nonemployee compensation", f"${data['amounts']['box1_nonemployee_compensation']:,.2f}")
        
        # Box 4 - Federal income tax withheld
        self._draw_box(c, 3.1*inch, y, 2.5*inch, 0.5*inch,
                      "4 Federal income tax withheld", f"${data['amounts']['box4_federal_tax_withheld']:,.2f}" if data['amounts']['box4_federal_tax_withheld'] else "")
        
        # State tax information
        y = y - 1*inch
        if data.get('state_info'):
            self._draw_box(c, 0.5*inch, y, 1*inch, 0.4*inch, "5 State tax withheld",
                          f"${data['amounts']['box5_state_tax_withheld']:,.2f}" if data['amounts']['box5_state_tax_withheld'] else "")
            self._draw_box(c, 1.6*inch, y, 0.8*inch, 0.4*inch, "6 State/Payer's state no.",
                          f"{data['state_info']['state']}/{data['state_info'].get('payer_state_no', '')}")
            self._draw_box(c, 2.5*inch, y, 1.5*inch, 0.4*inch, "7 State income",
                          f"${data['amounts']['box6_state_income']:,.2f}")
    
    def _draw_1099_misc_form(self, c: canvas.Canvas, data: Dict, copy_type: str, copy_desc: str):
        """Draw 1099-MISC form"""
        width, height = letter
        
        # Header
        c.setFont("Helvetica-Bold", 10)
        c.drawString(0.5*inch, height - 0.5*inch, f"Form 1099-MISC Miscellaneous Information {data['tax_year']}")
        c.drawString(width - 2*inch, height - 0.5*inch, copy_type)
        
        c.setFont("Helvetica", 8)
        c.drawString(0.5*inch, height - 0.7*inch, copy_desc)
        
        # Void/Corrected checkboxes
        y = height - 1*inch
        c.rect(0.5*inch, y, 0.2*inch, 0.2*inch)
        c.drawString(0.8*inch, y + 0.05*inch, "VOID")
        if data.get('void'):
            c.drawString(0.55*inch, y + 0.05*inch, "X")
            
        c.rect(1.5*inch, y, 0.2*inch, 0.2*inch)
        c.drawString(1.8*inch, y + 0.05*inch, "CORRECTED")
        if data.get('corrected'):
            c.drawString(1.55*inch, y + 0.05*inch, "X")
        
        # Payer and recipient information (similar to NEC)
        y = y - 0.5*inch
        self._draw_box(c, 0.5*inch, y, 3.5*inch, 1*inch, "PAYER'S name, street address, city, state, ZIP code, and telephone no.",
                      f"{data['payer']['name']}\n{data['payer']['address']}\n{data['payer']['city']}, {data['payer']['state']} {data['payer']['zip']}")
        
        self._draw_box(c, 4.1*inch, y + 0.5*inch, 2*inch, 0.4*inch, "PAYER'S TIN", data['payer']['tin'])
        self._draw_box(c, 4.1*inch, y, 2*inch, 0.4*inch, "RECIPIENT'S TIN", data['recipient']['tin'])
        
        y = y - 1.1*inch
        self._draw_box(c, 0.5*inch, y, 3.5*inch, 1*inch, "RECIPIENT'S name, street address, city, state, and ZIP code",
                      f"{data['recipient']['name']}\n{data['recipient']['address']}\n{data['recipient']['city']}, {data['recipient']['state']} {data['recipient']['zip']}")
        
        # Amount boxes
        y = y - 1.2*inch
        
        # Box layout for 1099-MISC
        box_layout = [
            # Row 1
            [("1 Rents", 'box1_rents'), ("2 Royalties", 'box2_royalties')],
            # Row 2
            [("3 Other income", 'box3_other_income'), ("4 Federal income tax withheld", 'box4_federal_tax_withheld')],
            # Row 3
            [("5 Fishing boat proceeds", 'box5_fishing'), ("6 Medical and health care payments", 'box6_medical')],
            # Row 4
            [("7 Payer made direct sales of $5,000 or more", 'box7_direct_sales'), ("8 Substitute payments", 'box8_substitute')],
            # Row 5
            [("9 Crop insurance proceeds", 'box9_crop'), ("10 Gross proceeds paid to an attorney", 'box10_gross_proceeds')],
            # Row 6
            [("14 Gross proceeds paid to an attorney", 'box14_attorney'), None]
        ]
        
        row_y = y
        for row in box_layout:
            col_x = 0.5*inch
            for box_info in row:
                if box_info:
                    label, key = box_info
                    value = data['amounts'].get(key, Decimal('0.00'))
                    self._draw_box(c, col_x, row_y, 2.7*inch, 0.4*inch, label,
                                  f"${value:,.2f}" if value else "")
                col_x += 2.8*inch
            row_y -= 0.5*inch
    
    def generate_1096_transmittal(self, forms_data: Dict[str, List[Dict]]) -> BytesIO:
        """Generate 1096 transmittal form"""
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        
        # Calculate totals
        totals = {
            '1099-NEC': {
                'count': len(forms_data.get('1099-NEC', [])),
                'amount': sum(f['amounts']['box1_nonemployee_compensation'] for f in forms_data.get('1099-NEC', []))
            },
            '1099-MISC': {
                'count': len(forms_data.get('1099-MISC', [])),
                'amount': Decimal('0.00')
            }
        }
        
        # Sum all boxes for 1099-MISC
        for form in forms_data.get('1099-MISC', []):
            for key, value in form['amounts'].items():
                if value:
                    totals['1099-MISC']['amount'] += value
        
        # Draw form
        width, height = letter
        
        c.setFont("Helvetica-Bold", 12)
        c.drawString(0.5*inch, height - 0.5*inch, f"Form 1096 Annual Summary and Transmittal {self.tax_year}")
        
        c.setFont("Helvetica", 10)
        c.drawString(0.5*inch, height - 0.8*inch, "of U.S. Information Returns")
        
        # Filer information
        y = height - 1.5*inch
        business = self.business if self.business else None
        
        self._draw_box(c, 0.5*inch, y, 3*inch, 1*inch, "FILER'S name and address",
                      f"{business.name if business else self.tenant.company_name}\n"
                      f"{business.address if business else ''}\n"
                      f"{business.city if business else ''}, {business.state if business else ''} {business.zip_code if business else ''}")
        
        self._draw_box(c, 3.6*inch, y + 0.5*inch, 2*inch, 0.4*inch, "FILER'S TIN",
                      business.ein if business else '')
        
        # Type of return
        y = y - 1.5*inch
        c.drawString(0.5*inch, y + 0.3*inch, "Type of Return (check appropriate boxes):")
        
        # Checkboxes for form types
        form_types = [
            ('1099-NEC', totals['1099-NEC']['count'] > 0),
            ('1099-MISC', totals['1099-MISC']['count'] > 0),
        ]
        
        x = 0.5*inch
        for form_type, checked in form_types:
            c.rect(x, y, 0.2*inch, 0.2*inch)
            if checked:
                c.drawString(x + 0.05*inch, y + 0.05*inch, "X")
            c.drawString(x + 0.3*inch, y + 0.05*inch, form_type)
            x += 1.5*inch
        
        # Total number of forms
        y = y - 0.5*inch
        total_forms = sum(t['count'] for t in totals.values())
        self._draw_box(c, 0.5*inch, y, 2*inch, 0.4*inch, "Total number of forms", str(total_forms))
        
        # Total amount reported
        y = y - 0.5*inch
        total_amount = sum(t['amount'] for t in totals.values())
        self._draw_box(c, 0.5*inch, y, 2*inch, 0.4*inch, "Total amount reported", f"${total_amount:,.2f}")
        
        # Signature section
        y = y - 1*inch
        c.line(0.5*inch, y, 3*inch, y)
        c.setFont("Helvetica", 8)
        c.drawString(0.5*inch, y - 0.2*inch, "Signature")
        
        c.line(3.5*inch, y, 5*inch, y)
        c.drawString(3.5*inch, y - 0.2*inch, "Title")
        
        c.line(5.5*inch, y, 7*inch, y)
        c.drawString(5.5*inch, y - 0.2*inch, "Date")
        
        c.showPage()
        c.save()
        buffer.seek(0)
        return buffer
    
    def validate_tin(self, tin: str) -> bool:
        """Validate TIN/EIN format"""
        # Remove any formatting
        tin = tin.replace('-', '').replace(' ', '')
        
        # Check length
        if len(tin) != 9:
            return False
            
        # Check if all digits
        if not tin.isdigit():
            return False
            
        # Basic EIN format validation (XX-XXXXXXX)
        # First two digits should be valid EIN prefixes
        valid_prefixes = [
            '01', '02', '03', '04', '05', '06', '10', '11', '12', '13', '14', '15', '16',
            '20', '21', '22', '23', '24', '25', '26', '27', '30', '31', '32', '33', '34',
            '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47',
            '48', '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61',
            '62', '63', '64', '65', '66', '67', '68', '71', '72', '73', '74', '75', '76',
            '77', '80', '81', '82', '83', '84', '85', '86', '87', '88', '90', '91', '92',
            '93', '94', '95', '98', '99'
        ]
        
        if tin[:2] not in valid_prefixes:
            return False
            
        return True
    
    def get_vendors_requiring_1099(self) -> List[Dict]:
        """Get list of vendors that require 1099 forms"""
        vendors = Vendor.objects.filter(
            tenant_id=self.tenant_id,
            is_1099_vendor=True
        )
        
        vendors_list = []
        for vendor in vendors:
            payments = self._calculate_vendor_payments(vendor)
            total_payments = sum(payments.values())
            
            # Check if any payment category exceeds threshold
            requires_1099 = False
            if payments['nonemployee_compensation'] >= self.thresholds['1099-NEC']:
                requires_1099 = True
            else:
                for category, amount in payments.items():
                    if category in self.thresholds['1099-MISC'] and amount >= self.thresholds['1099-MISC'][category]:
                        requires_1099 = True
                        break
            
            if requires_1099:
                vendors_list.append({
                    'vendor_id': vendor.id,
                    'name': vendor.company_name or f"{vendor.first_name} {vendor.last_name}",
                    'tin': vendor.tax_id_number,
                    'tin_valid': self.validate_tin(vendor.tax_id_number) if vendor.tax_id_number else False,
                    'total_payments': total_payments,
                    'payment_breakdown': payments,
                    'forms_required': self._determine_required_forms(payments)
                })
                
        return vendors_list
    
    def _determine_required_forms(self, payments: Dict) -> List[str]:
        """Determine which 1099 forms are required based on payments"""
        forms = []
        
        if payments['nonemployee_compensation'] >= self.thresholds['1099-NEC']:
            forms.append('1099-NEC')
            
        # Check if any MISC categories exceed threshold
        misc_categories = ['rent', 'royalties', 'other_income', 'medical_payments', 
                          'attorney_payments', 'fishing_proceeds', 'gross_proceeds']
        
        for category in misc_categories:
            if category in payments and payments[category] >= self.thresholds['1099-MISC'].get(category.replace('_payments', '').replace('_proceeds', ''), Decimal('600.00')):
                if '1099-MISC' not in forms:
                    forms.append('1099-MISC')
                break
                
        return forms
    
    def _get_payer_info(self) -> Dict:
        """Get payer information for forms"""
        return {
            'name': self.business.name if self.business else self.tenant.company_name,
            'tin': self.business.ein if self.business else '',
            'address': self.business.address if self.business else '',
            'city': self.business.city if self.business else '',
            'state': self.business.state if self.business else '',
            'zip': self.business.zip_code if self.business else '',
            'phone': self.business.phone if self.business else ''
        }