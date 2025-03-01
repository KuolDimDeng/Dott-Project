# Updated payroll/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import Timesheet, PayrollRun, PayrollTransaction, BankAccount
from .serializers import PayrollRunSerializer, PayrollTransactionSerializer
from datetime import date
from django.db.models import Sum, F
from taxes.services import TaxCalculationService, TaxFilingService

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payroll_report(request, pk):
    """Generate a PDF report for self-service payroll"""
    try:
        payroll_run = get_object_or_404(PayrollRun, pk=pk)
        
        # Check if the payroll run belongs to the requesting business
        if str(payroll_run.business_id) != str(request.user.business_id):
            return Response({"error": "Access denied"}, status=status.HTTP_403_FORBIDDEN)
        
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
        
        if country_code == 'US':
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
            compliance_data = ClaudeComplianceService.get_country_compliance_requirements(country_code)
            
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
        # Render HTML template
        html_string = render_to_string('taxes/self_service_payroll_report.html', context)
        
        # Generate PDF
        with tempfile.NamedTemporaryFile(suffix='.pdf') as output:
            HTML(string=html_string).write_pdf(output.name)
            
            # Read the generated PDF
            with open(output.name, 'rb') as pdf_file:
                response = HttpResponse(pdf_file.read(), content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="payroll-report-{pk}.pdf"'
                return response
        
    except Exception as e:
        logger.error(f"Error generating payroll report: {str(e)}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class RunPayrollView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
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
                # Get compliance info from Claude service
                from taxes.services.claude_service import ClaudeComplianceService
                compliance_data = ClaudeComplianceService.get_country_compliance_requirements(country_code)
                
                if compliance_data:
                    service_type = compliance_data.get('service_level_recommendation', 'self')
                    filing_instructions = compliance_data.get('special_considerations')
                    tax_authority_links = {
                        auth['name']: auth['website'] 
                        for auth in compliance_data.get('tax_authorities', [])
                    }
                else:
                    # Default to self-service for international if no data
                    service_type = 'self'

            try:
                account = BankAccount.objects.get(id=account_id, plaid_item__user=request.user)
            except BankAccount.DoesNotExist:
                return Response({'error': 'Invalid account'}, status=status.HTTP_400_BAD_REQUEST)

            # Update payroll run creation to include currency information
            payroll_run = PayrollRun.objects.create(
                run_date=date.today(),
                start_date=start_date,
                end_date=end_date,
                accounting_period=accounting_period,
                bank_account=account,
                status='processing',
                country_code=country_code,
                is_international=is_international,
                service_type=service_type,
                filing_instructions=filing_instructions,
                tax_authority_links=tax_authority_links,
                tax_filings_status='not_applicable' if service_type == 'self' else 'pending',
                currency_code=currency_code,
                currency_symbol=currency_symbol,
                exchange_rate_to_usd=exchange_rate_to_usd,
                show_usd_comparison=show_usd_comparison
            )
            

            # Filter timesheets by accounting period or date range
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

            for timesheet in timesheets:
                gross_pay = timesheet.total_hours * timesheet.employee.hourly_rate
                
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
                from taxes.services import TaxFilingService
                TaxFilingService.create_tax_filings_for_payroll(
                    payroll_run, 
                    str(request.user.company.id)
                )
                payroll_run.tax_filings_created = True
            
            # Update payroll run status
            payroll_run.status = 'completed'
            payroll_run.save()

            return Response({
                'message': 'Payroll run completed successfully',
                'service_type': service_type,
                'filing_instructions': filing_instructions if service_type == 'self' else None,
                'currency_code': currency_code,
                'currency_symbol': currency_symbol,
                'exchange_rate_to_usd': exchange_rate_to_usd,
                'show_usd_comparison': show_usd_comparison
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class PayrollRunsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        payroll_runs = PayrollRun.objects.all().order_by('-run_date')
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