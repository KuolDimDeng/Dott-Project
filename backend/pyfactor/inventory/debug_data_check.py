from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from inventory.models import Service, Supplier, Product
from sales.models import Invoice
from crm.models import Customer
from users.models import User
from django.db.models import Count

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def debug_check_tenant_data(request):
    """Debug endpoint to check tenant data"""
    
    try:
        # Get current user
        user = request.user
        tenant_id = getattr(user, 'tenant_id', None) or getattr(user, 'business_id', None)
        
        response_data = {
            'user': {
                'email': user.email,
                'tenant_id': str(user.tenant_id) if user.tenant_id else None,
                'business_id': str(user.business_id) if user.business_id else None,
                'active_tenant': str(tenant_id) if tenant_id else None
            },
            'tenant_data': {},
            'database_totals': {},
            'sample_data': {}
        }
        
        # Check data for user's tenant
        if tenant_id:
            response_data['tenant_data'] = {
                'products': Product.objects.filter(tenant_id=tenant_id).count(),
                'services': Service.objects.filter(tenant_id=tenant_id).count(),
                'suppliers': Supplier.objects.filter(tenant_id=tenant_id).count(),
                'invoices': Invoice.objects.filter(tenant_id=tenant_id).count(),
                'customers': Customer.objects.filter(tenant_id=tenant_id).count()
            }
        
        # Check total data in database
        response_data['database_totals'] = {
            'total_products': Product.objects.all().count(),
            'total_services': Service.objects.all().count(),
            'total_suppliers': Supplier.objects.all().count(),
            'total_invoices': Invoice.objects.all().count(),
            'total_customers': Customer.objects.all().count()
        }
        
        # Get tenant distribution for services
        service_tenants = Service.objects.values('tenant_id').annotate(count=Count('id')).order_by('-count')[:5]
        response_data['service_tenant_distribution'] = [
            {'tenant_id': str(item['tenant_id']), 'count': item['count']} 
            for item in service_tenants
        ]
        
        # Get sample services if any exist
        sample_services = Service.objects.all()[:5]
        if sample_services:
            response_data['sample_data']['services'] = [
                {
                    'name': s.name,
                    'tenant_id': str(s.tenant_id),
                    'service_code': s.service_code,
                    'created_at': s.created_at.isoformat() if hasattr(s, 'created_at') else None
                }
                for s in sample_services
            ]
        
        # Get sample suppliers if any exist
        sample_suppliers = Supplier.objects.all()[:5]
        if sample_suppliers:
            response_data['sample_data']['suppliers'] = [
                {
                    'name': s.name,
                    'tenant_id': str(s.tenant_id),
                    'email': s.email if hasattr(s, 'email') else None,
                    'created_at': s.created_at.isoformat() if hasattr(s, 'created_at') else None
                }
                for s in sample_suppliers
            ]
        
        # Get sample invoices if any exist
        sample_invoices = Invoice.objects.all()[:5]
        if sample_invoices:
            response_data['sample_data']['invoices'] = [
                {
                    'invoice_number': i.invoice_number,
                    'tenant_id': str(i.tenant_id),
                    'total_amount': str(i.totalAmount) if hasattr(i, 'totalAmount') else None,
                    'created_at': i.created_at.isoformat() if hasattr(i, 'created_at') else None
                }
                for i in sample_invoices
            ]
        
        return JsonResponse(response_data, safe=False)
        
    except Exception as e:
        return JsonResponse({
            'error': str(e),
            'type': type(e).__name__
        }, status=500)