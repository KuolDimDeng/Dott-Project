"""
Debug views to check tenant filtering
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Product, Service
from crm.models import Customer
import logging

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def debug_tenant_data(request):
    """
    Debug endpoint to check what data the user can see
    """
    user = request.user
    
    # Get tenant_id from user
    tenant_id = getattr(user, 'tenant_id', None) or getattr(user, 'business_id', None)
    
    # Get raw counts (without filtering)
    all_products = Product.objects.all().count()
    all_services = Service.objects.all().count()
    all_customers = Customer.objects.all().count()
    
    # Get filtered counts
    user_products = Product.objects.filter(tenant_id=tenant_id).count() if tenant_id else 0
    user_services = Service.objects.filter(tenant_id=tenant_id).count() if tenant_id else 0
    user_customers = Customer.objects.filter(tenant_id=tenant_id).count() if tenant_id else 0
    
    # Get sample data
    sample_products = []
    sample_customers = []
    
    if tenant_id:
        products = Product.objects.filter(tenant_id=tenant_id)[:5]
        for p in products:
            sample_products.append({
                'id': str(p.id),
                'name': p.name,
                'sku': p.sku,
                'tenant_id': str(p.tenant_id)
            })
        
        customers = Customer.objects.filter(tenant_id=tenant_id)[:5]
        for c in customers:
            sample_customers.append({
                'id': str(c.id),
                'name': c.name,
                'email': c.email,
                'tenant_id': str(c.tenant_id)
            })
    
    return Response({
        'user': {
            'id': str(user.id),
            'email': user.email,
            'tenant_id': str(tenant_id) if tenant_id else None,
            'business_id': str(user.business_id) if hasattr(user, 'business_id') else None,
        },
        'data_counts': {
            'all_system': {
                'products': all_products,
                'services': all_services,
                'customers': all_customers
            },
            'user_tenant': {
                'products': user_products,
                'services': user_services,
                'customers': user_customers
            }
        },
        'sample_data': {
            'products': sample_products,
            'customers': sample_customers
        },
        'debug_info': {
            'tenant_id_used': str(tenant_id) if tenant_id else None,
            'request_headers': {
                'X-Tenant-ID': request.headers.get('X-Tenant-ID'),
                'Authorization': 'Present' if request.headers.get('Authorization') else 'Missing'
            }
        }
    })