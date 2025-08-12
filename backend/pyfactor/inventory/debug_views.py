"""
Debug views to check tenant filtering
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Product, Service, Supplier
from crm.models import Customer
from sales.models import Invoice
from django.db.models import Q
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
    all_suppliers = Supplier.objects.all().count()
    all_invoices = Invoice.objects.all().count()
    all_customers = Customer.objects.all().count()
    
    # Get filtered counts
    user_products = Product.objects.filter(tenant_id=tenant_id).count() if tenant_id else 0
    user_services = Service.objects.filter(tenant_id=tenant_id).count() if tenant_id else 0
    user_suppliers = Supplier.objects.filter(tenant_id=tenant_id).count() if tenant_id else 0
    user_invoices = Invoice.objects.filter(tenant_id=tenant_id).count() if tenant_id else 0
    user_customers = Customer.objects.filter(tenant_id=tenant_id).count() if tenant_id else 0
    
    # Check if there's ANY service/supplier/invoice data in the entire database
    any_services = Service.objects.all()[:5]
    any_suppliers = Supplier.objects.all()[:5]
    any_invoices = Invoice.objects.all()[:5]
    
    # Get sample data
    sample_products = []
    sample_services = []
    sample_suppliers = []
    sample_invoices = []
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
        
        services = Service.objects.filter(tenant_id=tenant_id)[:5]
        for s in services:
            sample_services.append({
                'id': str(s.id),
                'name': s.name,
                'service_code': s.service_code,
                'tenant_id': str(s.tenant_id)
            })
        
        suppliers = Supplier.objects.filter(tenant_id=tenant_id)[:5]
        for sup in suppliers:
            sample_suppliers.append({
                'id': str(sup.id),
                'name': sup.name,
                'email': sup.email if hasattr(sup, 'email') else None,
                'tenant_id': str(sup.tenant_id)
            })
        
        invoices = Invoice.objects.filter(tenant_id=tenant_id)[:5]
        for inv in invoices:
            sample_invoices.append({
                'id': str(inv.id),
                'invoice_number': inv.invoice_number,
                'total': str(inv.totalAmount) if hasattr(inv, 'totalAmount') else None,
                'tenant_id': str(inv.tenant_id)
            })
        
        customers = Customer.objects.filter(tenant_id=tenant_id)[:5]
        for c in customers:
            sample_customers.append({
                'id': str(c.id),
                'name': c.name,
                'email': c.email,
                'tenant_id': str(c.tenant_id)
            })
    
    # Get any existing data from the entire database
    all_sample_services = []
    for s in any_services:
        all_sample_services.append({
            'name': s.name,
            'tenant_id': str(s.tenant_id),
            'service_code': s.service_code
        })
    
    all_sample_suppliers = []
    for sup in any_suppliers:
        all_sample_suppliers.append({
            'name': sup.name,
            'tenant_id': str(sup.tenant_id),
            'email': sup.email if hasattr(sup, 'email') else None
        })
    
    all_sample_invoices = []
    for inv in any_invoices:
        all_sample_invoices.append({
            'invoice_number': inv.invoice_number,
            'tenant_id': str(inv.tenant_id),
            'total': str(inv.totalAmount) if hasattr(inv, 'totalAmount') else None
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
                'suppliers': all_suppliers,
                'invoices': all_invoices,
                'customers': all_customers
            },
            'user_tenant': {
                'products': user_products,
                'services': user_services,
                'suppliers': user_suppliers,
                'invoices': user_invoices,
                'customers': user_customers
            }
        },
        'sample_data': {
            'products': sample_products,
            'services': sample_services,
            'suppliers': sample_suppliers,
            'invoices': sample_invoices,
            'customers': sample_customers
        },
        'any_data_in_database': {
            'services': all_sample_services,
            'suppliers': all_sample_suppliers,
            'invoices': all_sample_invoices
        },
        'debug_info': {
            'tenant_id_used': str(tenant_id) if tenant_id else None,
            'request_headers': {
                'X-Tenant-ID': request.headers.get('X-Tenant-ID'),
                'Authorization': 'Present' if request.headers.get('Authorization') else 'Missing'
            }
        }
    })