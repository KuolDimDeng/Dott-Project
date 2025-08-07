# taxes/views.py
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from ..models import (
    State, IncomeTaxRate, PayrollTaxFiling, TaxFilingInstruction, TaxForm,
    TaxDataEntryControl, TaxDataEntryLog, TaxDataAbuseReport, TaxDataBlacklist,
    TaxSettings, TaxApiUsage
)
from ..serializers import (
    StateSerializer, IncomeTaxRateSerializer, 
    PayrollTaxFilingSerializer, TaxFilingInstructionSerializer,
    TaxFormSerializer, TaxDataEntryControlSerializer,
    TaxDataEntryLogSerializer, TaxDataAbuseReportSerializer,
    TaxDataBlacklistSerializer, TaxSettingsSerializer,
    TaxApiUsageSerializer
)
from django.db import transaction as db_transaction, models
import logging
from django.http import HttpResponse
from django.template.loader import render_to_string
# from weasyprint import HTML  # Removed - not available on Render
import tempfile
from datetime import date
from taxes.services.claude_service import ClaudeComplianceService
from rest_framework.decorators import api_view
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def currency_info(request, country_code):
    """Get currency information for a country"""
    try:
        from taxes.services.currency_service import CurrencyService
        
        # Get currency info
        currency_code, currency_symbol = CurrencyService.get_currency_info(country_code)
        
        # Get exchange rate to USD if necessary
        exchange_rate = 1.0
        if currency_code != 'USD':
            exchange_rate = float(CurrencyService.get_exchange_rate(currency_code))
        
        return Response({
            'code': currency_code,
            'symbol': currency_symbol,
            'exchangeRate': exchange_rate,
        })
    except Exception as e:
        logger.error(f"Error getting currency info: {str(e)}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class StateViewSet(viewsets.ModelViewSet):
    queryset = State.objects.all()
    serializer_class = StateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=True, methods=['get'])
    def tax_rates(self, request, pk=None):
        """Get tax rates for a specific state"""
        state = self.get_object()
        tax_year = request.query_params.get('tax_year', None)
        
        rates = state.tax_rates.all()
        if tax_year:
            rates = rates.filter(tax_year=tax_year)
            
        serializer = IncomeTaxRateSerializer(rates, many=True)
        return Response(serializer.data)

