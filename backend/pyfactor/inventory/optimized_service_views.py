from django.db import connection, transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Service
from .serializers import ServiceSerializer
import logging
import time

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def optimized_create_service(request):
    """
    Optimized version of create_service with increased timeout and better error handling
    """
    import logging
    import time
    logger = logging.getLogger(__name__)
    
    start_time = time.time()
    
    # Log the current database connection and schema
    from django.db import connection
    from pyfactor.db_routers import TenantSchemaRouter
    
    # Get optimized connection for the current schema
    with connection.cursor() as cursor:
        cursor.execute('SHOW search_path')
        current_schema = cursor.fetchone()[0]
        logger.debug(f"Creating service in schema: {current_schema}, using connection: {connection.alias}")
        
        # Check connection status
        cursor.execute("SELECT pg_backend_pid()")
        backend_pid = cursor.fetchone()[0]
        logger.debug(f"Database connection backend PID: {backend_pid}")
        
        # Check connection status
        cursor.execute("SELECT pg_backend_pid()")
        backend_pid = cursor.fetchone()[0]
        logger.debug(f"Database connection backend PID: {backend_pid}")
    
    # Log tenant information if available
    tenant = getattr(request, 'tenant', None)
    if tenant:
        logger.debug(f"Request has tenant: {tenant.schema_name} (Status: {tenant.database_status})")
    else:
        logger.warning("No tenant found in request")
        # Check if tenant ID is in headers but not properly set in request
        tenant_id = request.headers.get('X-Tenant-ID')
        schema_name = request.headers.get('X-Schema-Name')
        if tenant_id:
            logger.warning(f"Tenant ID {tenant_id} found in headers but not in request object")
            # Try to get tenant from database
            from custom_auth.models import Tenant
            try:
                tenant = Tenant.objects.filter(id=tenant_id).first()
                if tenant:
                    logger.info(f"Found tenant in database: {tenant.schema_name}")
                    request.tenant = tenant
                else:
                    logger.error(f"Tenant with ID {tenant_id} not found in database")
                    return Response(
                        {"error": "Tenant not found. Please try logging out and back in."},
                        status=status.HTTP_404_NOT_FOUND
                    )
            except Exception as e:
                logger.error(f"Error retrieving tenant: {str(e)}")
    
    # Ensure we're in the correct schema context
    try:
        # Clear connection cache to ensure clean state
        TenantSchemaRouter.clear_connection_cache()
        
        # Get optimized connection for tenant schema
        if tenant:
            # Verify schema exists and is accessible
            try:
                with connection.cursor() as cursor:
                    # Check if schema exists
                    cursor.execute("""
                        SELECT schema_name
                        FROM information_schema.schemata
                        WHERE schema_name = %s
                    """, [tenant.schema_name])
                    
                    if not cursor.fetchone():
                        logger.error(f"Schema {tenant.schema_name} does not exist")
                        # Try to create the schema
                        from custom_auth.utils import create_tenant_schema_for_user
                        try:
                            logger.info(f"Attempting to create schema for tenant: {tenant.schema_name}")
                            create_tenant_schema_for_user(tenant.owner)
                            logger.info(f"Successfully created schema for tenant: {tenant.schema_name}")
                        except Exception as schema_error:
                            logger.error(f"Failed to create schema: {str(schema_error)}")
                            return Response(
                                {"error": "Database schema not found. Please contact support."},
                                status=status.HTTP_500_INTERNAL_SERVER_ERROR
                            )
            except Exception as e:
                logger.error(f"Error checking schema: {str(e)}")
                return Response(
                    {"error": "Error accessing database schema"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Now get the connection for the schema
            TenantSchemaRouter.get_connection_for_schema(tenant.schema_name)
            
            # Verify the inventory_service table exists
            try:
                with connection.cursor() as cursor:
                    cursor.execute(f"""
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables
                            WHERE table_schema = %s
                            AND table_name = 'inventory_service'
                        )
                    """, [tenant.schema_name])
                    
                    if not cursor.fetchone()[0]:
                        logger.error(f"inventory_service table does not exist in schema {tenant.schema_name}")
                        # Try to apply migrations for the inventory app
                        from django.core.management import call_command
                        try:
                            logger.info(f"Applying inventory migrations to schema {tenant.schema_name}")
                            call_command('migrate', 'inventory', verbosity=0)
                            logger.info("Successfully applied inventory migrations")
                        except Exception as migration_error:
                            logger.error(f"Failed to apply migrations: {str(migration_error)}")
                            return Response(
                                {"error": "Database setup incomplete. Please contact support."},
                                status=status.HTTP_500_INTERNAL_SERVER_ERROR
                            )
            except Exception as e:
                logger.error(f"Error checking inventory_service table: {str(e)}")
        
        # Log the request data for debugging
        logger.debug(f"Service creation request data: {request.data}")
        
        # Validate the data
        serializer = ServiceSerializer(data=request.data)
        if serializer.is_valid():
            # Use a transaction to ensure atomicity
            from django.db import transaction
            with transaction.atomic(using='default'):
                # Set timeout for the transaction - increased from 10s to 30s
                with connection.cursor() as cursor:
                    cursor.execute('SET LOCAL statement_timeout = 30000')  # 30 seconds
                
                # Save the service
                service = serializer.save()
                logger.debug(f"Successfully created service: {service.name} with ID {service.id} in {time.time() - start_time:.4f}s")
                return Response(ServiceSerializer(service).data, status=status.HTTP_201_CREATED)
        else:
            logger.warning(f"Service validation failed: {serializer.errors}")
            # Log detailed validation errors for debugging
            for field, errors in serializer.errors.items():
                logger.warning(f"Field '{field}' errors: {errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Error creating service: {str(e)}", exc_info=True)
        
        # Provide more specific error messages based on the exception type
        if "timeout" in str(e).lower():
            return Response({"error": "Database operation timed out. Please try again."},
                           status=status.HTTP_504_GATEWAY_TIMEOUT)
        elif "duplicate key" in str(e).lower():
            return Response({"error": "A service with this code already exists."},
                           status=status.HTTP_409_CONFLICT)
        elif "relation" in str(e).lower() and "does not exist" in str(e).lower():
            # Handle missing table errors
            logger.error(f"Table does not exist error: {str(e)}")
            
            # Try to apply migrations for the inventory app
            try:
                from django.core.management import call_command
                logger.info("Attempting to apply inventory migrations")
                
                # Get the schema name
                schema_name = 'public'
                if tenant:
                    schema_name = tenant.schema_name
                
                # Set search path to the tenant schema
                with connection.cursor() as cursor:
                    cursor.execute(f'SET search_path TO "{schema_name}",public')
                
                # Apply migrations
                call_command('migrate', 'inventory', verbosity=0)
                
                logger.info("Successfully applied inventory migrations")
                
                return Response({
                    "error": "Database setup was incomplete. We've fixed the issue, please try again.",
                    "retry": True
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            except Exception as migration_error:
                logger.error(f"Failed to apply migrations: {str(migration_error)}")
                return Response({
                    "error": "Database setup is incomplete. Please contact support.",
                    "details": str(migration_error)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        elif "schema" in str(e).lower():
            # Handle schema-related errors
            return Response({
                "error": "Database schema error. Please try logging out and back in.",
                "details": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        # Reset connection cache
        TenantSchemaRouter.clear_connection_cache()