"""
Filing Service API Views
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Count, Sum
from django.utils import timezone
from datetime import datetime, timedelta
import logging

from ..models import TaxFiling, GlobalSalesTaxRate
from ..serializers import (
    FilingServiceCreateSerializer,
    FilingServiceListSerializer,
    FilingServiceStatsSerializer,
    TaxFilingSerializer
)
from custom_auth.permissions import TenantAccessPermission
from ..payment_integration import create_filing_service_checkout_session

logger = logging.getLogger(__name__)

# Enable detailed logging
import sys
logger.setLevel(logging.DEBUG)
handler = logging.StreamHandler(sys.stdout)
handler.setLevel(logging.DEBUG)
formatter = logging.Formatter('[%(asctime)s] %(name)s %(levelname)s: %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)


class FilingServiceViewSet(viewsets.ModelViewSet):
    """ViewSet for tax filing service"""
    permission_classes = [IsAuthenticated, TenantAccessPermission]
    
    def dispatch(self, request, *args, **kwargs):
        logger.info(f"[FilingService] {request.method} {request.path} - User: {getattr(request.user, 'email', 'Anonymous')}")
        return super().dispatch(request, *args, **kwargs)
    
    def get_queryset(self):
        logger.info(f"[FilingService] Getting queryset for user {self.request.user.id}")
        """Filter filings by tenant"""
        return TaxFiling.objects.filter(
            tenant_id=self.request.user.profile.tenant_id,
            tax_type='sales'
        )
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        logger.debug(f"[FilingService] get_serializer_class called for action: {self.action}")
        if self.action == 'create':
            return FilingServiceCreateSerializer
        elif self.action == 'list':
            return FilingServiceListSerializer
        elif self.action == 'stats':
            return FilingServiceStatsSerializer
        return TaxFilingSerializer
    
    def create(self, request, *args, **kwargs):
        """Create new filing service request"""
        logger.info(f"[FilingService] Creating new filing for user {request.user.email}")
        logger.debug(f"[FilingService] Request data: {request.data}")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Set tenant and user
        serializer.validated_data['tenant_id'] = request.user.profile.tenant_id
        serializer.validated_data['user'] = request.user
        serializer.validated_data['created_by'] = request.user
        
        # Get tax rate info if not provided
        if not serializer.validated_data.get('tax_rate'):
            country = serializer.validated_data.get('country', 'US')
            region = serializer.validated_data.get('region_code')
            
            # Try to get tax rate from GlobalSalesTaxRate
            tax_rate_obj = GlobalSalesTaxRate.objects.filter(
                country=country,
                is_current=True
            ).first()
            
            if region:
                # Try to get region-specific rate
                region_rate = GlobalSalesTaxRate.objects.filter(
                    country=country,
                    region_code=region,
                    is_current=True
                ).first()
                if region_rate:
                    tax_rate_obj = region_rate
            
            if tax_rate_obj:
                serializer.validated_data['tax_rate'] = tax_rate_obj.rate
        
        # Save the filing
        filing = serializer.save()
        
        # Create Stripe checkout session
        try:
            checkout_data = create_filing_service_checkout_session(filing, request)
            
            return Response({
                'success': True,
                'filing': TaxFilingSerializer(filing).data,
                'payment_url': checkout_data['checkout_url'],
                'session_id': checkout_data['session_id'],
                'message': 'Filing created successfully. Redirecting to payment.'
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"[FilingService] Error creating payment session: {str(e)}")
            logger.error(f"[FilingService] Error type: {type(e).__name__}")
            logger.error(f"[FilingService] Filing data: {filing.id}")
            # Delete the filing if payment session creation fails
            filing.delete()
            return Response({
                'success': False,
                'message': 'Error creating payment session. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get filing statistics"""
        logger.info(f"[FilingService] Getting stats for user {request.user.email}")
        queryset = self.get_queryset()
        today = timezone.now().date()
        
        stats = {
            'total': queryset.count(),
            'pending': queryset.filter(
                status__in=['draft', 'pending_review', 'ready_to_file', 'filing']
            ).count(),
            'completed': queryset.filter(
                status__in=['filed', 'accepted']
            ).count(),
            'overdue': queryset.filter(
                due_date__lt=today,
                status__in=['draft', 'pending_review', 'ready_to_file']
            ).count()
        }
        
        serializer = FilingServiceStatsSerializer(stats)
        logger.info(f"[FilingService] Stats retrieved: {stats}")
        return Response({
            'success': True,
            'stats': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def process_payment(self, request, pk=None):
        """Process payment for filing"""
        filing = self.get_object()
        
        # Check if already paid
        if filing.payment_status == 'paid':
            return Response({
                'success': False,
                'message': 'Payment already processed'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create new checkout session
        try:
            checkout_data = create_filing_service_checkout_session(filing, request)
            
            return Response({
                'success': True,
                'payment_url': checkout_data['checkout_url'],
                'session_id': checkout_data['session_id'],
                'message': 'Redirecting to payment'
            })
            
        except Exception as e:
            logger.error(f"Error creating payment session: {str(e)}")
            return Response({
                'success': False,
                'message': 'Error creating payment session'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'])
    def download_report(self, request, pk=None):
        """Download tax report PDF"""
        filing = self.get_object()
        
        # Check if payment is completed
        if filing.payment_status != 'paid':
            return Response({
                'success': False,
                'message': 'Payment required before downloading report'
            }, status=status.HTTP_402_PAYMENT_REQUIRED)
        
        # Generate PDF report
        try:
            from ..pdf_generation.filing_report_generator import generate_filing_report
            from django.http import HttpResponse
            
            pdf_content = generate_filing_report(filing.filing_id)
            
            # Create response with PDF
            response = HttpResponse(pdf_content, content_type='application/pdf')
            filename = f"tax_report_{filing.country}_{filing.filing_period.replace(' ', '_')}.pdf"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating PDF report: {str(e)}")
            return Response({
                'success': False,
                'message': 'Error generating report'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'])
    def generate_report(self, request, pk=None):
        """Generate and save tax report PDF"""
        filing = self.get_object()
        
        # Allow draft generation for unpaid filings
        try:
            from ..pdf_generation.filing_report_generator import generate_filing_report
            from django.core.files.base import ContentFile
            import uuid
            
            pdf_content = generate_filing_report(filing.filing_id)
            
            # Save to a file storage system (you would implement this based on your storage setup)
            # For now, we'll just return success
            
            return Response({
                'success': True,
                'message': 'Report generated successfully',
                'is_draft': filing.payment_status != 'paid'
            })
            
        except Exception as e:
            logger.error(f"Error generating PDF report: {str(e)}")
            return Response({
                'success': False,
                'message': 'Error generating report'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_country_requirements(request, country_code):
    """Get filing requirements for a specific country"""
    try:
        tax_info = GlobalSalesTaxRate.objects.filter(
            country=country_code,
            is_current=True
        ).first()
        
        if not tax_info:
            return Response({
                'success': False,
                'message': 'Country information not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Return filing information
        info = {
            'country': tax_info.country,
            'country_name': tax_info.country_name,
            'tax_type': tax_info.tax_type,
            'rate': tax_info.rate,
            'tax_authority_name': tax_info.tax_authority_name,
            'filing_frequency': tax_info.filing_frequency,
            'filing_day_of_month': tax_info.filing_day_of_month,
            'main_form_name': tax_info.main_form_name,
            'online_filing_available': tax_info.online_filing_available,
            'online_portal_name': tax_info.online_portal_name,
            'online_portal_url': tax_info.online_portal_url,
            'filing_instructions': tax_info.filing_instructions,
            'manual_filing_fee': tax_info.manual_filing_fee,
            'online_filing_fee': tax_info.online_filing_fee,
            'ai_confidence_score': tax_info.ai_confidence_score,
            'ai_last_verified': tax_info.ai_last_verified
        }
        
        return Response({
            'success': True,
            'info': info
        })
        
    except Exception as e:
        logger.error(f"Error getting country requirements: {str(e)}")
        return Response({
            'success': False,
            'message': 'Error retrieving country information'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_sales_data(request):
    """Get sales data for a specific period"""
    period_type = request.GET.get('period_type', 'monthly')
    year = int(request.GET.get('year', timezone.now().year))
    month = request.GET.get('month')
    quarter = request.GET.get('quarter')
    
    # TODO: Integrate with actual sales data from POS/invoicing system
    # For now, return mock data
    
    sales_data = {
        'total_sales': 50000.00,
        'taxable_sales': 45000.00,
        'tax_collected': 3825.00,  # Assuming 8.5% tax rate
        'transaction_count': 234
    }
    
    return Response({
        'success': True,
        'sales_data': sales_data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_tax_info(request):
    """Get tax information for a country/region"""
    country = request.GET.get('country', 'US')
    region_code = request.GET.get('region_code')
    
    # Get tax rate info
    tax_query = GlobalSalesTaxRate.objects.filter(
        country=country,
        is_current=True
    )
    
    if region_code:
        tax_query = tax_query.filter(region_code=region_code)
    
    tax_info = tax_query.first()
    
    if not tax_info:
        return Response({
            'success': False,
            'message': 'Tax information not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    return Response({
        'success': True,
        'tax_info': {
            'rate': tax_info.rate,
            'tax_authority_name': tax_info.tax_authority_name,
            'filing_frequency': tax_info.filing_frequency,
            'filing_day_of_month': tax_info.filing_day_of_month,
            'online_filing_available': tax_info.online_filing_available,
            'manual_filing_fee': tax_info.manual_filing_fee,
            'online_filing_fee': tax_info.online_filing_fee
        }
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_countries_list(request):
    """Get list of all countries with tax filing service"""
    countries = GlobalSalesTaxRate.objects.filter(
        is_current=True,
        region_code__isnull=True
    ).values('country', 'country_name').distinct().order_by('country_name')
    
    return Response({
        'success': True,
        'countries': list(countries)
    })