from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import date, datetime
from decimal import Decimal
import logging

from custom_auth.tenant_viewsets import SecureCustomerViewSet
from taxes.models import State, TaxFiling
from taxes.efiling.state_handlers import get_state_handler
from taxes.efiling.sales_tax_calculator import SalesTaxCalculator
from taxes.serializers import StateSerializer, TaxFilingSerializer

logger = logging.getLogger(__name__)


class EFilingViewSet(SecureCustomerViewSet):
    """
    ViewSet for sales tax e-filing operations
    """
    queryset = TaxFiling.objects.filter(tax_type='sales')
    serializer_class = TaxFilingSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def supported_states(self, request):
        """Get list of states with e-filing support"""
        states = State.objects.filter(
            e_file_supported=True,
            is_active=True
        ).order_by('name')
        
        serializer = StateSerializer(states, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def state_requirements(self, request):
        """Get e-filing requirements for a specific state"""
        state_code = request.query_params.get('state_code')
        if not state_code:
            return Response(
                {'error': 'state_code parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        handler = get_state_handler(state_code.upper())
        if not handler:
            return Response(
                {'error': f'No e-filing support for state: {state_code}'},
                status=status.HTTP_404_NOT_FOUND
            )
            
        try:
            state = State.objects.get(code=state_code.upper())
        except State.DoesNotExist:
            return Response(
                {'error': f'State not found: {state_code}'},
                status=status.HTTP_404_NOT_FOUND
            )
            
        # Get form requirements
        form_reqs = handler.get_form_requirements()
        
        # Get filing frequency based on tenant's revenue (example)
        annual_revenue = Decimal(request.query_params.get('annual_revenue', '0'))
        filing_frequency = handler.get_filing_frequency(annual_revenue)
        
        # Calculate next due date
        today = date.today()
        if today.day > 1:
            period_end = today.replace(day=1) - timezone.timedelta(days=1)
        else:
            period_end = (today.replace(day=1) - timezone.timedelta(days=1)).replace(day=1) - timezone.timedelta(days=1)
        due_date = handler.calculate_due_date(period_end)
        
        return Response({
            'state_code': state_code.upper(),
            'state_name': handler.state_name,
            'form_requirements': form_reqs,
            'filing_frequency': filing_frequency,
            'next_due_date': due_date.isoformat(),
            'base_tax_rate': float(state.base_tax_rate),
            'vendor_discount_rate': float(state.vendor_discount_rate),
            'has_local_taxes': state.has_local_taxes,
            'has_district_taxes': state.has_district_taxes,
            'requires_location_reporting': state.requires_location_reporting,
            'api_endpoints': handler.get_api_endpoints(),
            'exemption_codes': handler.get_exemption_codes()
        })
    
    @action(detail=False, methods=['post'])
    def calculate_tax(self, request):
        """Calculate sales tax for a period"""
        state_code = request.data.get('state_code')
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        location_ids = request.data.get('location_ids', [])
        
        # Validate required fields
        if not all([state_code, start_date, end_date]):
            return Response(
                {'error': 'state_code, start_date, and end_date are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            # Parse dates
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            
            # Initialize calculator
            calculator = SalesTaxCalculator(request.user.tenant_id, state_code)
            
            # Calculate taxable sales
            result = calculator.calculate_taxable_sales(
                start_date=start_date,
                end_date=end_date,
                location_ids=location_ids
            )
            
            # Add additional calculations
            handler = get_state_handler(state_code)
            if handler:
                # Calculate vendor discount if applicable
                state = State.objects.get(code=state_code.upper())
                if state.vendor_discount_rate > 0:
                    discount = result['tax_collected'] * state.vendor_discount_rate
                    result['vendor_discount'] = float(discount.quantize(Decimal('0.01')))
                    result['net_tax_due'] = float(
                        (result['tax_collected'] - discount).quantize(Decimal('0.01'))
                    )
                else:
                    result['vendor_discount'] = 0
                    result['net_tax_due'] = float(result['tax_collected'])
                    
                # Add due date
                result['due_date'] = handler.calculate_due_date(end_date).isoformat()
                result['filing_frequency'] = handler.get_filing_frequency(
                    result['gross_sales'] * 12 / ((end_date - start_date).days / 30)
                )
            
            # Convert Decimal values to float for JSON serialization
            for key in ['gross_sales', 'exempt_sales', 'taxable_sales', 'tax_collected']:
                result[key] = float(result[key])
                
            for loc_id, loc_data in result['location_breakdown'].items():
                for field in ['gross_sales', 'tax_collected']:
                    loc_data[field] = float(loc_data[field])
                    
            for reason, amount in result['exemption_breakdown'].items():
                result['exemption_breakdown'][reason] = float(amount)
            
            return Response(result)
            
        except ValueError as e:
            return Response(
                {'error': f'Invalid date format: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error calculating tax: {str(e)}")
            return Response(
                {'error': 'Failed to calculate tax'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def validate_filing(self, request):
        """Validate filing data before submission"""
        state_code = request.data.get('state_code')
        filing_data = request.data.get('filing_data', {})
        
        if not state_code:
            return Response(
                {'error': 'state_code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        handler = get_state_handler(state_code.upper())
        if not handler:
            return Response(
                {'error': f'No e-filing support for state: {state_code}'},
                status=status.HTTP_404_NOT_FOUND
            )
            
        # Convert string values to Decimal for validation
        decimal_fields = [
            'gross_sales', 'taxable_sales', 'tax_collected', 'tax_due',
            'exempt_sales', 'vendor_discount', 'net_tax_due'
        ]
        for field in decimal_fields:
            if field in filing_data:
                try:
                    filing_data[field] = Decimal(str(filing_data[field]))
                except:
                    return Response(
                        {'error': f'Invalid decimal value for {field}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
        
        is_valid, errors = handler.validate_filing_data(filing_data)
        
        return Response({
            'valid': is_valid,
            'errors': errors,
            'state_code': state_code.upper()
        })
    
    @action(detail=False, methods=['post'])
    def generate_report(self, request):
        """Generate state-specific e-filing report"""
        state_code = request.data.get('state_code')
        filing_data = request.data.get('filing_data', {})
        
        if not all([state_code, filing_data]):
            return Response(
                {'error': 'state_code and filing_data are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            calculator = SalesTaxCalculator(request.user.tenant_id, state_code)
            
            # Convert string values to Decimal
            decimal_fields = [
                'gross_sales', 'taxable_sales', 'tax_collected', 'tax_due',
                'exempt_sales', 'vendor_discount', 'net_tax_due', 'annual_revenue'
            ]
            for field in decimal_fields:
                if field in filing_data:
                    filing_data[field] = Decimal(str(filing_data[field]))
            
            report = calculator.generate_state_report(filing_data)
            
            # Convert Decimal values back to float for JSON
            for key, value in report.items():
                if isinstance(value, Decimal):
                    report[key] = float(value)
                elif isinstance(value, dict):
                    for k, v in value.items():
                        if isinstance(v, Decimal):
                            report[key][k] = float(v)
                elif isinstance(value, list):
                    for i, item in enumerate(value):
                        if isinstance(item, dict):
                            for k, v in item.items():
                                if isinstance(v, Decimal):
                                    report[key][i][k] = float(v)
            
            return Response(report)
            
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error generating report: {str(e)}")
            return Response(
                {'error': 'Failed to generate report'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def validate_locations(self, request):
        """Validate if locations can be filed together"""
        state_code = request.data.get('state_code')
        location_ids = request.data.get('location_ids', [])
        
        if not all([state_code, location_ids]):
            return Response(
                {'error': 'state_code and location_ids are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            calculator = SalesTaxCalculator(request.user.tenant_id, state_code)
            is_valid, errors = calculator.validate_multi_location_filing(location_ids)
            
            return Response({
                'valid': is_valid,
                'errors': errors,
                'state_code': state_code.upper(),
                'location_count': len(location_ids)
            })
            
        except Exception as e:
            logger.error(f"Error validating locations: {str(e)}")
            return Response(
                {'error': 'Failed to validate locations'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def filing_checklist(self, request):
        """Get filing checklist for a state"""
        state_code = request.query_params.get('state_code')
        if not state_code:
            return Response(
                {'error': 'state_code parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            calculator = SalesTaxCalculator(request.user.tenant_id, state_code)
            checklist = calculator.get_filing_checklist()
            
            return Response({
                'state_code': state_code.upper(),
                'checklist': checklist
            })
            
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error getting checklist: {str(e)}")
            return Response(
                {'error': 'Failed to get filing checklist'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )