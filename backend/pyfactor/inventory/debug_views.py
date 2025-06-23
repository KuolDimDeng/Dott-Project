"""
Debug views for testing RLS context
"""
from django.db import connection
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
import logging

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def debug_rls_context(request):
    """Debug endpoint to check RLS context"""
    debug_info = {
        'user': str(request.user),
        'user_id': request.user.id,
        'user_tenant_id': str(getattr(request.user, 'tenant_id', 'None')),
        'request_tenant_id': str(getattr(request, 'tenant_id', 'None')),
    }
    
    # Check current RLS context
    with connection.cursor() as cursor:
        cursor.execute("SELECT current_setting('app.current_tenant_id', true)")
        rls_context = cursor.fetchone()[0]
        debug_info['rls_context'] = rls_context
        
        # Test query with context
        cursor.execute("SELECT COUNT(*) FROM inventory_supplier")
        supplier_count = cursor.fetchone()[0]
        debug_info['supplier_count_with_context'] = supplier_count
        
        # Get all suppliers to debug
        cursor.execute("SELECT id, name, tenant_id FROM inventory_supplier")
        suppliers = cursor.fetchall()
        debug_info['all_suppliers'] = [
            {'id': s[0], 'name': s[1], 'tenant_id': str(s[2])} 
            for s in suppliers
        ]
    
    logger.info(f"Debug RLS info: {debug_info}")
    
    return Response(debug_info)