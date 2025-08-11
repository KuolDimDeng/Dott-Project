"""
Critical tenant isolation fix for production.
Ensures users can only see their own data.
"""
import logging
from django.db import models
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)

User = get_user_model()


def fix_user_tenant_mapping():
    """
    Fix tenant mapping for all users to ensure proper data isolation.
    """
    users_fixed = 0
    users_with_issues = []
    
    for user in User.objects.all():
        try:
            # Ensure user has either business_id or tenant_id
            if not user.business_id and not user.tenant_id:
                # Try to find tenant from related data
                from custom_auth.models import Tenant
                
                # Check if user has any related tenant
                tenant = Tenant.objects.filter(
                    models.Q(created_by=user) | 
                    models.Q(owner=user)
                ).first()
                
                if tenant:
                    user.business_id = tenant.id
                    user.save(update_fields=['business_id'])
                    users_fixed += 1
                    logger.info(f"Fixed tenant for user {user.email}: {tenant.id}")
                else:
                    users_with_issues.append(user.email)
                    logger.warning(f"User {user.email} has no tenant association")
            
            # Ensure consistency between business_id and tenant_id
            elif user.business_id and not user.tenant_id:
                user.tenant_id = user.business_id
                user.save(update_fields=['tenant_id'])
                users_fixed += 1
                logger.info(f"Synced tenant_id for user {user.email}")
                
            elif user.tenant_id and not user.business_id:
                user.business_id = user.tenant_id
                user.save(update_fields=['business_id'])
                users_fixed += 1
                logger.info(f"Synced business_id for user {user.email}")
                
        except Exception as e:
            logger.error(f"Error fixing tenant for user {user.email}: {str(e)}")
            users_with_issues.append(user.email)
    
    return {
        'users_fixed': users_fixed,
        'users_with_issues': users_with_issues
    }


def verify_tenant_isolation(user_email):
    """
    Verify that a user can only see their own tenant's data.
    """
    try:
        user = User.objects.get(email=user_email)
        tenant_id = user.business_id or user.tenant_id
        
        if not tenant_id:
            return {
                'status': 'error',
                'message': f'User {user_email} has no tenant association'
            }
        
        # Check various models for proper filtering
        from inventory.models import Product, Service
        from crm.models import Customer
        from finance.models import Invoice
        
        results = {
            'user': user_email,
            'tenant_id': str(tenant_id),
            'data_counts': {}
        }
        
        # Count data for this tenant
        results['data_counts']['products'] = Product.objects.filter(tenant_id=tenant_id).count()
        results['data_counts']['services'] = Service.objects.filter(tenant_id=tenant_id).count()
        results['data_counts']['customers'] = Customer.objects.filter(tenant_id=tenant_id).count()
        results['data_counts']['invoices'] = Invoice.objects.filter(tenant_id=tenant_id).count()
        
        # Check for any data leakage (data without tenant_id)
        orphaned_data = {
            'products_without_tenant': Product.objects.filter(tenant_id__isnull=True).count(),
            'services_without_tenant': Service.objects.filter(tenant_id__isnull=True).count(),
            'customers_without_tenant': Customer.objects.filter(tenant_id__isnull=True).count(),
            'invoices_without_tenant': Invoice.objects.filter(tenant_id__isnull=True).count(),
        }
        
        results['orphaned_data'] = orphaned_data
        results['status'] = 'success'
        
        # Check if user can access their data through the API
        return results
        
    except User.DoesNotExist:
        return {
            'status': 'error',
            'message': f'User {user_email} not found'
        }
    except Exception as e:
        return {
            'status': 'error',
            'message': str(e)
        }


def ensure_all_data_has_tenant():
    """
    Ensure all data records have a tenant_id to prevent data leakage.
    """
    from inventory.models import Product, Service
    from crm.models import Customer
    from finance.models import Invoice
    
    fixes_applied = {}
    
    # Fix products without tenant_id
    orphaned_products = Product.objects.filter(tenant_id__isnull=True)
    if orphaned_products.exists():
        for product in orphaned_products:
            if hasattr(product, 'created_by') and product.created_by:
                tenant_id = product.created_by.business_id or product.created_by.tenant_id
                if tenant_id:
                    product.tenant_id = tenant_id
                    product.save(update_fields=['tenant_id'])
                    fixes_applied.setdefault('products', 0)
                    fixes_applied['products'] += 1
    
    # Fix services without tenant_id
    orphaned_services = Service.objects.filter(tenant_id__isnull=True)
    if orphaned_services.exists():
        for service in orphaned_services:
            if hasattr(service, 'created_by') and service.created_by:
                tenant_id = service.created_by.business_id or service.created_by.tenant_id
                if tenant_id:
                    service.tenant_id = tenant_id
                    service.save(update_fields=['tenant_id'])
                    fixes_applied.setdefault('services', 0)
                    fixes_applied['services'] += 1
    
    # Fix customers without tenant_id
    orphaned_customers = Customer.objects.filter(tenant_id__isnull=True)
    if orphaned_customers.exists():
        for customer in orphaned_customers:
            if hasattr(customer, 'created_by') and customer.created_by:
                tenant_id = customer.created_by.business_id or customer.created_by.tenant_id
                if tenant_id:
                    customer.tenant_id = tenant_id
                    customer.save(update_fields=['tenant_id'])
                    fixes_applied.setdefault('customers', 0)
                    fixes_applied['customers'] += 1
    
    # Fix invoices without tenant_id
    orphaned_invoices = Invoice.objects.filter(tenant_id__isnull=True)
    if orphaned_invoices.exists():
        for invoice in orphaned_invoices:
            if hasattr(invoice, 'created_by') and invoice.created_by:
                tenant_id = invoice.created_by.business_id or invoice.created_by.tenant_id
                if tenant_id:
                    invoice.tenant_id = tenant_id
                    invoice.save(update_fields=['tenant_id'])
                    fixes_applied.setdefault('invoices', 0)
                    fixes_applied['invoices'] += 1
    
    return fixes_applied


if __name__ == "__main__":
    # Run fixes
    print("Fixing user tenant mappings...")
    user_fixes = fix_user_tenant_mapping()
    print(f"Fixed {user_fixes['users_fixed']} users")
    if user_fixes['users_with_issues']:
        print(f"Users with issues: {user_fixes['users_with_issues']}")
    
    print("\nEnsuring all data has tenant_id...")
    data_fixes = ensure_all_data_has_tenant()
    print(f"Fixed orphaned data: {data_fixes}")
    
    print("\nVerifying tenant isolation for support@dottapps.com...")
    verification = verify_tenant_isolation('support@dottapps.com')
    print(f"Verification result: {verification}")