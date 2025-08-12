"""
Debug utilities to check tenant data visibility
"""
import logging
from django.db import connection

logger = logging.getLogger(__name__)


def debug_tenant_query(model, user):
    """
    Debug why a model query returns 0 results for a user
    """
    tenant_id = getattr(user, 'business_id', None) or getattr(user, 'tenant_id', None)
    
    logger.info(f"[TENANT DEBUG] User: {user.email}")
    logger.info(f"[TENANT DEBUG] User.business_id: {getattr(user, 'business_id', None)}")
    logger.info(f"[TENANT DEBUG] User.tenant_id: {getattr(user, 'tenant_id', None)}")
    logger.info(f"[TENANT DEBUG] Using tenant_id: {tenant_id}")
    
    # Check raw SQL
    with connection.cursor() as cursor:
        # Get table name
        table = model._meta.db_table
        
        # Count all records
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        total = cursor.fetchone()[0]
        logger.info(f"[TENANT DEBUG] Total {table} records: {total}")
        
        # Count for this tenant
        if tenant_id:
            cursor.execute(f"SELECT COUNT(*) FROM {table} WHERE tenant_id = %s", [str(tenant_id)])
            tenant_count = cursor.fetchone()[0]
            logger.info(f"[TENANT DEBUG] {table} records for tenant {tenant_id}: {tenant_count}")
            
            # Get sample records
            cursor.execute(f"""
                SELECT id, tenant_id, created_at 
                FROM {table} 
                WHERE tenant_id = %s 
                LIMIT 5
            """, [str(tenant_id)])
            samples = cursor.fetchall()
            for sample in samples:
                logger.info(f"[TENANT DEBUG] Sample: {sample}")
        
        # Check for NULL tenant_ids
        cursor.execute(f"SELECT COUNT(*) FROM {table} WHERE tenant_id IS NULL")
        null_count = cursor.fetchone()[0]
        if null_count > 0:
            logger.warning(f"[TENANT DEBUG] {table} has {null_count} records with NULL tenant_id!")
    
    # Check Django ORM query
    if tenant_id:
        orm_count = model.objects.filter(tenant_id=tenant_id).count()
        logger.info(f"[TENANT DEBUG] Django ORM count for tenant {tenant_id}: {orm_count}")
        
        # Check if using TenantManager
        if hasattr(model.objects, 'get_queryset'):
            logger.info(f"[TENANT DEBUG] Model uses custom manager: {model.objects.__class__.__name__}")
    
    return tenant_id