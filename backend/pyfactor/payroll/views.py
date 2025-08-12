# Updated payroll/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from hr.models import Timesheet, TimesheetEntry, Employee  # Import from HR instead of payroll
from .models import (
    PayrollRun, PayrollTransaction, PayStatement, PaySetting,
    PaymentDepositMethod, IncomeWithholding, BonusPayment
)
from banking.models import BankAccount
from .serializers import (
    PayrollRunSerializer, PayrollTransactionSerializer, PayrollTimesheetSerializer, 
    PaySettingSerializer, PaymentDepositMethodSerializer, IncomeWithholdingSerializer,
    BonusPaymentSerializer
)
from datetime import date, datetime
from django.db.models import Sum, F
from django.shortcuts import get_object_or_404
from django.template.loader import render_to_string
from django.http import HttpResponse
import tempfile
# from weasyprint import HTML  # Replaced with reportlab due to system dependency issues
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib import colors
from io import BytesIO
import logging
import iso3166
from hr.utils import get_business_id_from_request

logger = logging.getLogger(__name__)
countries = iso3166

# Import at function level to avoid circular import
# taxes.services refers to the services.py file, not the services/ directory

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payroll_report(request, pk):
    """Generate a PDF report for self-service payroll"""
    try:
        payroll_run = get_object_or_404(PayrollRun, pk=pk)
        
        # Check if the payroll run belongs to the requesting business
        # Note: Add business_id check if needed for security
        
        # Get transactions for this payroll run
        transactions = PayrollTransaction.objects.filter(payroll_run=payroll_run)
        
        # Get currency information
        currency_code = payroll_run.currency_code
        currency_symbol = payroll_run.currency_symbol
        show_usd_comparison = payroll_run.show_usd_comparison
        exchange_rate = payroll_run.exchange_rate_to_usd
        
        # Add USD conversions to transactions if needed
        if show_usd_comparison and currency_code != 'USD':
            for transaction in transactions:
                # Add USD fields to each transaction
                transaction.gross_pay_usd = float(transaction.gross_pay) / exchange_rate
                transaction.net_pay_usd = float(transaction.net_pay) / exchange_rate
                transaction.taxes_usd = float(transaction.taxes) / exchange_rate
                if hasattr(transaction, 'other_deductions') and transaction.other_deductions:
                    transaction.other_deductions_usd = float(transaction.other_deductions) / exchange_rate
        
        # Calculate totals
        total_gross = sum(transaction.gross_pay for transaction in transactions)
        total_net = sum(transaction.net_pay for transaction in transactions)
        total_deductions = total_gross - total_net
        
        # Add USD totals if needed
        if show_usd_comparison and currency_code != 'USD':
            total_gross_usd = total_gross / exchange_rate
            total_net_usd = total_net / exchange_rate
            total_deductions_usd = total_deductions / exchange_rate
        else:
            total_gross_usd = total_gross
            total_net_usd = total_net
            total_deductions_usd = total_deductions
        
        # Generate tax summary
        federal_tax = sum(transaction.federal_tax for transaction in transactions)
        state_tax = sum(transaction.state_tax for transaction in transactions)
        social_security = sum(transaction.social_security_tax for transaction in transactions)
        medicare = sum(transaction.medicare_tax for transaction in transactions)
        
        tax_summary = []
        
        if payroll_run.country_code == 'US':
            tax_summary = [
                {'name': 'Federal Income Tax', 'amount': federal_tax, 'instructions': 'Pay to the IRS via EFTPS'},
                {'name': 'Social Security', 'amount': social_security, 'instructions': 'Pay to the IRS via EFTPS'},
                {'name': 'Medicare', 'amount': medicare, 'instructions': 'Pay to the IRS via EFTPS'},
            ]
            
            if state_tax > 0:
                tax_summary.append({'name': 'State Income Tax', 'amount': state_tax, 'instructions': 'Pay to state tax authority'})
        else:
            # For international, get tax information from Claude service
            from taxes.services.claude_service import ClaudeComplianceService
            compliance_data = ClaudeComplianceService.get_country_compliance_requirements(payroll_run.country_code)
            
            if compliance_data and compliance_data.get('tax_deductions'):
                for tax in compliance_data['tax_deductions']:
                    # Simple calculation - apply rate to total gross
                    if tax['type'] == 'percentage':
                        amount = total_gross * tax['rate']
                    else:
                        amount = tax['rate'] * len(transactions)  # Fixed amount per employee
                    
                    tax_summary.append({
                        'name': tax['name'],
                        'amount': amount,
                        'instructions': f"Pay to local tax authority"
                    })
        
        # Add USD conversion to tax summary if needed
        if show_usd_comparison and currency_code != 'USD':
            for tax in tax_summary:
                tax['amount_usd'] = float(tax['amount']) / exchange_rate
        
        # Create context for the template
        context = {
            'payroll_run': payroll_run,
            'transactions': transactions,
            'total_gross': total_gross,
            'total_deductions': total_deductions,
            'total_net': total_net,
            'total_gross_usd': total_gross_usd,
            'total_deductions_usd': total_deductions_usd,
            'total_net_usd': total_net_usd,
            'country_code': payroll_run.country_code,
            'country_name': countries.get_name(payroll_run.country_code, 'en'),
            'currency_code': currency_code,
            'currency_symbol': currency_symbol,
            'show_usd_comparison': show_usd_comparison,
            'exchange_rate': exchange_rate,
            'exchange_rate_date': payroll_run.run_date.strftime('%B %d, %Y'),
            'tax_summary': tax_summary,
            'company_name': request.user.company.name,
            'business_number': getattr(request.user.company, 'business_number', ''),
            'generated_date': datetime.now().strftime('%B %d, %Y'),
            'filing_frequency': payroll_run.filing_frequency if hasattr(payroll_run, 'filing_frequency') else None,
        }
        # Generate PDF using ReportLab instead of WeasyPrint
        # Create PDF buffer
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        story = []
        styles = getSampleStyleSheet()
        
        # Title
        title = Paragraph(f"Payroll Report - {payroll_run.payroll_number}", styles['Title'])
        story.append(title)
        story.append(Spacer(1, 20))
        
        # Company info
        company_info = Paragraph(f"<b>{context['company_name']}</b><br/>"
                               f"Business Number: {context['business_number']}<br/>"
                               f"Pay Period: {payroll_run.start_date} to {payroll_run.end_date}<br/>"
                               f"Generated: {context['generated_date']}", styles['Normal'])
        story.append(company_info)
        story.append(Spacer(1, 20))
        
        # Employee payments table
        data = [['Employee', 'Gross Pay', 'Deductions', 'Net Pay']]
        for transaction in transactions:
            data.append([
                transaction.employee.full_name,
                f"{context['currency_symbol']}{transaction.gross_pay:,.2f}",
                f"{context['currency_symbol']}{transaction.taxes:,.2f}",
                f"{context['currency_symbol']}{transaction.net_pay:,.2f}"
            ])
        
        # Totals row
        data.append([
            'TOTAL',
            f"{context['currency_symbol']}{context['total_gross']:,.2f}",
            f"{context['currency_symbol']}{context['total_deductions']:,.2f}",
            f"{context['currency_symbol']}{context['total_net']:,.2f}"
        ])
        
        # Create table
        t = Table(data)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, -1), (-1, -1), colors.lightgrey),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(t)
        story.append(Spacer(1, 20))
        
        # Tax summary
        if tax_summary:
            story.append(Paragraph("<b>Tax Summary</b>", styles['Heading2']))
            tax_data = [['Tax Type', 'Amount', 'Instructions']]
            for tax in tax_summary:
                amount_str = f"{context['currency_symbol']}{tax['amount']:,.2f}"
                if context.get('show_usd_comparison') and 'amount_usd' in tax:
                    amount_str += f" (USD ${tax['amount_usd']:,.2f})"
                tax_data.append([tax['name'], amount_str, tax['instructions']])
            
            tax_table = Table(tax_data)
            tax_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            story.append(tax_table)
        
        # Build PDF
        doc.build(story)
        
        # Return PDF response
        buffer.seek(0)
        response = HttpResponse(buffer.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="payroll-report-{pk}.pdf"'
        return response
        
    except Exception as e:
        logger.error(f"Error generating payroll report: {str(e)}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PayrollPreflightCheck(APIView):
    """
    Check if all prerequisites are met before running payroll
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            start_date = request.data.get('start_date')
            end_date = request.data.get('end_date')
            
            if not start_date or not end_date:
                return Response(
                    {'error': 'Start date and end date are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get all active employees
            active_employees = Employee.objects.filter(
                business_id=request.user.business_id,
                active=True
            )
            
            total_employees = active_employees.count()
            
            # Check timesheet status for each employee
            timesheet_issues = []
            approved_count = 0
            
            for employee in active_employees:
                # Get timesheet for the payroll period
                timesheet = Timesheet.objects.filter(
                    employee=employee,
                    week_starting__gte=start_date,
                    week_ending__lte=end_date
                ).first()
                
                if not timesheet:
                    timesheet_issues.append({
                        'employee_id': str(employee.id),
                        'employee_name': f"{employee.first_name} {employee.last_name}",
                        'issue': 'No timesheet found for payroll period',
                        'severity': 'error'
                    })
                elif timesheet.status != 'approved':
                    timesheet_issues.append({
                        'employee_id': str(employee.id),
                        'employee_name': f"{employee.first_name} {employee.last_name}",
                        'issue': f'Timesheet status is "{timesheet.status}" - must be approved',
                        'severity': 'error' if timesheet.status in ['draft', 'not_started'] else 'warning'
                    })
                else:
                    approved_count += 1
            
            # Check if all timesheets are approved
            payroll_ready = len(timesheet_issues) == 0
            
            # Additional checks
            additional_checks = []
            
            # Check if there are any missing supervisor approvals for wage employees
            wage_employees_pending = Employee.objects.filter(
                business_id=request.user.business_id,
                active=True,
                compensation_type='WAGE',
                supervisor__isnull=False
            ).exclude(
                timesheet_records__status='approved',
                timesheet_records__week_starting__gte=start_date,
                timesheet_records__week_ending__lte=end_date
            )
            
            if wage_employees_pending.exists():
                additional_checks.append({
                    'type': 'supervisor_approval',
                    'message': f'{wage_employees_pending.count()} wage employees have pending supervisor approvals',
                    'severity': 'warning'
                })
            
            return Response({
                'payroll_ready': payroll_ready,
                'total_employees': total_employees,
                'approved_timesheets': approved_count,
                'timesheet_issues': timesheet_issues,
                'additional_checks': additional_checks,
                'summary': {
                    'errors': len([i for i in timesheet_issues if i['severity'] == 'error']),
                    'warnings': len([i for i in timesheet_issues if i['severity'] == 'warning']),
                    'ready_percentage': (approved_count / total_employees * 100) if total_employees > 0 else 0
                }
            })
            
        except Exception as e:
            logger.error(f'Error in payroll preflight check: {str(e)}')
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class RunPayrollView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # FIRST: Run preflight check
            preflight_check = PayrollPreflightCheck()
            preflight_response = preflight_check.post(request)
            
            if preflight_response.status_code != 200:
                return preflight_response
            
            preflight_data = preflight_response.data
            
            # Check if payroll is ready
            if not preflight_data.get('payroll_ready', False):
                return Response({
                    'error': 'Payroll cannot be run - not all timesheets are approved',
                    'details': preflight_data
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Extract data
            start_date = request.data.get('start_date')
            end_date = request.data.get('end_date')
            accounting_period = request.data.get('accounting_period')
            account_id = request.data.get('account_id')
            country_code = request.data.get('country_code', 'US')  # Default to US
            show_usd_comparison = request.data.get('show_usd_comparison', False)
            
            # Get currency information
            from taxes.services.currency_service import CurrencyService
            currency_code, currency_symbol = CurrencyService.get_currency_info(country_code)
            
            # Get exchange rate to USD if needed
            exchange_rate_to_usd = 1.0
            if currency_code != 'USD':
                exchange_rate_to_usd = float(CurrencyService.get_exchange_rate(currency_code))
            
            # Check for international payroll
            is_international = country_code != 'US'
            
            # Determine service type based on country
            service_type = 'full'
            filing_instructions = None
            tax_authority_links = None
            
            if is_international:
                service_type = 'self'
                filing_instructions = f"""
                Tax Filing Instructions for {country_code}:
                1. Download the payroll report from the Reports section
                2. Submit tax filings to your local tax authority
                3. Make required social security and income tax payments
                4. Keep records of all payments made
                """
                
                tax_authority_links = {
                    'tax_authority': f'{country_code} Tax Authority',
                    'filing_portal': f'https://tax-portal.{country_code.lower()}.gov',
                    'help_center': f'https://help.{country_code.lower()}.gov/payroll'
                }
            
            # Create payroll run
            payroll_run = PayrollRun.objects.create(
                start_date=start_date,
                end_date=end_date,
                accounting_period=accounting_period,
                total_amount=0,
                country_code=country_code,
                is_international=is_international,
                service_type=service_type,
                filing_instructions=filing_instructions,
                tax_authority_links=tax_authority_links,
                # Add currency support
                currency_code=currency_code,
                currency_symbol=currency_symbol,
                exchange_rate_to_usd=exchange_rate_to_usd,
                show_usd_comparison=show_usd_comparison
            )
            
            # Only process approved timesheets
            approved_timesheets = Timesheet.objects.filter(
                employee__business_id=request.user.business_id,
                week_starting__gte=start_date,
                week_ending__lte=end_date,
                status='approved'  # Only approved timesheets
            )

            for timesheet in approved_timesheets:
                # Calculate pay based on employee type
                if timesheet.employee.compensation_type == 'SALARY':
                    # For salary employees, use the calculated total_pay from timesheet
                    gross_pay = float(timesheet.total_pay) if timesheet.total_pay else 0
                else:
                    # For wage employees, calculate from actual hours worked
                    gross_pay = float(
                        timesheet.total_regular_hours * timesheet.employee.wage_per_hour +
                        timesheet.total_overtime_hours * timesheet.employee.wage_per_hour * 1.5
                    )
                
                # Get employee's state or country
                employee_state = getattr(timesheet.employee, 'state', None)
                employee_country = getattr(timesheet.employee, 'country', country_code)
                
                # Calculate taxes based on country/state
                from taxes.services.claude_service import ClaudeComplianceService
                
                # Federal tax (US) or national income tax (international)
                income_tax = 0
                tax_rates_data = ClaudeComplianceService.get_tax_rates(
                    employee_country,
                    employee_state if employee_country == 'US' else None
                )
                
                if tax_rates_data and tax_rates_data.get('income_tax'):
                    # Simple implementation - take first bracket's rate
                    # A more complex implementation would calculate progressive taxes
                    income_tax = gross_pay * tax_rates_data['income_tax'][0]['rate']
                
                # Other payroll taxes
                social_security = 0
                medicare = 0
                
                if employee_country == 'US':
                    # US-specific tax calculations
                    social_security = gross_pay * 0.062  # 6.2%
                    medicare = gross_pay * 0.0145  # 1.45%
                
                # Calculate net pay
                total_deductions = income_tax + social_security + medicare
                net_pay = gross_pay - total_deductions

                # Create payroll transaction with tax details
                PayrollTransaction.objects.create(
                    employee=timesheet.employee,
                    payroll_run=payroll_run,
                    timesheet=timesheet,  # Link to the approved timesheet
                    gross_pay=gross_pay,
                    net_pay=net_pay,
                    taxes=total_deductions,
                    federal_tax=income_tax,
                    state_tax=0,  # Would need more complex calculation
                    state_code=employee_state,
                    medicare_tax=medicare,
                    social_security_tax=social_security
                )

            # For US full-service, create tax filings
            if country_code == 'US' and service_type == 'full':
                # Import here to avoid circular dependency
                from taxes import services as tax_services
                tax_services.TaxFilingService.create_tax_filings_for_payroll(
                    payroll_run, 
                    str(request.user.business_id)
                )
                payroll_run.tax_filings_created = True
            
            # Update payroll run status
            payroll_run.status = 'completed'
            payroll_run.save()

            # Serialize and return
            serializer = PayrollRunSerializer(payroll_run)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f'Error running payroll: {str(e)}')
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PayrollRunsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Get tenant from user profile
        tenant = request.user.profile.tenant if hasattr(request.user, 'profile') else None
        if not tenant:
            return Response({'error': 'User not associated with a tenant'}, status=status.HTTP_400_BAD_REQUEST)
            
        payroll_runs = PayrollRun.objects.filter(tenant=tenant).order_by('-run_date')
        serializer = PayrollRunSerializer(payroll_runs, many=True)
        return Response(serializer.data)

class PayrollTransactionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, run_id):
        transactions = PayrollTransaction.objects.filter(payroll_run_id=run_id)
        serializer = PayrollTransactionSerializer(transactions, many=True)
        return Response(serializer.data)

class PayrollCalculationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        accounting_period = request.data.get('accounting_period')
        account_id = request.data.get('account_id')

        try:
            account = BankAccount.objects.get(id=account_id, plaid_item__user=request.user)
        except BankAccount.DoesNotExist:
            return Response({'error': 'Invalid account'}, status=status.HTTP_400_BAD_REQUEST)

        if accounting_period:
            year, month = map(int, accounting_period.split('-'))
            timesheets = Timesheet.objects.filter(
                employee__company=request.user.company,
                start_date__year=year,
                start_date__month=month
            )
        else:
            timesheets = Timesheet.objects.filter(
                employee__company=request.user.company,
                start_date__gte=start_date,
                end_date__lte=end_date
            )

        total_payroll = timesheets.aggregate(
            total=Sum(F('total_hours') * F('employee__hourly_rate'))
        )['total'] or 0

        return Response({
            'total_payroll': total_payroll,
            'account_name': account.name,
            'account_balance': account.current_balance,
            'period': accounting_period or f"{start_date} to {end_date}"
        })


class PayStubView(APIView):
    """Employee pay stubs/statements view"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get pay stubs for the current user's employee"""
        try:
            # Find the employee record for this user
            from hr.models import Employee
            employee = Employee.objects.filter(user=request.user).first()
            
            if not employee:
                return Response({
                    'success': False,
                    'message': 'No employee record found for this user'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Get all pay statements for this employee
            pay_statements = PayStatement.objects.filter(
                employee=employee
            ).order_by('-pay_date')
            
            # Serialize the pay statements
            pay_stubs_data = []
            for statement in pay_statements:
                pay_stub = {
                    'id': str(statement.id),
                    'statement_type': statement.get_statement_type_display(),
                    'pay_period_start': statement.pay_period_start,
                    'pay_period_end': statement.pay_period_end,
                    'pay_date': statement.pay_date,
                    'gross_pay': float(statement.gross_pay),
                    'net_pay': float(statement.net_pay),
                    'regular_hours': float(statement.regular_hours),
                    'overtime_hours': float(statement.overtime_hours),
                    'pto_hours': float(statement.pto_hours),
                    'sick_hours': float(statement.sick_hours),
                    'holiday_hours': float(statement.holiday_hours),
                    'federal_tax': float(statement.federal_tax),
                    'state_tax': float(statement.state_tax),
                    'medicare': float(statement.medicare),
                    'social_security': float(statement.social_security),
                    'health_insurance': float(statement.health_insurance),
                    'dental_insurance': float(statement.dental_insurance),
                    'vision_insurance': float(statement.vision_insurance),
                    'retirement_401k': float(statement.retirement_401k),
                    'other_deductions': float(statement.other_deductions),
                    'ytd_gross': float(statement.ytd_gross),
                    'ytd_net': float(statement.ytd_net),
                    'ytd_federal_tax': float(statement.ytd_federal_tax),
                    'ytd_state_tax': float(statement.ytd_state_tax),
                    'ytd_medicare': float(statement.ytd_medicare),
                    'ytd_social_security': float(statement.ytd_social_security),
                    'notes': statement.notes,
                    'pdf_url': statement.pdf_file.url if statement.pdf_file else None,
                    'created_at': statement.created_at
                }
                pay_stubs_data.append(pay_stub)
            
            return Response({
                'success': True,
                'data': pay_stubs_data,
                'employee_name': employee.full_name,
                'count': len(pay_stubs_data)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error fetching pay stubs: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PayStubDownloadView(APIView):
    """Download individual pay stub PDF"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, pk):
        """Download a specific pay stub PDF"""
        try:
            # Find the employee record for this user
            from hr.models import Employee
            employee = Employee.objects.filter(user=request.user).first()
            
            if not employee:
                return Response({
                    'success': False,
                    'message': 'No employee record found for this user'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Get the pay statement
            pay_statement = PayStatement.objects.get(
                id=pk,
                employee=employee
            )
            
            # If no PDF exists, generate one
            if not pay_statement.pdf_file:
                from .services import generate_pay_stub_pdf
                pdf_file = generate_pay_stub_pdf(pay_statement)
                pay_statement.pdf_file = pdf_file
                pay_statement.save()
            
            # Return the PDF file
            from django.http import HttpResponse
            response = HttpResponse(
                pay_statement.pdf_file,
                content_type='application/pdf'
            )
            response['Content-Disposition'] = f'attachment; filename="paystub_{pay_statement.pay_date}.pdf"'
            return response
            
        except PayStatement.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Pay stub not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error downloading pay stub: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PayrollSettingsView(APIView):
    """Manage company-wide payroll settings"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get payroll settings for the current business"""
        try:
            business_id = get_business_id_from_request(request)
            
            # Get or create payroll settings
            settings, created = PaySetting.objects.get_or_create(
                business_id=business_id,
                defaults={
                    'pay_frequency': 'BIWEEKLY',
                    'pay_weekday': 5,  # Friday
                    'enable_direct_deposit': True,
                    'enable_bonuses': True,
                    'enable_overtime': True,
                    'overtime_rate': 1.5
                }
            )
            
            serializer = PaySettingSerializer(settings)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error fetching payroll settings: {str(e)}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """Update payroll settings for the current business"""
        try:
            business_id = get_business_id_from_request(request)
            
            # Get or create payroll settings
            settings, created = PaySetting.objects.get_or_create(
                business_id=business_id
            )
            
            # Update settings with request data
            serializer = PaySettingSerializer(settings, data=request.data, partial=True)
            
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error updating payroll settings: {str(e)}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DepositMethodListCreateView(APIView):
    """List and create payment deposit methods for employees"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get deposit methods for an employee"""
        try:
            employee_id = request.query_params.get('employee')
            
            if employee_id:
                deposit_methods = PaymentDepositMethod.objects.filter(
                    employee_id=employee_id,
                    business_id=get_business_id_from_request(request)
                )
            else:
                # Get all deposit methods for the business
                deposit_methods = PaymentDepositMethod.objects.filter(
                    business_id=get_business_id_from_request(request)
                )
            
            serializer = PaymentDepositMethodSerializer(deposit_methods, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error fetching deposit methods: {str(e)}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """Create a new deposit method"""
        try:
            business_id = get_business_id_from_request(request)
            data = request.data.copy()
            data['business_id'] = business_id
            
            serializer = PaymentDepositMethodSerializer(data=data)
            
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error creating deposit method: {str(e)}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DepositMethodDetailView(APIView):
    """Retrieve, update, or delete a deposit method"""
    permission_classes = [IsAuthenticated]
    
    def get_object(self, pk, business_id):
        try:
            return PaymentDepositMethod.objects.get(pk=pk, business_id=business_id)
        except PaymentDepositMethod.DoesNotExist:
            return None
    
    def get(self, request, pk):
        """Get a specific deposit method"""
        deposit_method = self.get_object(pk, get_business_id_from_request(request))
        if not deposit_method:
            return Response({'error': 'Deposit method not found'}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = PaymentDepositMethodSerializer(deposit_method)
        return Response(serializer.data)
    
    def patch(self, request, pk):
        """Update a deposit method"""
        deposit_method = self.get_object(pk, get_business_id_from_request(request))
        if not deposit_method:
            return Response({'error': 'Deposit method not found'}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = PaymentDepositMethodSerializer(deposit_method, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, pk):
        """Delete a deposit method"""
        deposit_method = self.get_object(pk, get_business_id_from_request(request))
        if not deposit_method:
            return Response({'error': 'Deposit method not found'}, status=status.HTTP_404_NOT_FOUND)
        
        deposit_method.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class WithholdingListCreateView(APIView):
    """List and create tax withholding preferences"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get withholding info for an employee"""
        try:
            employee_id = request.query_params.get('employee')
            
            if employee_id:
                withholding = IncomeWithholding.objects.filter(
                    employee_id=employee_id,
                    business_id=get_business_id_from_request(request)
                ).first()
                
                if withholding:
                    serializer = IncomeWithholdingSerializer(withholding)
                    return Response(serializer.data, status=status.HTTP_200_OK)
                else:
                    return Response(None, status=status.HTTP_200_OK)
            else:
                # Get all withholdings for the business
                withholdings = IncomeWithholding.objects.filter(
                    business_id=get_business_id_from_request(request)
                )
                serializer = IncomeWithholdingSerializer(withholdings, many=True)
                return Response(serializer.data, status=status.HTTP_200_OK)
                
        except Exception as e:
            logger.error(f"Error fetching withholdings: {str(e)}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """Create new withholding info"""
        try:
            business_id = get_business_id_from_request(request)
            data = request.data.copy()
            data['business_id'] = business_id
            
            serializer = IncomeWithholdingSerializer(data=data)
            
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error creating withholding: {str(e)}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class WithholdingDetailView(APIView):
    """Retrieve, update, or delete withholding info"""
    permission_classes = [IsAuthenticated]
    
    def get_object(self, pk, business_id):
        try:
            return IncomeWithholding.objects.get(pk=pk, business_id=business_id)
        except IncomeWithholding.DoesNotExist:
            return None
    
    def get(self, request, pk):
        """Get specific withholding info"""
        withholding = self.get_object(pk, get_business_id_from_request(request))
        if not withholding:
            return Response({'error': 'Withholding not found'}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = IncomeWithholdingSerializer(withholding)
        return Response(serializer.data)
    
    def patch(self, request, pk):
        """Update withholding info"""
        withholding = self.get_object(pk, get_business_id_from_request(request))
        if not withholding:
            return Response({'error': 'Withholding not found'}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = IncomeWithholdingSerializer(withholding, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, pk):
        """Delete withholding info"""
        withholding = self.get_object(pk, get_business_id_from_request(request))
        if not withholding:
            return Response({'error': 'Withholding not found'}, status=status.HTTP_404_NOT_FOUND)
        
        withholding.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class BonusListCreateView(APIView):
    """List and create bonus payments"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get bonuses for an employee"""
        try:
            employee_id = request.query_params.get('employee')
            
            if employee_id:
                bonuses = BonusPayment.objects.filter(
                    employee_id=employee_id,
                    business_id=get_business_id_from_request(request)
                ).order_by('-created_at')
            else:
                # Get all bonuses for the business
                bonuses = BonusPayment.objects.filter(
                    business_id=get_business_id_from_request(request)
                ).order_by('-created_at')
            
            serializer = BonusPaymentSerializer(bonuses, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error fetching bonuses: {str(e)}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """Create a new bonus"""
        try:
            business_id = get_business_id_from_request(request)
            data = request.data.copy()
            data['business_id'] = business_id
            
            serializer = BonusPaymentSerializer(data=data)
            
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error creating bonus: {str(e)}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BonusDetailView(APIView):
    """Retrieve, update, or delete a bonus"""
    permission_classes = [IsAuthenticated]
    
    def get_object(self, pk, business_id):
        try:
            return BonusPayment.objects.get(pk=pk, business_id=business_id)
        except BonusPayment.DoesNotExist:
            return None
    
    def get(self, request, pk):
        """Get a specific bonus"""
        bonus = self.get_object(pk, get_business_id_from_request(request))
        if not bonus:
            return Response({'error': 'Bonus not found'}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = BonusPaymentSerializer(bonus)
        return Response(serializer.data)
    
    def patch(self, request, pk):
        """Update a bonus"""
        bonus = self.get_object(pk, get_business_id_from_request(request))
        if not bonus:
            return Response({'error': 'Bonus not found'}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = BonusPaymentSerializer(bonus, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, pk):
        """Delete a bonus"""
        bonus = self.get_object(pk, get_business_id_from_request(request))
        if not bonus:
            return Response({'error': 'Bonus not found'}, status=status.HTTP_404_NOT_FOUND)
        
        bonus.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DeductionListCreateView(APIView):
    """Placeholder for deductions - implement based on your deduction model"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        return Response([], status=status.HTTP_200_OK)
    
    def post(self, request):
        return Response({'message': 'Deductions not yet implemented'}, status=status.HTTP_501_NOT_IMPLEMENTED)


class DeductionDetailView(APIView):
    """Placeholder for deduction details"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, pk):
        return Response({'message': 'Deductions not yet implemented'}, status=status.HTTP_501_NOT_IMPLEMENTED)


class PayStatementListView(APIView):
    """List pay statements for employees"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get pay statements"""
        try:
            employee_id = request.query_params.get('employee')
            
            if employee_id:
                statements = PayStatement.objects.filter(
                    employee_id=employee_id,
                    business_id=get_business_id_from_request(request)
                ).order_by('-pay_date')
            else:
                # Get all statements for the business
                statements = PayStatement.objects.filter(
                    business_id=get_business_id_from_request(request)
                ).order_by('-pay_date')
            
            serializer = PayStatementSerializer(statements, many=True)
            return Response({
                'success': True,
                'data': serializer.data,
                'count': len(serializer.data)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error fetching pay statements: {str(e)}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PayStatementDetailView(APIView):
    """Get a specific pay statement"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, pk):
        """Get pay statement details"""
        try:
            statement = PayStatement.objects.get(
                pk=pk,
                business_id=get_business_id_from_request(request)
            )
            
            serializer = PayStatementSerializer(statement)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except PayStatement.DoesNotExist:
            return Response({
                'error': 'Pay statement not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error fetching pay statement: {str(e)}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PayrollStatsView(APIView):
    """Get payroll statistics for the business"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get payroll stats"""
        try:
            business_id = get_business_id_from_request(request)
            
            # Get employee counts
            total_employees = Employee.objects.filter(business_id=business_id).count()
            
            # Get deposit method setup count
            employees_with_deposit = PaymentDepositMethod.objects.filter(
                business_id=business_id,
                is_active=True
            ).values('employee').distinct().count()
            
            # Get withholding setup count
            employees_with_withholding = IncomeWithholding.objects.filter(
                business_id=business_id
            ).count()
            
            # Get next pay date based on settings
            settings = PaySetting.objects.filter(business_id=business_id).first()
            next_pay_date = None
            
            if settings:
                from datetime import date, timedelta
                today = date.today()
                
                if settings.pay_frequency == 'WEEKLY':
                    days_until_payday = (settings.pay_weekday - today.weekday()) % 7
                    if days_until_payday == 0:
                        days_until_payday = 7
                    next_pay_date = today + timedelta(days=days_until_payday)
                elif settings.pay_frequency == 'BIWEEKLY':
                    # This is simplified - you'd need a reference date
                    days_until_payday = (settings.pay_weekday - today.weekday()) % 7
                    if days_until_payday == 0:
                        days_until_payday = 14
                    next_pay_date = today + timedelta(days=days_until_payday)
            
            return Response({
                'totalActiveEmployees': total_employees,
                'directDepositSetup': employees_with_deposit,
                'withHoldingCompleted': employees_with_withholding,
                'upcomingPayDate': next_pay_date.isoformat() if next_pay_date else None
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error getting payroll stats: {str(e)}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)