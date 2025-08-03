"""
Views for Payroll Tax Management
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Q
from django.utils import timezone
from datetime import datetime, date, timedelta
from decimal import Decimal

# from taxes.models import (
#     Form941, Form941ScheduleB, PayrollTaxDeposit,
#     PayrollTaxFilingSchedule, EmployerTaxAccount,
#     Form940, Form940ScheduleA, StateTaxAccount,
#     StatePayrollConfiguration, PayrollTaxFiling
# )
from taxes.models import PayrollTaxFiling
from .serializers import (
    Form941Serializer, Form941ScheduleBSerializer,
    PayrollTaxDepositSerializer, PayrollTaxFilingScheduleSerializer,
    EmployerTaxAccountSerializer, PayrollTaxSummarySerializer,
    Form940Serializer, Form940ScheduleASerializer, StateTaxAccountSerializer,
    Form940ProcessorSerializer, Form940AmendmentSerializer
)
from .form941_processor import Form941Processor
from .form940_processor import Form940Processor
from .irs_integration import IRSIntegration
from payroll.models import PayrollRun, PayrollTransaction


class Form941ViewSet(viewsets.ModelViewSet):
    """ViewSet for Form 941 management"""
    serializer_class = Form941Serializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get forms for current tenant"""
        return Form941.objects.filter(
            tenant_id=self.request.user.tenant_id
        ).order_by('-year', '-quarter')
    
    @action(detail=False, methods=['post'])
    def calculate_quarter(self, request):
        """Calculate Form 941 for a specific quarter"""
        quarter = request.data.get('quarter')
        year = request.data.get('year')
        
        if not quarter or not year:
            return Response(
                {'error': 'Quarter and year are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Initialize processor
            processor = Form941Processor(
                tenant_id=request.user.tenant_id,
                quarter=int(quarter),
                year=int(year)
            )
            
            # Calculate form data
            form_data = processor.calculate_form_941_data()
            
            # Get or create Form 941 record
            form_941, created = Form941.objects.get_or_create(
                tenant_id=request.user.tenant_id,
                quarter=quarter,
                year=year,
                defaults={
                    'period_start': form_data['quarter_start_date'],
                    'period_end': form_data['quarter_end_date'],
                    'due_date': form_data['filing_deadline'],
                    'created_by': request.user.email
                }
            )
            
            # Update with calculated data
            for field, value in form_data.items():
                if hasattr(form_941, field) and field not in ['id', 'tenant_id']:
                    setattr(form_941, field, value)
            
            form_941.status = 'calculated'
            form_941.save()
            
            # Create Schedule B if needed
            if form_data.get('deposit_schedule') == 'semiweekly':
                schedule_b, _ = Form941ScheduleB.objects.get_or_create(
                    form_941=form_941,
                    defaults={
                        'daily_liabilities': form_data.get('schedule_b_data', {}),
                        'month1_total': form_data.get('month1_liability', Decimal('0')),
                        'month2_total': form_data.get('month2_liability', Decimal('0')),
                        'month3_total': form_data.get('month3_liability', Decimal('0')),
                        'quarter_total': form_data.get('total_tax_after_adjustments', Decimal('0'))
                    }
                )
            
            serializer = self.get_serializer(form_941)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def submit_to_irs(self, request, pk=None):
        """Submit Form 941 to IRS"""
        form_941 = self.get_object()
        
        if form_941.status not in ['calculated', 'ready']:
            return Response(
                {'error': 'Form must be calculated before submission'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get employer tax account
            employer_account = EmployerTaxAccount.objects.filter(
                tenant_id=request.user.tenant_id
            ).first()
            
            if not employer_account or not employer_account.ein_verified:
                return Response(
                    {'error': 'Employer tax account must be set up before filing'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Prepare form data for submission
            form_data = Form941Serializer(form_941).data
            form_data['ein'] = employer_account.ein
            
            # Get business info from user/tenant
            form_data['name'] = request.user.tenant.business_name
            form_data['address'] = {
                'line1': request.user.tenant.address_line1,
                'line2': request.user.tenant.address_line2,
                'city': request.user.tenant.city,
                'state': request.user.tenant.state,
                'zip': request.user.tenant.zip_code
            }
            
            # Initialize IRS integration
            irs = IRSIntegration(is_production=not request.user.tenant.is_test_mode)
            
            # Submit to IRS
            submission_result = irs.submit_form_941(form_data)
            
            if submission_result['success']:
                # Update form with submission info
                form_941.status = 'submitted'
                form_941.filing_date = timezone.now()
                form_941.submission_id = submission_result['submission_id']
                form_941.irs_tracking_number = submission_result['tracking_number']
                form_941.save()
                
                # Update filing schedule
                PayrollTaxFilingSchedule.objects.filter(
                    tenant_id=request.user.tenant_id,
                    form_type='941',
                    year=form_941.year,
                    quarter=form_941.quarter
                ).update(
                    status='filed',
                    filed_date=timezone.now(),
                    confirmation_number=submission_result['tracking_number']
                )
                
                return Response({
                    'success': True,
                    'message': 'Form 941 submitted successfully',
                    'submission_id': submission_result['submission_id'],
                    'tracking_number': submission_result['tracking_number']
                })
            else:
                return Response({
                    'success': False,
                    'errors': submission_result['errors']
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def check_status(self, request, pk=None):
        """Check IRS submission status"""
        form_941 = self.get_object()
        
        if not form_941.submission_id:
            return Response(
                {'error': 'Form has not been submitted'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            irs = IRSIntegration(is_production=not request.user.tenant.is_test_mode)
            status_result = irs.check_submission_status(form_941.submission_id)
            
            # Update form if accepted
            if status_result['status'] == 'ACCEPTED':
                form_941.status = 'accepted'
                form_941.acknowledgment_number = status_result['acknowledgment_number']
                form_941.acknowledgment_date = timezone.now()
                form_941.save()
            elif status_result['status'] == 'REJECTED':
                form_941.status = 'rejected'
                form_941.validation_errors = status_result.get('errors', [])
                form_941.save()
            
            return Response(status_result)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def generate_pdf(self, request, pk=None):
        """Generate PDF version of Form 941"""
        form_941 = self.get_object()
        
        # TODO: Implement PDF generation
        # This would use a library like ReportLab to generate the official form
        
        return Response({
            'message': 'PDF generation not yet implemented'
        }, status=status.HTTP_501_NOT_IMPLEMENTED)


class PayrollTaxDepositViewSet(viewsets.ModelViewSet):
    """ViewSet for managing payroll tax deposits"""
    serializer_class = PayrollTaxDepositSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get deposits for current tenant"""
        queryset = PayrollTaxDeposit.objects.filter(
            tenant_id=self.request.user.tenant_id
        ).order_by('-deposit_date')
        
        # Filter by status if provided
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date and end_date:
            queryset = queryset.filter(
                deposit_date__gte=start_date,
                deposit_date__lte=end_date
            )
        
        return queryset
    
    @action(detail=False, methods=['post'])
    def create_from_payroll(self, request):
        """Create tax deposits from payroll run"""
        payroll_run_id = request.data.get('payroll_run_id')
        
        if not payroll_run_id:
            return Response(
                {'error': 'Payroll run ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get payroll run
            payroll_run = PayrollRun.objects.get(
                id=payroll_run_id,
                tenant_id=request.user.tenant_id
            )
            
            # Calculate tax totals
            tax_totals = PayrollTransaction.objects.filter(
                payroll_run=payroll_run
            ).aggregate(
                federal_tax=Sum('federal_tax'),
                social_security_tax=Sum('social_security_tax'),
                medicare_tax=Sum('medicare_tax')
            )
            
            # Get employer account for deposit schedule
            employer_account = EmployerTaxAccount.objects.filter(
                tenant_id=request.user.tenant_id
            ).first()
            
            deposit_schedule = employer_account.federal_deposit_schedule if employer_account else 'monthly'
            
            # Calculate due date based on schedule
            if deposit_schedule == 'semiweekly':
                # Semiweekly logic
                weekday = payroll_run.pay_date.weekday()
                if weekday in [2, 3, 4]:  # Wed, Thu, Fri
                    days_ahead = 2 - weekday + 7  # Next Wednesday
                else:  # Sat, Sun, Mon, Tue
                    days_ahead = 4 - weekday  # Next Friday
                if days_ahead <= 0:
                    days_ahead += 7
                due_date = payroll_run.pay_date + timedelta(days=days_ahead)
            else:
                # Monthly - due 15th of following month
                if payroll_run.pay_date.month == 12:
                    due_date = date(payroll_run.pay_date.year + 1, 1, 15)
                else:
                    due_date = date(payroll_run.pay_date.year, payroll_run.pay_date.month + 1, 15)
            
            # Create deposit record
            deposit = PayrollTaxDeposit.objects.create(
                tenant_id=request.user.tenant_id,
                payroll_run_id=str(payroll_run.id),
                pay_date=payroll_run.pay_date,
                deposit_date=due_date,  # Initially scheduled for due date
                due_date=due_date,
                federal_income_tax=tax_totals['federal_tax'] or Decimal('0'),
                social_security_tax=(tax_totals['social_security_tax'] or Decimal('0')) * 2,  # Employer + employee
                medicare_tax=(tax_totals['medicare_tax'] or Decimal('0')) * 2,  # Employer + employee
                total_deposit=Decimal('0'),  # Will be calculated
                status='scheduled'
            )
            
            # Calculate total
            deposit.total_deposit = (
                deposit.federal_income_tax +
                deposit.social_security_tax +
                deposit.medicare_tax
            )
            deposit.save()
            
            serializer = self.get_serializer(deposit)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except PayrollRun.DoesNotExist:
            return Response(
                {'error': 'Payroll run not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def process_payment(self, request, pk=None):
        """Process tax deposit payment"""
        deposit = self.get_object()
        
        if deposit.status == 'completed':
            return Response(
                {'error': 'Deposit has already been processed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # TODO: Integrate with EFTPS or payment processor
        # For now, just mark as completed
        
        deposit.status = 'completed'
        deposit.deposit_date = timezone.now().date()
        deposit.payment_method = request.data.get('payment_method', 'eftps')
        deposit.confirmation_number = f"EFTPS-{timezone.now().strftime('%Y%m%d%H%M%S')}"
        deposit.save()
        
        serializer = self.get_serializer(deposit)
        return Response(serializer.data)


class PayrollTaxFilingScheduleViewSet(viewsets.ModelViewSet):
    """ViewSet for managing payroll tax filing schedules"""
    serializer_class = PayrollTaxFilingScheduleSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get filing schedules for current tenant"""
        queryset = PayrollTaxFilingSchedule.objects.filter(
            tenant_id=self.request.user.tenant_id
        ).order_by('filing_deadline')
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by form type
        form_type = self.request.query_params.get('form_type')
        if form_type:
            queryset = queryset.filter(form_type=form_type)
        
        # Filter by year
        year = self.request.query_params.get('year')
        if year:
            queryset = queryset.filter(year=year)
        
        return queryset
    
    @action(detail=False, methods=['post'])
    def initialize_year(self, request):
        """Initialize filing schedule for a year"""
        year = request.data.get('year')
        
        if not year:
            return Response(
                {'error': 'Year is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            created_schedules = []
            
            # Create quarterly 941 schedules
            for quarter in range(1, 5):
                quarter_dates = {
                    1: ((1, 1), (3, 31), (4, 30)),
                    2: ((4, 1), (6, 30), (7, 31)),
                    3: ((7, 1), (9, 30), (10, 31)),
                    4: ((10, 1), (12, 31), (1, 31))
                }
                
                start_month, start_day = quarter_dates[quarter][0]
                end_month, end_day = quarter_dates[quarter][1]
                due_month, due_day = quarter_dates[quarter][2]
                
                period_start = date(year, start_month, start_day)
                period_end = date(year, end_month, end_day)
                filing_deadline = date(
                    year + 1 if quarter == 4 else year,
                    due_month,
                    due_day
                )
                
                schedule, created = PayrollTaxFilingSchedule.objects.get_or_create(
                    tenant_id=request.user.tenant_id,
                    form_type='941',
                    year=year,
                    quarter=quarter,
                    defaults={
                        'period_start': period_start,
                        'period_end': period_end,
                        'filing_deadline': filing_deadline,
                        'status': 'upcoming'
                    }
                )
                
                if created:
                    created_schedules.append(schedule)
            
            # Create annual schedules
            annual_forms = [
                ('940', date(year + 1, 1, 31)),  # Form 940
                ('W2', date(year + 1, 1, 31)),   # W-2s
            ]
            
            for form_type, deadline in annual_forms:
                schedule, created = PayrollTaxFilingSchedule.objects.get_or_create(
                    tenant_id=request.user.tenant_id,
                    form_type=form_type,
                    year=year,
                    quarter=None,
                    defaults={
                        'period_start': date(year, 1, 1),
                        'period_end': date(year, 12, 31),
                        'filing_deadline': deadline,
                        'status': 'upcoming'
                    }
                )
                
                if created:
                    created_schedules.append(schedule)
            
            serializer = self.get_serializer(created_schedules, many=True)
            return Response({
                'created': len(created_schedules),
                'schedules': serializer.data
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def upcoming_deadlines(self, request):
        """Get upcoming filing deadlines"""
        days_ahead = int(request.query_params.get('days', 90))
        
        cutoff_date = timezone.now().date() + timedelta(days=days_ahead)
        
        schedules = self.get_queryset().filter(
            filing_deadline__lte=cutoff_date,
            status__in=['upcoming', 'in_progress']
        ).order_by('filing_deadline')
        
        serializer = self.get_serializer(schedules, many=True)
        return Response(serializer.data)


class EmployerTaxAccountViewSet(viewsets.ModelViewSet):
    """ViewSet for managing employer tax accounts"""
    serializer_class = EmployerTaxAccountSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get tax account for current tenant"""
        return EmployerTaxAccount.objects.filter(
            tenant_id=self.request.user.tenant_id
        )
    
    def create(self, request, *args, **kwargs):
        """Create or update employer tax account"""
        # Check if account already exists
        existing = EmployerTaxAccount.objects.filter(
            tenant_id=request.user.tenant_id
        ).first()
        
        if existing:
            # Update existing
            serializer = self.get_serializer(existing, data=request.data, partial=True)
        else:
            # Create new
            serializer = self.get_serializer(data=request.data)
        
        serializer.is_valid(raise_exception=True)
        serializer.save(tenant_id=request.user.tenant_id)
        
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def verify_ein(self, request):
        """Verify EIN with IRS"""
        ein = request.data.get('ein')
        
        if not ein:
            return Response(
                {'error': 'EIN is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            irs = IRSIntegration()
            validation_result = irs.validate_tin(ein, 'EIN')
            
            if validation_result['valid']:
                # Update account if exists
                account = EmployerTaxAccount.objects.filter(
                    tenant_id=request.user.tenant_id
                ).first()
                
                if account:
                    account.ein = validation_result['tin']
                    account.ein_verified = True
                    account.save()
                
                return Response({
                    'valid': True,
                    'ein': validation_result['tin'],
                    'message': 'EIN verified successfully'
                })
            else:
                return Response({
                    'valid': False,
                    'error': validation_result['error']
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def tax_summary(self, request):
        """Get payroll tax summary dashboard data"""
        try:
            # Get current quarter
            now = timezone.now()
            current_quarter = (now.month - 1) // 3 + 1
            current_year = now.year
            
            # Get YTD data
            ytd_transactions = PayrollTransaction.objects.filter(
                tenant_id=request.user.tenant_id,
                payroll_run__pay_date__year=current_year
            )
            
            ytd_totals = ytd_transactions.aggregate(
                wages=Sum('gross_pay'),
                federal_tax=Sum('federal_tax'),
                social_security_tax=Sum('social_security_tax'),
                medicare_tax=Sum('medicare_tax')
            )
            
            # Get current quarter data
            quarter_start = date(current_year, (current_quarter - 1) * 3 + 1, 1)
            quarter_transactions = ytd_transactions.filter(
                payroll_run__pay_date__gte=quarter_start
            )
            
            quarter_totals = quarter_transactions.aggregate(
                wages=Sum('gross_pay'),
                tax_liability=(
                    Sum('federal_tax') +
                    Sum('social_security_tax') * 2 +  # Employee + employer
                    Sum('medicare_tax') * 2  # Employee + employer
                )
            )
            
            # Get deposits for quarter
            quarter_deposits = PayrollTaxDeposit.objects.filter(
                tenant_id=request.user.tenant_id,
                deposit_date__gte=quarter_start,
                status='completed'
            ).aggregate(
                total=Sum('total_deposit')
            )
            
            # Get upcoming deadlines
            upcoming_deadlines = PayrollTaxFilingSchedule.objects.filter(
                tenant_id=request.user.tenant_id,
                filing_deadline__gte=now.date(),
                filing_deadline__lte=now.date() + timedelta(days=60),
                status__in=['upcoming', 'in_progress']
            ).order_by('filing_deadline')[:5]
            
            # Get recent filings
            recent_filings = Form941.objects.filter(
                tenant_id=request.user.tenant_id,
                status__in=['submitted', 'accepted']
            ).order_by('-filing_date')[:5]
            
            # Check deposit status
            pending_deposits = PayrollTaxDeposit.objects.filter(
                tenant_id=request.user.tenant_id,
                due_date__lt=now.date(),
                status__in=['scheduled', 'pending']
            ).exists()
            
            # Get employer account
            employer_account = EmployerTaxAccount.objects.filter(
                tenant_id=request.user.tenant_id
            ).first()
            
            summary_data = {
                'current_quarter': current_quarter,
                'current_year': current_year,
                
                # Current quarter
                'current_quarter_wages': quarter_totals['wages'] or Decimal('0'),
                'current_quarter_tax_liability': quarter_totals['tax_liability'] or Decimal('0'),
                'current_quarter_deposits': quarter_deposits['total'] or Decimal('0'),
                'current_quarter_balance': (
                    (quarter_totals['tax_liability'] or Decimal('0')) -
                    (quarter_deposits['total'] or Decimal('0'))
                ),
                
                # YTD
                'ytd_wages': ytd_totals['wages'] or Decimal('0'),
                'ytd_federal_tax': ytd_totals['federal_tax'] or Decimal('0'),
                'ytd_social_security': (ytd_totals['social_security_tax'] or Decimal('0')) * 2,
                'ytd_medicare': (ytd_totals['medicare_tax'] or Decimal('0')) * 2,
                'ytd_total_tax': (
                    (ytd_totals['federal_tax'] or Decimal('0')) +
                    (ytd_totals['social_security_tax'] or Decimal('0')) * 2 +
                    (ytd_totals['medicare_tax'] or Decimal('0')) * 2
                ),
                
                # Deadlines
                'upcoming_deadlines': PayrollTaxFilingScheduleSerializer(
                    upcoming_deadlines, many=True
                ).data,
                
                # Recent filings
                'recent_filings': Form941Serializer(
                    recent_filings, many=True
                ).data,
                
                # Compliance
                'deposit_schedule': employer_account.federal_deposit_schedule if employer_account else 'monthly',
                'all_deposits_current': not pending_deposits,
                'all_filings_current': True,  # TODO: Implement proper check
                'has_pending_notices': False  # TODO: Implement notices
            }
            
            serializer = PayrollTaxSummarySerializer(summary_data)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class Form940ViewSet(viewsets.ModelViewSet):
    """ViewSet for Form 940 management"""
    serializer_class = Form940Serializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get forms for current tenant"""
        return Form940.objects.filter(
            tenant_id=self.request.user.tenant_id
        ).order_by("-year")
    
    @action(detail=False, methods=["post"])
    def calculate_year(self, request):
        """Calculate Form 940 for a specific year"""
        serializer = Form940ProcessorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        year = serializer.validated_data["year"]
        calculate_only = serializer.validated_data["calculate_only"]
        save_draft = serializer.validated_data["save_draft"]
        
        try:
            # Check if form already exists
            existing_form = Form940.objects.filter(
                tenant_id=request.user.tenant_id,
                year=year,
                amended_return=False
            ).first()
            
            if existing_form and not calculate_only:
                return Response(
                    {"error": f"Form 940 for {year} already exists"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Calculate form data
            processor = Form940Processor(request.user.tenant_id, year)
            form_data = processor.calculate_form940_data()
            
            # Validate the calculated data
            validation_errors = processor.validate_form940(form_data)
            if validation_errors:
                return Response({
                    "status": "validation_failed",
                    "errors": validation_errors,
                    "form_data": form_data
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # If only calculating, return the data
            if calculate_only:
                return Response({
                    "status": "calculated",
                    "form_data": form_data
                })
            
            # Save as draft if requested
            if save_draft:
                form_data["tenant_id"] = request.user.tenant_id
                form_data["status"] = "draft"
                
                if existing_form:
                    # Update existing draft
                    serializer = self.get_serializer(existing_form, data=form_data, partial=True)
                else:
                    # Create new draft
                    serializer = self.get_serializer(data=form_data)
                
                serializer.is_valid(raise_exception=True)
                form940 = serializer.save()
                
                # Handle Schedule A for multi-state employers
                if form_data.get("is_multi_state") and form_data.get("state_details"):
                    for state_data in form_data["state_details"]:
                        state_data["form_940"] = form940.id
                        state_serializer = Form940ScheduleASerializer(data=state_data)
                        state_serializer.is_valid(raise_exception=True)
                        state_serializer.save()
                
                return Response({
                    "status": "draft_saved",
                    "form": self.get_serializer(form940).data
                })
            
            return Response({
                "status": "calculated",
                "form_data": form_data
            })
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        """Submit Form 940 to IRS"""
        form940 = self.get_object()
        
        if form940.status not in ["draft", "ready"]:
            return Response(
                {"error": "Form must be in draft or ready status to submit"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Validate form before submission
            processor = Form940Processor(form940.tenant_id, form940.year)
            validation_errors = processor.validate_form940(form940.__dict__)
            
            if validation_errors:
                return Response({
                    "status": "validation_failed",
                    "errors": validation_errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # TODO: Implement actual IRS submission
            # For now, mark as filed
            form940.status = "filed"
            form940.filing_date = timezone.now()
            form940.confirmation_number = f"MOCK-940-{form940.year}-{timezone.now().strftime('%Y%m%d%H%M%S')}"
            form940.save()
            
            return Response({
                "status": "submitted",
                "confirmation_number": form940.confirmation_number,
                "form": self.get_serializer(form940).data
            })
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=["post"])
    def amend(self, request):
        """Create amended Form 940"""
        serializer = Form940AmendmentSerializer(
            data=request.data,
            context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        
        original_form_id = serializer.validated_data["original_form_id"]
        reason = serializer.validated_data["reason"]
        changes = serializer.validated_data["changes"]
        
        try:
            # Generate amended return
            processor = Form940Processor(request.user.tenant_id, None)
            amended_data = processor.generate_amended_return(original_form_id, {
                "reason": reason,
                **changes
            })
            
            # Create amended form
            amended_data["tenant_id"] = request.user.tenant_id
            amended_data["status"] = "draft"
            
            form_serializer = self.get_serializer(data=amended_data)
            form_serializer.is_valid(raise_exception=True)
            amended_form = form_serializer.save()
            
            return Response({
                "status": "amended_draft_created",
                "form": self.get_serializer(amended_form).data
            })
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=["get"])
    def pdf(self, request, pk=None):
        """Generate PDF of Form 940"""
        form940 = self.get_object()
        
        try:
            # TODO: Implement PDF generation
            # For now, return a placeholder response
            return Response({
                "status": "not_implemented",
                "message": "PDF generation will be implemented"
            })
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=["get"])
    def futa_summary(self, request):
        """Get FUTA tax summary for the year"""
        year = request.query_params.get("year", timezone.now().year)
        
        try:
            # Get all Form 940s for the year
            forms = Form940.objects.filter(
                tenant_id=request.user.tenant_id,
                year=year
            )
            
            # Calculate totals
            summary = {
                "year": year,
                "total_wages": Decimal("0"),
                "taxable_futa_wages": Decimal("0"),
                "total_futa_tax": Decimal("0"),
                "total_deposits": Decimal("0"),
                "balance_due": Decimal("0"),
                "quarterly_breakdown": {
                    1: {"liability": Decimal("0"), "deposits": Decimal("0")},
                    2: {"liability": Decimal("0"), "deposits": Decimal("0")},
                    3: {"liability": Decimal("0"), "deposits": Decimal("0")},
                    4: {"liability": Decimal("0"), "deposits": Decimal("0")},
                },
                "forms": []
            }
            
            for form in forms:
                if form.status in ["filed", "accepted"]:
                    summary["total_wages"] += form.total_payments
                    summary["taxable_futa_wages"] += form.total_taxable_futa_wages
                    summary["total_futa_tax"] += form.total_futa_tax
                    summary["total_deposits"] += form.total_deposits
                    summary["balance_due"] += form.balance_due
                    
                    summary["quarterly_breakdown"][1]["liability"] += form.first_quarter_liability
                    summary["quarterly_breakdown"][2]["liability"] += form.second_quarter_liability
                    summary["quarterly_breakdown"][3]["liability"] += form.third_quarter_liability
                    summary["quarterly_breakdown"][4]["liability"] += form.fourth_quarter_liability
                
                summary["forms"].append({
                    "id": form.id,
                    "status": form.status,
                    "filing_date": form.filing_date,
                    "confirmation_number": form.confirmation_number,
                    "amended": form.amended_return
                })
            
            # Get FUTA deposits for the year
            deposits = PayrollTaxDeposit.objects.filter(
                tenant_id=request.user.tenant_id,
                tax_type="FUTA",
                deposit_date__year=year,
                status="completed"
            )
            
            for deposit in deposits:
                quarter = (deposit.deposit_date.month - 1) // 3 + 1
                summary["quarterly_breakdown"][quarter]["deposits"] += deposit.amount
            
            return Response(summary)
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class StateTaxAccountViewSet(viewsets.ModelViewSet):
    """ViewSet for managing state tax accounts"""
    serializer_class = StateTaxAccountSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get state tax accounts for current tenant"""
        return StateTaxAccount.objects.filter(
            tenant_id=self.request.user.tenant_id
        ).order_by("state_code")
    
    def create(self, request, *args, **kwargs):
        """Create state tax account"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(tenant_id=request.user.tenant_id)
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=["get"])
    def active_states(self, request):
        """Get list of states with active accounts"""
        accounts = self.get_queryset().filter(is_active=True)
        
        state_list = []
        for account in accounts:
            state_list.append({
                "state_code": account.state_code,
                "employer_number": account.state_employer_number,
                "experience_rate": account.experience_rate,
                "filing_frequency": account.filing_frequency
            })
        
        return Response(state_list)
    
    @action(detail=True, methods=["post"])
    def update_experience_rate(self, request, pk=None):
        """Update state unemployment experience rate"""
        account = self.get_object()
        
        new_rate = request.data.get("experience_rate")
        effective_date = request.data.get("effective_date")
        
        if not new_rate:
            return Response(
                {"error": "Experience rate is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            account.experience_rate = Decimal(str(new_rate))
            if effective_date:
                account.experience_rate_effective_date = effective_date
            account.save()
            
            return Response({
                "status": "updated",
                "state_code": account.state_code,
                "new_rate": account.experience_rate,
                "effective_date": account.experience_rate_effective_date
            })
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class StatePayrollProcessorView(viewsets.ViewSet):
    """ViewSet for state payroll tax processing"""
    permission_classes = [IsAuthenticated]
    
    def create(self, request, payroll_run_id=None):
        """Process state payroll taxes for a payroll run"""
        from .state_payroll_processor import StatePayrollProcessor
        
        try:
            payroll_run = PayrollRun.objects.get(
                id=payroll_run_id,
                tenant_id=request.user.tenant_id
            )
            
            processor = StatePayrollProcessor(request.user.tenant_id)
            results = processor.process_payroll_run(payroll_run)
            
            return Response(results)
            
        except PayrollRun.DoesNotExist:
            return Response(
                {"error": "Payroll run not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def validate_accounts(self, request):
        """Validate state employer accounts"""
        from .state_payroll_processor import StatePayrollProcessor
        
        processor = StatePayrollProcessor(request.user.tenant_id)
        validation_results = processor.validate_employer_accounts()
        
        return Response(validation_results)
    
    @action(detail=False, methods=['post'])
    def generate_forms(self, request):
        """Generate state tax forms for a period"""
        from .state_payroll_processor import StatePayrollProcessor
        
        state_code = request.data.get('state_code')
        period_start = request.data.get('period_start')
        period_end = request.data.get('period_end')
        
        if not all([state_code, period_start, period_end]):
            return Response(
                {"error": "state_code, period_start, and period_end are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            processor = StatePayrollProcessor(request.user.tenant_id)
            results = processor.generate_state_forms(
                state_code,
                datetime.strptime(period_start, '%Y-%m-%d').date(),
                datetime.strptime(period_end, '%Y-%m-%d').date()
            )
            
            return Response(results)
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def submit_filing(self, request, filing_id=None):
        """Submit state tax filing electronically"""
        from .state_payroll_processor import StatePayrollProcessor
        
        processor = StatePayrollProcessor(request.user.tenant_id)
        result = processor.submit_state_filing(filing_id)
        
        if result['success']:
            return Response(result)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)


class StatePayrollConfigViewSet(viewsets.ModelViewSet):
    """ViewSet for state payroll configuration"""
    serializer_class = None  # Will be created in serializers
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get configurations for current tenant"""
        return StatePayrollConfiguration.objects.filter(
            tenant_id=self.request.user.tenant_id
        ).order_by('state_code', '-year')
    
    @action(detail=False, methods=['get'])
    def current_year(self, request):
        """Get current year configurations for all states"""
        current_year = timezone.now().year
        configs = self.get_queryset().filter(year=current_year)
        
        # Would use serializer here
        data = []
        for config in configs:
            data.append({
                'state_code': config.state_code,
                'year': config.year,
                'sui_wage_base': config.sui_wage_base,
                'sui_new_employer_rate': config.sui_new_employer_rate,
                'has_sdi': config.has_sdi,
                'has_fli': config.has_fli
            })
        
        return Response(data)


class StateFilingViewSet(viewsets.ModelViewSet):
    """ViewSet for state payroll tax filings"""
    serializer_class = None  # Will be created in serializers
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get state filings for current tenant"""
        return PayrollTaxFiling.objects.filter(
            tenant_id=self.request.user.tenant_id,
            submission_method__in=['api', 'portal', 'manual']
        ).order_by('-filing_period_end')
    
    @action(detail=False, methods=['get'])
    def by_state(self, request):
        """Get filings grouped by state"""
        state_code = request.query_params.get('state_code')
        year = request.query_params.get('year')
        
        queryset = self.get_queryset()
        
        if state_code:
            queryset = queryset.filter(state__code=state_code)
        if year:
            queryset = queryset.filter(filing_period_start__year=year)
        
        # Group by state
        filings_by_state = {}
        for filing in queryset:
            state = filing.state.code
            if state not in filings_by_state:
                filings_by_state[state] = []
            
            filings_by_state[state].append({
                'id': filing.id,
                'period': f"{filing.filing_period_start} - {filing.filing_period_end}",
                'status': filing.filing_status,
                'total_wages': filing.total_wages,
                'total_withholding': filing.total_withholding
            })
        
        return Response(filings_by_state)


class StateWithholdingView(viewsets.ViewSet):
    """View for calculating state withholding"""
    permission_classes = [IsAuthenticated]
    
    def create(self, request):
        """Calculate state withholding for an employee"""
        from .state_payroll_processor import StatePayrollProcessor
        
        employee_id = request.data.get('employee_id')
        gross_pay = request.data.get('gross_pay')
        pay_date = request.data.get('pay_date')
        state_code = request.data.get('state_code')
        
        if not all([employee_id, gross_pay, pay_date]):
            return Response(
                {"error": "employee_id, gross_pay, and pay_date are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from hr.models import Employee
            employee = Employee.objects.get(
                id=employee_id,
                tenant_id=request.user.tenant_id
            )
            
            # If no state code provided, use employee's work state
            if not state_code:
                state_code = employee.work_state or employee.state
            
            if not state_code:
                return Response(
                    {"error": "State code could not be determined"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            processor = StatePayrollProcessor(request.user.tenant_id)
            
            if state_code in processor.handlers:
                handler = processor.handlers[state_code]
                withholding = handler.calculate_state_withholding(
                    employee,
                    Decimal(str(gross_pay)),
                    datetime.strptime(pay_date, '%Y-%m-%d').date()
                )
                
                # Also calculate employer and employee taxes
                state_account = StateTaxAccount.objects.filter(
                    tenant_id=request.user.tenant_id,
                    state_code=state_code,
                    is_active=True
                ).first()
                
                employer_taxes = handler.calculate_employer_taxes(
                    employee,
                    Decimal(str(gross_pay)),
                    datetime.strptime(pay_date, '%Y-%m-%d').date(),
                    state_account
                )
                
                employee_taxes = handler.calculate_employee_taxes(
                    employee,
                    Decimal(str(gross_pay)),
                    datetime.strptime(pay_date, '%Y-%m-%d').date()
                )
                
                return Response({
                    'state_code': state_code,
                    'gross_pay': gross_pay,
                    'state_withholding': withholding,
                    'employer_taxes': employer_taxes,
                    'employee_taxes': employee_taxes,
                    'total_employee_tax': withholding + employee_taxes.get('total_employee_tax', Decimal('0'))
                })
            else:
                return Response(
                    {"error": f"No handler configured for state {state_code}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
        except Employee.DoesNotExist:
            return Response(
                {"error": "Employee not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