class IncomeTaxRateViewSet(viewsets.ModelViewSet):
    queryset = IncomeTaxRate.objects.all().order_by('-tax_year', 'state__code')
    serializer_class = IncomeTaxRateSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['state', 'tax_year', 'is_flat_rate']
    
    def _check_abuse_control(self, entry_type='create', entry_count=1):
        """Check abuse control before allowing operation"""
        from custom_auth.rls import get_current_tenant_id
        from taxes.services.abuse_control_service import TaxDataAbuseControlService
        
        tenant_id = get_current_tenant_id()
        if not tenant_id:
            return False, "No tenant context"
        
        # Get IP and user agent
        ip_address = self.request.META.get('REMOTE_ADDR', '0.0.0.0')
        user_agent = self.request.META.get('HTTP_USER_AGENT', '')
        
        # Check rate limits
        allowed, error_msg = TaxDataAbuseControlService.check_rate_limit(
            tenant_id, 'income_tax_rates', self.request.user, ip_address, entry_count
        )
        
        # Log the attempt
        TaxDataAbuseControlService.log_entry(
            tenant_id, 'income_tax_rates', entry_type, self.request.user,
            ip_address, user_agent, 'allowed' if allowed else 'rate_limited',
            entry_count
        )
        
        # Check for suspicious activity
        if allowed and TaxDataAbuseControlService.check_suspicious_activity(
            tenant_id, self.request.user, ip_address
        ):
            allowed = False
            error_msg = "Suspicious activity detected"
        
        return allowed, error_msg
    
    def create(self, request, *args, **kwargs):
        """Override create to add abuse control"""
        allowed, error_msg = self._check_abuse_control('create')
        if not allowed:
            return Response(
                {"error": error_msg},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        return super().create(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        """Override update to add abuse control"""
        allowed, error_msg = self._check_abuse_control('update')
        if not allowed:
            return Response(
                {"error": error_msg},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """Override destroy to add abuse control"""
        allowed, error_msg = self._check_abuse_control('delete')
        if not allowed:
            return Response(
                {"error": error_msg},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        """Bulk update tax rates"""
        # Check abuse control for bulk operations
        entry_count = len(request.data) if isinstance(request.data, list) else 1
        allowed, error_msg = self._check_abuse_control('bulk_update', entry_count)
        if not allowed:
            return Response(
                {"error": error_msg},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        try:
            with db_transaction.atomic():
                updated_rates = []
                for rate_data in request.data:
                    rate_id = rate_data.pop('id', None)
                    if rate_id:
                        try:
                            rate = IncomeTaxRate.objects.get(id=rate_id)
                            serializer = self.get_serializer(rate, data=rate_data, partial=True)
                            if serializer.is_valid():
                                serializer.save(manual_override=True)
                                updated_rates.append(serializer.data)
                            else:
                                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                        except IncomeTaxRate.DoesNotExist:
                            return Response({"error": f"Rate with ID {rate_id} not found"}, 
                                          status=status.HTTP_404_NOT_FOUND)
                    else:
                        serializer = self.get_serializer(data=rate_data)
                        if serializer.is_valid():
                            serializer.save(manual_override=True)
                            updated_rates.append(serializer.data)
                        else:
                            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                            
                return Response(updated_rates, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error updating tax rates: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PayrollTaxFilingViewSet(viewsets.ModelViewSet):
    queryset = PayrollTaxFiling.objects.all().order_by('-id')
    serializer_class = PayrollTaxFilingSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['state', 'business_id', 'filing_status', 'submission_method']
    
    @action(detail=True, methods=['post'])
    def submit_filing(self, request, pk=None):
        """Submit a tax filing"""
        filing = self.get_object()
        state = filing.state
        
        # Check if state is supported for full service
        if not state.full_service_enabled and request.data.get('submission_method') != 'self_service':
            return Response(
                {"error": f"State {state.code} is not supported for full service filing"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Process based on submission method
        method = request.data.get('submission_method', filing.submission_method)
        
        try:
            if method == 'api':
                # Implementation for direct API submission
                # This would call a service that handles the API integration
                result = self._submit_via_api(filing, request.data)
            elif method == 'portal':
                # Implementation for portal submission
                # This might be partially automated or require manual steps
                result = self._submit_via_portal(filing, request.data)
            elif method == 'manual':
                # Implementation for manual filing
                # This would generate the necessary forms for manual filing
                result = self._prepare_manual_filing(filing, request.data)
            elif method == 'self_service':
                # Implementation for self-service filing
                # This would prepare documents for the customer to file themselves
                result = self._prepare_self_service(filing, request.data)
            else:
                return Response(
                    {"error": f"Unsupported submission method: {method}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Update filing with results
            serializer = self.get_serializer(filing, data={
                'filing_status': result.get('status', 'pending'),
                'confirmation_number': result.get('confirmation_number'),
                'notes': result.get('notes', ''),
                'submission_method': method
            }, partial=True)
            
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error submitting tax filing: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        """Generate a PDF for the tax filing"""
        filing = self.get_object()
        
        try:
            # Create context for the template
            context = {
                'filing': filing,
                'company_name': request.user.company.name if hasattr(request.user, 'company') else 'Your Company',
                'company_ein': request.user.company.ein if hasattr(request.user, 'company') else '00-0000000',
                'generated_date': date.today().strftime('%B %d, %Y'),
                'state_name': filing.state.name,
            }
            
            # Generate PDF using ReportLab
            from reportlab.lib.pagesizes import letter
            from reportlab.pdfgen import canvas
            from reportlab.lib.styles import getSampleStyleSheet
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
            from reportlab.lib import colors
            from io import BytesIO
            
            buffer = BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=letter)
            story = []
            styles = getSampleStyleSheet()
            
            # Title
            title = Paragraph(f"Tax Filing Report - {filing.state.name}", styles['Title'])
            story.append(title)
            story.append(Spacer(1, 20))
            
            # Company info
            company_info = Paragraph(f"<b>{context['company_name']}</b><br/>"
                                   f"EIN: {context['company_ein']}<br/>"
                                   f"Filing Period: {context['filing_period']}<br/>"
                                   f"Generated: {context['generated_date']}", styles['Normal'])
            story.append(company_info)
            story.append(Spacer(1, 20))
            
            # Filing details
            filing_data = [
                ['State', filing.state.name],
                ['Filing Type', filing.get_filing_type_display()],
                ['Status', filing.get_status_display()],
                ['Total Wages', f"${filing.total_wages:,.2f}"],
                ['Total Withholding', f"${filing.total_withholding:,.2f}"],
                ['Due Date', filing.due_date.strftime('%B %d, %Y')],
            ]
            
            filing_table = Table(filing_data)
            filing_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('PADDING', (0, 0), (-1, -1), 10),
            ]))
            story.append(filing_table)
            
            # Build PDF
            doc.build(story)
            
            # Return PDF response
            buffer.seek(0)
            response = HttpResponse(buffer.read(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="tax_filing_{filing.id}.pdf"'
            return response
                    
        except Exception as e:
            logger.error(f"Error generating PDF: {str(e)}")
            return Response(
                {"error": f"Error generating PDF: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    def _submit_via_api(self, filing, data):
        # Implement API submission logic
        # This would connect to the state's e-filing API
        return {"status": "submitted", "confirmation_number": "API-123456"}
        
    def _submit_via_portal(self, filing, data):
        # Implement portal submission logic
        return {"status": "pending", "notes": "Ready for portal submission"}
        
    def _prepare_manual_filing(self, filing, data):
        # Implement manual filing preparation
        return {"status": "preparation", "notes": "Forms prepared for manual filing"}
        
    def _prepare_self_service(self, filing, data):
        # Implement self-service preparation
        return {"status": "preparation", "notes": "Documents prepared for self-service filing"}

class TaxFilingInstructionViewSet(viewsets.ModelViewSet):
    queryset = TaxFilingInstruction.objects.all()
    serializer_class = TaxFilingInstructionSerializer
    permission_classes = [permissions.IsAuthenticated]

class TaxFormViewSet(viewsets.ModelViewSet):
    queryset = TaxForm.objects.all().order_by('-id')
    serializer_class = TaxFormSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['employee', 'form_type', 'tax_year', 'was_filed', 'is_verified', 'state_code']
    
    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """Mark a tax form as verified"""
        tax_form = self.get_object()
        
        if tax_form.is_verified:
            return Response(
                {"error": "This form has already been verified"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        tax_form.is_verified = True
        tax_form.verified_by = request.user
        tax_form.verification_date = date.today()
        tax_form.save()
        
        serializer = self.get_serializer(tax_form)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def mark_as_filed(self, request, pk=None):
        """Mark a tax form as filed"""
        tax_form = self.get_object()
        
        if tax_form.was_filed:
            return Response(
                {"error": "This form has already been marked as filed"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        confirmation = request.data.get('confirmation_number')
        
        tax_form.was_filed = True
        if confirmation:
            tax_form.filing_confirmation = confirmation
        tax_form.save()
        
        serializer = self.get_serializer(tax_form)
        return Response(serializer.data)
    
    def perform_create(self, serializer):
        """Custom logic when creating a tax form"""
        tax_form = serializer.save()
        
        # Log the creation of a tax form
        logger.info(f"Tax form created: {tax_form.form_type} for employee {tax_form.employee.id}")
        
        return tax_form

class TaxCalculationView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Calculate sales tax rate for a given location"""
        try:
            from ..models import GlobalSalesTaxRate
            
            # Get query parameters - use request.GET for regular Django views
            country = request.GET.get('country', '').strip().upper()
            state = request.GET.get('state', '').strip().upper()
            county = request.GET.get('county', '').strip().upper()
            
            logger.info(f"[Sales Tax Calculation] Request: country={country}, state={state}, county={county}")
            
            # Debug: Log all parameters
            logger.info(f"[Sales Tax] Raw request params: {dict(request.GET)}")
            
            if not country:
                return Response(
                    {"error": "Country is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Try to find the most specific tax rate
            tax_rate = None
            source = 'global'
            
            # Try county level first (most specific)
            if county and state:
                tax_rate = GlobalSalesTaxRate.objects.filter(
                    country=country,
                    region_code=state,
                    locality__iexact=county,
                    is_current=True
                ).first()
                if tax_rate:
                    source = 'county'
                    logger.info(f"[Sales Tax] Found county-level rate: {tax_rate.rate}%")
            
            # Try state level
            if not tax_rate and state:
                tax_rate = GlobalSalesTaxRate.objects.filter(
                    country=country,
                    region_code=state,
                    locality='',
                    is_current=True
                ).first()
                if tax_rate:
                    source = 'state'
                    logger.info(f"[Sales Tax] Found state-level rate: {tax_rate.rate}%")
            
            # Try country level
            if not tax_rate:
                tax_rate = GlobalSalesTaxRate.objects.filter(
                    country=country,
                    region_code='',
                    locality='',
                    is_current=True
                ).first()
                if tax_rate:
                    source = 'country'
                    logger.info(f"[Sales Tax] Found country-level rate: {tax_rate.rate}%")
            
            if tax_rate:
                # Return the tax rate information
                return Response({
                    'tax_rate': float(tax_rate.rate),  # Already stored as decimal (0.18 = 18%)
                    'tax_percentage': float(tax_rate.rate) * 100,  # Convert to percentage for display
                    'source': source,
                    'country': tax_rate.country,
                    'country_name': tax_rate.country_name,
                    'state': tax_rate.region_code if tax_rate.region_code else None,
                    'state_name': tax_rate.region_name if tax_rate.region_name else None,
                    'county': tax_rate.locality if tax_rate.locality else None,
                    'tax_authority': tax_rate.tax_authority_name if hasattr(tax_rate, 'tax_authority_name') else None
                })
            else:
                # No tax rate found
                logger.warning(f"[Sales Tax] No tax rate found for country={country}, state={state}, county={county}")
                return Response({
                    'tax_rate': 0,
                    'tax_percentage': 0,
                    'source': 'not_found',
                    'message': f'No tax rate found for {country}'
                })
                
        except Exception as e:
            logger.error(f"[Sales Tax Calculation] Error: {str(e)}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def post(self, request):
        """Calculate taxes for payroll"""
        try:
            # Extract data from request
            state_code = request.data.get('state')
            tax_year = request.data.get('tax_year')
            filing_status = request.data.get('filing_status', 'single')
            gross_income = request.data.get('gross_income')
            
            if not all([state_code, tax_year, gross_income]):
                return Response(
                    {"error": "Missing required fields: state, tax_year, gross_income"},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            try:
                state = State.objects.get(code=state_code)
            except State.DoesNotExist:
                return Response(
                    {"error": f"State with code {state_code} not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
                
            # Get applicable tax rates
            tax_rates = IncomeTaxRate.objects.filter(
                state=state,
                tax_year=tax_year,
                filing_status=filing_status
            ).order_by('income_min')
            
            if not tax_rates.exists():
                return Response(
                    {"error": f"No tax rates found for {state_code} in {tax_year} for {filing_status}"},
                    status=status.HTTP_404_NOT_FOUND
                )
                
            # Calculate tax
            tax_amount = self._calculate_tax(gross_income, tax_rates)
            
            return Response({
                "state": state_code,
                "tax_year": tax_year,
                "filing_status": filing_status,
                "gross_income": gross_income,
                "tax_amount": tax_amount,
                "effective_rate": (tax_amount / gross_income) if gross_income > 0 else 0
            })
            
        except Exception as e:
            logger.error(f"Error calculating taxes: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    def _calculate_tax(self, income, tax_rates):
        """Calculate tax amount based on income and applicable rates"""
        if tax_rates.first().is_flat_rate:
            # Simple calculation for flat rate
            return income * tax_rates.first().rate_value
        else:
            # Progressive tax calculation
            tax_amount = 0
            remaining_income = income
            
            for rate in tax_rates:
                if rate.income_max is None:
                    # This is the highest bracket
                    taxable_in_bracket = max(0, remaining_income)
                else:
                    taxable_in_bracket = max(0, min(remaining_income, rate.income_max - (rate.income_min or 0)))
                    
                tax_amount += taxable_in_bracket * rate.rate_value
                remaining_income -= taxable_in_bracket
                
                if remaining_income <= 0:
                    break
                    
            return tax_amount

class GlobalComplianceViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=True, methods=['get'], url_path='global-compliance/(?P<country_code>[^/.]+)')
    def global_compliance(self, request, country_code=None):
        """Get global compliance information for a country"""
        try:
            # Get compliance requirements from Claude service
            compliance_data = ClaudeComplianceService.get_country_compliance_requirements(country_code)
            
            if not compliance_data:
                return Response(
                    {"error": f"Could not retrieve compliance information for {country_code}"},
                    status=status.HTTP_404_NOT_FOUND
                )
                
            # Get tax rates from Claude service
            tax_rates_data = ClaudeComplianceService.get_tax_rates(country_code)
            
            # Combine the data
            combined_data = {
                "country": country_code,
                "service_level": compliance_data.get('service_level_recommendation', 'self'),
                "service_level_description": (
                    "Full-service payroll with automatic tax filing" 
                    if compliance_data.get('service_level_recommendation') == 'full' 
                    else "Self-service payroll with guided tax filing instructions"
                ),
                "tax_authorities": compliance_data.get('tax_authorities', []),
                "filing_frequency": compliance_data.get('filing_frequency', 'monthly'),
                "filing_description": "File payroll taxes according to local regulations",
                "special_considerations": compliance_data.get('special_considerations', ''),
                "tax_rates": []
            }
            
            # Add tax rates if available
            if tax_rates_data and tax_rates_data.get('income_tax'):
                for rate in tax_rates_data['income_tax']:
                    combined_data['tax_rates'].append({
                        "type": "Income Tax",
                        "filing_status": rate.get('filing_status', 'single'),
                        "min": rate.get('min'),
                        "max": rate.get('max'),
                        "rate": rate['rate']
                    })
                    
            return Response(combined_data)
            
        except Exception as e:
            logger.error(f"Error fetching global compliance data: {str(e)}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TaxDataEntryControlViewSet(viewsets.ModelViewSet):
    """ViewSet for managing tax data entry controls"""
    queryset = TaxDataEntryControl.objects.all()
    serializer_class = TaxDataEntryControlSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter by tenant"""
        from custom_auth.rls import get_current_tenant_id
        tenant_id = get_current_tenant_id()
        if tenant_id:
            return self.queryset.filter(tenant_id=tenant_id)
        return self.queryset.none()
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get summary of all control settings"""
        controls = self.get_queryset()
        return Response(self.get_serializer(controls, many=True).data)


class TaxDataEntryLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing tax data entry logs"""
    queryset = TaxDataEntryLog.objects.all().order_by('-created_at')
    serializer_class = TaxDataEntryLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter by tenant and optional parameters"""
        from custom_auth.rls import get_current_tenant_id
        tenant_id = get_current_tenant_id()
        if not tenant_id:
            return self.queryset.none()
            
        queryset = self.queryset.filter(tenant_id=tenant_id)
        
        # Filter by control type
        control_type = self.request.query_params.get('control_type')
        if control_type:
            queryset = queryset.filter(control_type=control_type)
        
        # Filter by status
        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)
        
        # Filter by user
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        # Filter by date range
        from_date = self.request.query_params.get('from_date')
        to_date = self.request.query_params.get('to_date')
        if from_date:
            queryset = queryset.filter(created_at__gte=from_date)
        if to_date:
            queryset = queryset.filter(created_at__lte=to_date)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get statistics on tax data entries"""
        from django.db.models import Count, Sum
        queryset = self.get_queryset()
        
        stats = {
            'total_entries': queryset.count(),
            'by_status': list(queryset.values('status').annotate(count=Count('id'))),
            'by_control_type': list(queryset.values('control_type').annotate(
                count=Count('id'),
                total_entries=Sum('entry_count')
            )),
            'by_user': list(queryset.values('user__email').annotate(count=Count('id'))[:10])
        }
        
        return Response(stats)


class TaxDataAbuseReportViewSet(viewsets.ModelViewSet):
    """ViewSet for managing tax data abuse reports"""
    queryset = TaxDataAbuseReport.objects.all().order_by('-created_at')
    serializer_class = TaxDataAbuseReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter by tenant"""
        from custom_auth.rls import get_current_tenant_id
        tenant_id = get_current_tenant_id()
        if tenant_id:
            return self.queryset.filter(tenant_id=tenant_id)
        return self.queryset.none()
    
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Resolve an abuse report"""
        report = self.get_object()
        
        action_taken = request.data.get('action_taken', '')
        resolution_status = request.data.get('status', 'resolved')
        
        report.status = resolution_status
        report.action_taken = action_taken
        report.resolved_at = timezone.now()
        report.resolved_by = request.user
        report.save()
        
        return Response(self.get_serializer(report).data)
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get all pending abuse reports"""
        pending_reports = self.get_queryset().filter(status='pending')
        return Response(self.get_serializer(pending_reports, many=True).data)


class TaxDataBlacklistViewSet(viewsets.ModelViewSet):
    """ViewSet for managing tax data blacklist"""
    queryset = TaxDataBlacklist.objects.all().order_by('-created_at')
    serializer_class = TaxDataBlacklistSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter by active status"""
        queryset = super().get_queryset()
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Filter by blacklist type
        blacklist_type = self.request.query_params.get('blacklist_type')
        if blacklist_type:
            queryset = queryset.filter(blacklist_type=blacklist_type)
        
        return queryset
    
    def create(self, request):
        """Create a new blacklist entry with current user as creator"""
        data = request.data.copy()
        data['created_by'] = request.user.id
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate a blacklist entry"""
        blacklist_entry = self.get_object()
        blacklist_entry.is_active = False
        blacklist_entry.save()
        
        return Response(self.get_serializer(blacklist_entry).data)
    
    @action(detail=False, methods=['post'])
    def check(self, request):
        """Check if an identifier is blacklisted"""
        identifier = request.data.get('identifier')
        blacklist_type = request.data.get('blacklist_type')
        
        if not identifier or not blacklist_type:
            return Response(
                {"error": "Both identifier and blacklist_type are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        is_blacklisted = self.queryset.filter(
            blacklist_type=blacklist_type,
            identifier=identifier,
            is_active=True
        ).filter(
            models.Q(expires_at__isnull=True) | models.Q(expires_at__gt=timezone.now())
        ).exists()
        
        return Response({"is_blacklisted": is_blacklisted})


class TaxSettingsViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing tenant tax settings.
    Provides CRUD operations for tax configuration.
    """
    queryset = TaxSettings.objects.all()
    serializer_class = TaxSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter by tenant from query params"""
        queryset = super().get_queryset()
        tenant_id = self.request.query_params.get('tenant_id')
        if tenant_id:
            queryset = queryset.filter(tenant_id=tenant_id)
        return queryset
    
    def list(self, request):
        """Get tax settings for a tenant"""
        tenant_id = request.query_params.get('tenant_id')
        if not tenant_id:
            return Response(
                {"error": "tenant_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Try to get existing settings
            tax_settings = self.get_queryset().filter(tenant_id=tenant_id).first()
            if tax_settings:
                serializer = self.get_serializer(tax_settings)
                return Response(serializer.data)
            else:
                # No settings found
                return Response(
                    {"message": "No tax settings found for this tenant"},
                    status=status.HTTP_404_NOT_FOUND
                )
        except Exception as e:
            logger.error(f"Error fetching tax settings: {str(e)}")
            return Response(
                {"error": "Failed to fetch tax settings"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def create(self, request):
        """Create or update tax settings for a tenant"""
        tenant_id = request.data.get('tenant_id')
        if not tenant_id:
            return Response(
                {"error": "tenant_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Check if settings already exist
            existing_settings = TaxSettings.objects.filter(tenant_id=tenant_id).first()
            
            if existing_settings:
                # Update existing settings
                serializer = self.get_serializer(existing_settings, data=request.data, partial=True)
            else:
                # Create new settings
                serializer = self.get_serializer(data=request.data)
            
            serializer.is_valid(raise_exception=True)
            serializer.save()
            
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error saving tax settings: {str(e)}")
            return Response(
                {"error": "Failed to save tax settings"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TaxApiUsageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for tracking tax API usage.
    """
    queryset = TaxApiUsage.objects.all()
    serializer_class = TaxApiUsageSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def list(self, request):
        """Get API usage for a tenant for the current month"""
        tenant_id = request.query_params.get('tenant_id')
        if not tenant_id:
            return Response(
                {"error": "tenant_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from datetime import datetime
        current_month = datetime.now().strftime('%Y-%m')
        
        try:
            # Get or create usage record for current month
            usage, created = TaxApiUsage.objects.get_or_create(
                tenant_id=tenant_id,
                month_year=current_month,
                defaults={
                    'monthly_limit': 5,  # Default free plan limit
                    'plan_type': 'free'
                }
            )
            
            # Prepare response data
            from dateutil.relativedelta import relativedelta
            next_month = datetime.now() + relativedelta(months=1)
            resets_at = datetime(next_month.year, next_month.month, 1).isoformat()
            
            return Response({
                'monthly_usage': usage.api_calls_count,
                'monthly_limit': usage.monthly_limit,
                'resets_at': resets_at,
                'plan_type': usage.plan_type,
                'cache_hits': usage.cache_hits_count
            })
            
        except Exception as e:
            logger.error(f"Error fetching API usage: {str(e)}")
            return Response(
                {"error": "Failed to fetch API usage"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )