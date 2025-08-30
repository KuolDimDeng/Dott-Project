"""
Payroll calculation and payment processing service
"""
import stripe
import logging
from decimal import Decimal
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
from django.db import transaction as db_transaction
from users.models import Business
from hr.models import Employee, Timesheet
from banking.models import BankAccount
from .models import PayrollRun, PayrollTransaction, PayStatement
from .stripe_models import PayrollStripePayment, EmployeePayoutRecord, EmployeeStripeAccount
from .tax_calculation_service import PayrollTaxCalculator

logger = logging.getLogger(__name__)
stripe.api_key = settings.STRIPE_SECRET_KEY


class PayrollService:
    def __init__(self, business_id=None):
        self.platform_fee_rate = Decimal('0.024')  # 2.4%
        self.business_id = business_id
    
    def calculate_payroll(self, business, pay_period_start, pay_period_end, tenant_id):
        """
        Step 1: Calculate how much each employee should receive using enhanced tax calculator
        """
        with db_transaction.atomic():
            # Initialize tax calculator for this business
            tax_calculator = PayrollTaxCalculator(tenant_id)
            
            payroll_run = PayrollRun.objects.create(
                tenant_id=tenant_id,
                start_date=pay_period_start,
                end_date=pay_period_end,
                pay_date=pay_period_end + timedelta(days=5),  # Pay 5 days after period ends
                status='draft',
                country_code=business.country or 'US',
                currency_code=business.currency or 'USD',
                currency_symbol=business.currency_symbol or '$'
            )
            
            total_gross = Decimal('0.00')
            total_net = Decimal('0.00')
            total_deductions = Decimal('0.00')
            total_employer_taxes = Decimal('0.00')
            
            # Calculate for each active employee
            active_employees = Employee.objects.filter(
                tenant_id=tenant_id,
                is_active=True
            )
            
            for employee in active_employees:
                # Get hours from timesheet if exists
                timesheet = Timesheet.objects.filter(
                    employee=employee,
                    tenant_id=tenant_id,
                    week_ending__gte=pay_period_start,
                    week_ending__lte=pay_period_end,
                    status='approved'
                ).first()
                
                # Calculate gross pay
                if employee.employment_type == 'salary':
                    # For monthly salary, calculate pro-rated amount
                    days_in_period = (pay_period_end - pay_period_start).days + 1
                    days_in_month = 30  # Simplified
                    gross_pay = (employee.salary / days_in_month) * days_in_period
                else:  # hourly
                    if timesheet:
                        regular_hours = timesheet.regular_hours or Decimal('0')
                        overtime_hours = timesheet.overtime_hours or Decimal('0')
                        gross_pay = (regular_hours * employee.hourly_rate) + \
                                   (overtime_hours * employee.hourly_rate * Decimal('1.5'))
                    else:
                        # Default to 0 if no timesheet
                        gross_pay = Decimal('0.00')
                
                # Skip if no pay due
                if gross_pay <= 0:
                    continue
                
                # Get YTD gross for tax cap calculations
                current_year = pay_period_end.year
                ytd_payments = PayrollTransaction.objects.filter(
                    employee=employee,
                    tenant_id=tenant_id,
                    payroll_run__pay_date__year=current_year,
                    payroll_run__status__in=['completed', 'funded', 'distributing']
                )
                ytd_gross = sum(p.gross_pay for p in ytd_payments)
                
                # Calculate taxes using enhanced calculator
                employee_taxes = tax_calculator.calculate_employee_taxes(gross_pay, ytd_gross)
                employer_taxes = tax_calculator.calculate_employer_taxes(gross_pay, ytd_gross)
                
                total_taxes = employee_taxes['total_employee_taxes']
                net_pay = gross_pay - total_taxes
                
                # Create payment record with detailed tax breakdown
                payment = PayrollTransaction.objects.create(
                    tenant_id=tenant_id,
                    employee=employee,
                    payroll_run=payroll_run,
                    timesheet=timesheet,
                    gross_pay=gross_pay,
                    net_pay=net_pay,
                    taxes=total_taxes,
                    federal_tax=employee_taxes['federal_income_tax'],
                    state_tax=employee_taxes['state_tax'],
                    state_code=business.region or 'CA',  # Use business region
                    medicare_tax=employee_taxes['medicare_tax'],
                    social_security_tax=employee_taxes['social_security_tax'],
                    # Additional tax fields if they exist in model
                    unemployment_tax=employee_taxes.get('unemployment_tax', Decimal('0.00')),
                    other_tax=employee_taxes.get('other_tax', Decimal('0.00'))
                )
                
                # Track totals
                total_gross += gross_pay
                total_net += net_pay
                total_deductions += total_taxes
                total_employer_taxes += employer_taxes['total_employer_taxes']
            
            # Update payroll run totals
            payroll_run.total_amount = total_gross
            payroll_run.save()
            
            # Create Stripe payment record
            stripe_payment = PayrollStripePayment.objects.create(
                tenant_id=tenant_id,
                payroll_run=payroll_run,
                platform_fee_percentage=self.platform_fee_rate
            )
            stripe_payment.calculate_total_with_fee()
            stripe_payment.save()
            
            return payroll_run
    
    def approve_payroll(self, payroll_run_id, approved_by, signature_name, signature_date, 
                       selected_bank_account_id, ip_address=None):
        """
        Step 2: Approve payroll with signature
        """
        try:
            payroll_run = PayrollRun.objects.get(id=payroll_run_id)
            stripe_payment = payroll_run.stripe_payment
            
            # Update approval information
            stripe_payment.approved_by = approved_by
            stripe_payment.approved_at = timezone.now()
            stripe_payment.approval_signature_name = signature_name
            stripe_payment.approval_signature_date = signature_date
            stripe_payment.approval_ip_address = ip_address
            stripe_payment.selected_bank_account_id = selected_bank_account_id
            stripe_payment.save()
            
            # Update payroll status
            payroll_run.status = 'approved'
            payroll_run.bank_account_id = selected_bank_account_id
            payroll_run.save()
            
            return True
            
        except PayrollRun.DoesNotExist:
            logger.error(f"Payroll run {payroll_run_id} not found")
            return False
    
    def collect_payroll_funds(self, payroll_run):
        """
        Step 3: Charge the employer's bank account
        """
        try:
            business = Business.objects.get(id=payroll_run.tenant_id)
            stripe_payment = payroll_run.stripe_payment
            
            if not business.stripe_customer_id or not business.default_bank_token:
                raise ValueError("Business has not set up payroll funding")
            
            # Create payment intent to charge employer
            payment_intent = stripe.PaymentIntent.create(
                amount=int(stripe_payment.funding_amount * 100),  # Convert to cents
                currency='usd',
                customer=business.stripe_customer_id,
                payment_method=business.default_bank_token,
                payment_method_types=['us_bank_account'],
                confirm=True,  # Immediately process
                mandate=business.ach_mandate_id,  # Pre-authorization
                description=f'Payroll for {business.name} - {payroll_run.pay_date}',
                metadata={
                    'payroll_run_id': str(payroll_run.id),
                    'business_id': str(business.id),
                    'employee_count': str(payroll_run.payrolltransaction_set.count()),
                    'platform_fee': str(stripe_payment.platform_fee_amount),
                    'type': 'payroll_funding'
                },
                statement_descriptor='PAYROLL',
            )
            
            # Update payment records
            stripe_payment.funding_payment_intent_id = payment_intent.id
            stripe_payment.funding_status = 'processing'
            stripe_payment.funding_initiated_at = timezone.now()
            stripe_payment.save()
            
            payroll_run.status = 'funding'
            payroll_run.save()
            
            return payment_intent
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error collecting funds: {str(e)}")
            stripe_payment.funding_status = 'failed'
            stripe_payment.error_message = str(e)
            stripe_payment.save()
            
            payroll_run.status = 'failed'
            payroll_run.save()
            
            raise
    
    def distribute_payroll(self, payroll_run):
        """
        Step 4: Pay each employee using appropriate payment provider
        """
        # Verify funds have cleared
        if payroll_run.status != 'funded':
            raise ValueError("Payroll not yet funded")
        
        payroll_run.status = 'distributing'
        payroll_run.save()
        
        stripe_payment = payroll_run.stripe_payment
        stripe_payment.distribution_started_at = timezone.now()
        stripe_payment.save()
        
        # Use universal processor to handle multi-provider payments
        from .universal_processor import UniversalPayrollProcessor
        processor = UniversalPayrollProcessor()
        
        results = processor.process_payroll(payroll_run)
        
        # Create pay statements for successful payments
        for payment in payroll_run.payrolltransaction_set.filter(
            payout_record__payout_status__in=['processing', 'paid']
        ):
            self._create_pay_statement(payment, payroll_run)
        
        # Update payroll run status based on results
        if results['failed'] == 0:
            payroll_run.status = 'completed'
            stripe_payment.distribution_completed_at = timezone.now()
        elif results['successful'] > 0:
            payroll_run.status = 'partially_completed'
        else:
            payroll_run.status = 'failed'
        
        payroll_run.save()
        stripe_payment.save()
        
        return results['successful'], results['failed']
    
    def _create_pay_statement(self, payment, payroll_run):
        """Create pay statement for employee"""
        try:
            # Calculate YTD figures (simplified)
            current_year = payroll_run.pay_date.year
            ytd_payments = PayrollTransaction.objects.filter(
                employee=payment.employee,
                tenant_id=payment.tenant_id,
                payroll_run__pay_date__year=current_year,
                payroll_run__status='completed'
            )
            
            ytd_gross = sum(p.gross_pay for p in ytd_payments) + payment.gross_pay
            ytd_net = sum(p.net_pay for p in ytd_payments) + payment.net_pay
            ytd_federal = sum(p.federal_tax for p in ytd_payments) + payment.federal_tax
            ytd_state = sum(p.state_tax for p in ytd_payments) + payment.state_tax
            ytd_medicare = sum(p.medicare_tax for p in ytd_payments) + payment.medicare_tax
            ytd_ss = sum(p.social_security_tax for p in ytd_payments) + payment.social_security_tax
            
            pay_statement = PayStatement.objects.create(
                tenant_id=payment.tenant_id,
                employee=payment.employee,
                business_id=payroll_run.tenant_id,
                statement_type='REGULAR',
                pay_period_start=payroll_run.start_date,
                pay_period_end=payroll_run.end_date,
                pay_date=payroll_run.pay_date,
                gross_pay=payment.gross_pay,
                net_pay=payment.net_pay,
                federal_tax=payment.federal_tax,
                state_tax=payment.state_tax,
                medicare=payment.medicare_tax,
                social_security=payment.social_security_tax,
                ytd_gross=ytd_gross,
                ytd_net=ytd_net,
                ytd_federal_tax=ytd_federal,
                ytd_state_tax=ytd_state,
                ytd_medicare=ytd_medicare,
                ytd_social_security=ytd_ss,
                payroll_transaction=payment
            )
            
            return pay_statement
            
        except Exception as e:
            logger.error(f"Error creating pay statement: {str(e)}")
            return None