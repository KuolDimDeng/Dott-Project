# taxes/views.py
from rest_framework import viewsets, status, permissions
from custom_auth.tenant_base_viewset import TenantIsolatedViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import State, IncomeTaxRate, PayrollTaxFiling, TaxFilingInstruction, TaxForm
from .serializers import (
    StateSerializer, IncomeTaxRateSerializer, 
    PayrollTaxFilingSerializer, TaxFilingInstructionSerializer,
    TaxFormSerializer
)
from django.db import transaction as db_transaction
import logging
from django.http import HttpResponse
from django.template.loader import render_to_string
from weasyprint import HTML
import tempfile
from datetime import date
from .services.claude_service import ClaudeComplianceService
from rest_framework.decorators import api_view
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

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

class IncomeTaxRateViewSet(TenantIsolatedViewSet):
    queryset = IncomeTaxRate.objects.all().order_by('-tax_year', 'state__code')
    serializer_class = IncomeTaxRateSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['state', 'tax_year', 'is_flat_rate']
    
    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        """Bulk update tax rates"""
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

class PayrollTaxFilingViewSet(TenantIsolatedViewSet):
    queryset = PayrollTaxFiling.objects.all().order_by('-submission_date')
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
            
            # Render HTML template
            html_string = render_to_string('taxes/tax_filing_pdf.html', context)
            
            # Generate PDF
            with tempfile.NamedTemporaryFile(suffix='.pdf') as output:
                HTML(string=html_string).write_pdf(output.name)
                
                # Read the generated PDF
                with open(output.name, 'rb') as pdf_file:
                    response = HttpResponse(pdf_file.read(), content_type='application/pdf')
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

class TaxFilingInstructionViewSet(TenantIsolatedViewSet):
    queryset = TaxFilingInstruction.objects.all()
    serializer_class = TaxFilingInstructionSerializer
    permission_classes = [permissions.IsAuthenticated]

class TaxFormViewSet(TenantIsolatedViewSet):
    queryset = TaxForm.objects.all().order_by('-submission_date')
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

class GlobalComplianceViewSet(TenantIsolatedViewSet):
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