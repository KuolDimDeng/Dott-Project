# payroll/services.py

import io
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.platypus.flowables import HRFlowable
from django.core.files.base import ContentFile
from payments.providers import PaymentProviderRegistry
from .models import PayrollTransaction

class PayrollService:
    """Service for processing payroll payments"""
    
    @staticmethod
    def process_payments(payroll_run, user):
        """Process payments for a payroll run"""
        transactions = PayrollTransaction.objects.filter(payroll_run=payroll_run)
        results = []
        
        for transaction in transactions:
            employee = transaction.employee
            
            # Get appropriate payment provider for this employee's country
            country_code = employee.country or payroll_run.country_code or 'US'
            provider = PaymentProviderRegistry.get_provider_for_country(country_code)
            
            # Process payment
            result = provider.process_payroll_payment(
                employee=employee,
                amount=transaction.net_pay,
                currency=payroll_run.currency_code,
                metadata={
                    'payroll_id': str(payroll_run.id),
                    'transaction_id': str(transaction.id),
                    'company_id': str(user.company.id),
                    'description': f"Salary payment for {payroll_run.start_date} to {payroll_run.end_date}"
                }
            )
            
            # Record payment result
            transaction.payment_status = 'success' if result['success'] else 'failed'
            transaction.payment_provider = result['provider']
            transaction.payment_transaction_id = result.get('transaction_id', '')
            transaction.payment_error = result.get('error', '')
            transaction.save()
            
            results.append({
                'employee_id': str(employee.id),
                'amount': transaction.net_pay,
                'currency': payroll_run.currency_code,
                'success': result['success'],
                'provider': result['provider'],
                'error': result.get('error', '')
            })
            
        return results


def generate_pay_stub_pdf(pay_statement):
    """Generate a PDF pay stub for the given pay statement"""
    buffer = io.BytesIO()
    
    # Create the PDF object
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch)
    
    # Container for the 'Flowable' objects
    elements = []
    
    # Define styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=30,
        alignment=1  # Center alignment
    )
    
    # Company info
    elements.append(Paragraph("PAY STATEMENT", title_style))
    elements.append(Spacer(1, 0.25*inch))
    
    # Employee and pay period info
    employee_data = [
        ['Employee Information', '', 'Pay Period Information', ''],
        ['Name:', pay_statement.employee.full_name, 'Period Start:', pay_statement.pay_period_start.strftime('%m/%d/%Y')],
        ['Employee ID:', pay_statement.employee.employee_number, 'Period End:', pay_statement.pay_period_end.strftime('%m/%d/%Y')],
        ['Department:', pay_statement.employee.department or 'N/A', 'Pay Date:', pay_statement.pay_date.strftime('%m/%d/%Y')],
    ]
    
    employee_table = Table(employee_data, colWidths=[1.5*inch, 2*inch, 1.5*inch, 2*inch])
    employee_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (1, 0), colors.lightgrey),
        ('BACKGROUND', (2, 0), (3, 0), colors.lightgrey),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('SPAN', (0, 0), (1, 0)),
        ('SPAN', (2, 0), (3, 0)),
    ]))
    elements.append(employee_table)
    elements.append(Spacer(1, 0.25*inch))
    
    # Earnings section
    earnings_data = [
        ['EARNINGS', 'Hours', 'Rate', 'Current', 'YTD'],
        ['Regular', f"{pay_statement.regular_hours:.2f}", '', f"${pay_statement.gross_pay:.2f}", f"${pay_statement.ytd_gross:.2f}"],
    ]
    
    if pay_statement.overtime_hours > 0:
        earnings_data.append(['Overtime', f"{pay_statement.overtime_hours:.2f}", '', '', ''])
    if pay_statement.pto_hours > 0:
        earnings_data.append(['PTO', f"{pay_statement.pto_hours:.2f}", '', '', ''])
    if pay_statement.sick_hours > 0:
        earnings_data.append(['Sick', f"{pay_statement.sick_hours:.2f}", '', '', ''])
    if pay_statement.holiday_hours > 0:
        earnings_data.append(['Holiday', f"{pay_statement.holiday_hours:.2f}", '', '', ''])
    
    earnings_data.append(['TOTAL GROSS PAY', '', '', f"${pay_statement.gross_pay:.2f}", f"${pay_statement.ytd_gross:.2f}"])
    
    earnings_table = Table(earnings_data, colWidths=[2*inch, 1*inch, 1*inch, 1.5*inch, 1.5*inch])
    earnings_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
    ]))
    elements.append(earnings_table)
    elements.append(Spacer(1, 0.25*inch))
    
    # Deductions section
    deductions_data = [
        ['DEDUCTIONS', 'Current', 'YTD'],
        ['Federal Tax', f"${pay_statement.federal_tax:.2f}", f"${pay_statement.ytd_federal_tax:.2f}"],
        ['State Tax', f"${pay_statement.state_tax:.2f}", f"${pay_statement.ytd_state_tax:.2f}"],
        ['Social Security', f"${pay_statement.social_security:.2f}", f"${pay_statement.ytd_social_security:.2f}"],
        ['Medicare', f"${pay_statement.medicare:.2f}", f"${pay_statement.ytd_medicare:.2f}"],
    ]
    
    if pay_statement.health_insurance > 0:
        deductions_data.append(['Health Insurance', f"${pay_statement.health_insurance:.2f}", ''])
    if pay_statement.dental_insurance > 0:
        deductions_data.append(['Dental Insurance', f"${pay_statement.dental_insurance:.2f}", ''])
    if pay_statement.vision_insurance > 0:
        deductions_data.append(['Vision Insurance', f"${pay_statement.vision_insurance:.2f}", ''])
    if pay_statement.retirement_401k > 0:
        deductions_data.append(['401(k)', f"${pay_statement.retirement_401k:.2f}", ''])
    
    total_deductions = (
        pay_statement.federal_tax + pay_statement.state_tax + 
        pay_statement.social_security + pay_statement.medicare +
        (pay_statement.health_insurance or 0) + (pay_statement.dental_insurance or 0) +
        (pay_statement.vision_insurance or 0) + (pay_statement.retirement_401k or 0) +
        (pay_statement.other_deductions or 0)
    )
    
    deductions_data.append(['TOTAL DEDUCTIONS', f"${total_deductions:.2f}", ''])
    
    deductions_table = Table(deductions_data, colWidths=[3*inch, 2*inch, 2*inch])
    deductions_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
    ]))
    elements.append(deductions_table)
    elements.append(Spacer(1, 0.25*inch))
    
    # Net pay section
    net_pay_data = [
        ['', 'Current', 'YTD'],
        ['NET PAY', f"${pay_statement.net_pay:.2f}", f"${pay_statement.ytd_net:.2f}"],
    ]
    
    net_pay_table = Table(net_pay_data, colWidths=[3*inch, 2*inch, 2*inch])
    net_pay_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#e0f2fe')),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('GRID', (0, 1), (-1, 1), 1, colors.HexColor('#1e40af')),
        ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
    ]))
    elements.append(net_pay_table)
    
    # Build the PDF
    doc.build(elements)
    
    # Get the value of the BytesIO buffer and create a ContentFile
    pdf_content = buffer.getvalue()
    buffer.close()
    
    # Create a Django ContentFile
    filename = f"paystub_{pay_statement.employee.employee_number}_{pay_statement.pay_date}.pdf"
    return ContentFile(pdf_content, name=filename)