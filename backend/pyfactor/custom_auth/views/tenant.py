from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db import connection, transaction
from custom_auth.models import User, Tenant
from django.utils import timezone
import uuid
import logging
from custom_auth.rls import set_tenant_in_db, verify_rls_setup

logger = logging.getLogger(__name__)

class TenantVerifyView(APIView):
    """
    API endpoint to verify if a tenant record exists and RLS is properly configured
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            user = request.user
            request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
            
            # Check if user has a tenant
            if not user.tenant_id:
                return Response({
                    'message': 'No tenant associated with user',
                    'rls_enabled': False,
                    'request_id': request_id
                }, status=status.HTTP_200_OK)
                
            tenant = Tenant.objects.filter(id=user.tenant_id).first()
            if not tenant:
                return Response({
                    'message': 'Tenant not found in database',
                    'rls_enabled': False,
                    'request_id': request_id
                }, status=status.HTTP_200_OK)
            
            # Set RLS context for this database connection
            set_tenant_in_db(tenant.id)
            
            # Check if RLS is properly configured
            rls_verified = verify_rls_setup()
            
            # Check if tenant has access to at least one table with RLS
            has_rls_tables = False
            with connection.cursor() as cursor:
                # Query for tables that have tenant_id column (RLS tables)
                cursor.execute("""
                    SELECT count(*) FROM information_schema.columns 
                    WHERE column_name = 'tenant_id' AND table_schema = 'public'
                """)
                rls_table_count = cursor.fetchone()[0]
                has_rls_tables = rls_table_count > 0
            
            # Check if we can query data with RLS
            rls_working = False
            if has_rls_tables:
                try:
                    # Set tenant context and try a query to verify RLS works
                    set_tenant_in_db(tenant.id)
                    with connection.cursor() as cursor:
                        # Try a test query on any table with tenant_id
                        cursor.execute("""
                            SELECT table_name FROM information_schema.columns 
                            WHERE column_name = 'tenant_id' AND table_schema = 'public'
                            LIMIT 1
                        """)
                        table_result = cursor.fetchone()
                        
                        if table_result and table_result[0]:
                            test_table = table_result[0]
                            # Try to query the first row from this table
                            cursor.execute(f"SELECT EXISTS (SELECT 1 FROM {test_table} LIMIT 1)")
                            rls_working = True
                except Exception as e:
                    logger.error(f"Error testing RLS query: {str(e)}")
                    rls_working = False
            
            return Response({
                'message': 'Tenant verification complete',
                'tenant_id': str(tenant.id),
                'rls_enabled': rls_verified,
                'has_rls_tables': has_rls_tables,
                'rls_table_count': rls_table_count if has_rls_tables else 0,
                'rls_working': rls_working,
                'request_id': request_id
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error verifying tenant: {str(e)}")
            return Response({
                'message': f"Error verifying tenant: {str(e)}",
                'rls_enabled': False,
                'request_id': request_id if 'request_id' in locals() else str(uuid.uuid4())
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TenantCreateView(APIView):
    """
    API endpoint to create a tenant schema if it doesn't exist
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            user = request.user
            
            # Check if user already has a tenant
            tenant = None
            if user.tenant_id:
                tenant = Tenant.objects.filter(id=user.tenant_id).first()
                
                if tenant:
                    # Check if schema exists
                    with connection.cursor() as cursor:
                        cursor.execute("""
                            SELECT EXISTS (
                                SELECT 1 FROM information_schema.schemata 
                                WHERE schema_name = %s
                            )
                        """, [ tenant.id])
                        
                        schema_exists = cursor.fetchone()[0]
                        
                        if schema_exists:
                            return Response({
                                'tenant_id': str(tenant.id),
                                'schema_name':  tenant.id,
                                'message': 'Tenant schema already exists'
                            }, status=status.HTTP_200_OK)
            
            # If no tenant exists, require business name
            if not tenant:
                # CRITICAL: Business name MUST be provided explicitly
                business_name = request.data.get('business_name', '').strip()
                
                if not business_name:
                    return Response({
                        'error': 'Business name is required',
                        'message': 'Please provide your business name to create a tenant'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Generate tenant ID and schema name
                tenant_id = uuid.uuid4()
                schema_name = f"tenant_{str(tenant_id).replace('-', '_')}"
                
                with transaction.atomic():
                    tenant = Tenant.objects.create(
                        id=tenant_id,
                        schema_name=schema_name,
                        name=business_name,  # Use provided business name only
                        owner_id=user.id,
                        created_on=timezone.now(),
                        is_active=True,
                        setup_status='pending'
                    )
                    
                    # Link tenant to user and set as OWNER
                    user.tenant_id = tenant.id
                    user.role = 'OWNER'  # Set first user as owner
                    user.save(update_fields=['tenant_id', 'role'])
            
            # Create schema in database
            with connection.cursor() as cursor:
                # Create schema
                cursor.execute(f'CREATE SCHEMA IF NOT EXISTS "{ tenant.id}"')
                
                # Set up permissions
                db_user = connection.settings_dict['USER']
                cursor.execute(f'GRANT USAGE ON SCHEMA "{ tenant.id}" TO {db_user}')
                cursor.execute(f'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "{ tenant.id}" TO {db_user}')
                cursor.execute(f'ALTER DEFAULT PRIVILEGES IN SCHEMA "{ tenant.id}" GRANT ALL ON TABLES TO {db_user}')
                
                # Create essential auth tables in the new schema
                cursor.execute(f"""
                    -- Create auth tables
                    CREATE TABLE IF NOT EXISTS /* RLS: Use tenant_id filtering */ "custom_auth_user" (
                        id UUID PRIMARY KEY,
                        password VARCHAR(128) NOT NULL,
                        last_login TIMESTAMP WITH TIME ZONE NULL,
                        is_superuser BOOLEAN NOT NULL,
                        email VARCHAR(254) NOT NULL UNIQUE,
                        first_name VARCHAR(100) NOT NULL DEFAULT '',
                        last_name VARCHAR(100) NOT NULL DEFAULT '',
                        is_active BOOLEAN NOT NULL DEFAULT TRUE,
                        is_staff BOOLEAN NOT NULL DEFAULT FALSE,
                        date_joined TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                        email_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
                        confirmation_token UUID NOT NULL DEFAULT gen_random_uuid(),
                        is_onboarded BOOLEAN NOT NULL DEFAULT FALSE,
                        stripe_customer_id VARCHAR(255) NULL,
                        role VARCHAR(20) NOT NULL DEFAULT 'OWNER',
                        occupation VARCHAR(50) NOT NULL DEFAULT 'owner',
                        tenant_id UUID NULL,
                        cognito_sub VARCHAR(36) NULL
                    );
                    
                    CREATE INDEX IF NOT EXISTS custom_auth_user_email_key ON "{ tenant.id}"."custom_auth_user" (email);
                    CREATE INDEX IF NOT EXISTS idx_user_tenant ON /* RLS: Use tenant_id filtering */ "custom_auth_user" (tenant_id);
                    
                    -- Auth User Permissions
                    CREATE TABLE IF NOT EXISTS "{ tenant.id}"."custom_auth_user_user_permissions" (
                        id SERIAL PRIMARY KEY,
                        user_id UUID NOT NULL REFERENCES /* RLS: Use tenant_id filtering */ "custom_auth_user"(id),
                        permission_id INTEGER NOT NULL,
                        CONSTRAINT custom_auth_user_user_permissions_user_id_permission_id_key UNIQUE (user_id, permission_id)
                    );
                    
                    -- Auth User Groups
                    CREATE TABLE IF NOT EXISTS "{ tenant.id}"."custom_auth_user_groups" (
                        id SERIAL PRIMARY KEY,
                        user_id UUID NOT NULL REFERENCES /* RLS: Use tenant_id filtering */ "custom_auth_user"(id),
                        group_id INTEGER NOT NULL,
                        CONSTRAINT custom_auth_user_groups_user_id_group_id_key UNIQUE (user_id, group_id)
                    );
                    
                    -- Tenant table
                    CREATE TABLE IF NOT EXISTS "{ tenant.id}"."custom_auth_tenant" (
                        id UUID PRIMARY KEY,
                        schema_name VARCHAR(63) NOT NULL UNIQUE,
                        name VARCHAR(100) NOT NULL,
                        created_on TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                        is_active BOOLEAN NOT NULL DEFAULT TRUE,
                        setup_status VARCHAR(20) NOT NULL,
                        setup_task_id VARCHAR(255) NULL,
                        last_setup_attempt TIMESTAMP WITH TIME ZONE NULL,
                        setup_error_message TEXT NULL,
                        last_health_check TIMESTAMP WITH TIME ZONE NULL,
                        storage_quota_bytes BIGINT NOT NULL DEFAULT 2147483648,
                        owner_id UUID NOT NULL
                    );
                """)
                
                # Copy the user to the new schema
                cursor.execute(f"""
                    INSERT INTO /* RLS: Use tenant_id filtering */ "custom_auth_user" 
                    (id, password, last_login, is_superuser, email, first_name, last_name, 
                    is_active, is_staff, date_joined, email_confirmed, confirmation_token, 
                    is_onboarded, stripe_customer_id, role, occupation, tenant_id, cognito_sub)
                    VALUES (
                        %s, %s, %s, %s, %s, %s, %s, 
                        %s, %s, %s, %s, %s, 
                        %s, %s, %s, %s, %s, %s
                    )
                    ON CONFLICT (id) DO NOTHING
                """, [
                    str(user.id), user.password, user.last_login, user.is_superuser,
                    user.email, user.first_name, user.last_name,
                    user.is_active, user.is_staff, user.date_joined, user.email_confirmed,
                    str(user.confirmation_token) if user.confirmation_token else str(uuid.uuid4()),
                    user.is_onboarded, user.stripe_customer_id, user.role, user.occupation,
                    str(tenant.id), user.cognito_sub
                ])
                
                # Copy the tenant to the new schema
                cursor.execute(f"""
                    INSERT INTO /* RLS: Use tenant_id filtering */ "custom_auth_tenant"
                    (id, schema_name, name, created_on, is_active, setup_status, 
                    setup_task_id, last_setup_attempt, setup_error_message,
                    last_health_check, storage_quota_bytes, owner_id)
                    VALUES (
                        %s, %s, %s, %s, %s, %s,
                        %s, %s, %s,
                        %s, %s, %s
                    )
                    ON CONFLICT (id) DO NOTHING
                """, [
                    str(tenant.id),  tenant.id, tenant.name, tenant.created_on,
                    tenant.is_active, tenant.setup_status,
                    tenant.setup_task_id, tenant.last_setup_attempt, tenant.setup_error_message,
                    tenant.last_health_check, tenant.storage_quota_bytes, str(user.id)
                ])
            
            return Response({
                'tenant_id': str(tenant.id),
                'schema_name':  tenant.id,
                'message': 'Tenant schema created successfully'
            }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            logger.error(f"Error creating tenant schema: {str(e)}")
            return Response({
                'error': 'Failed to create tenant schema',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 