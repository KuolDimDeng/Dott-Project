import logging
import uuid
from django.db import connection
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from datetime import datetime
import json

logger = logging.getLogger(__name__)

def debug_rls_status():
    """
    Get the current status of RLS configuration and parameters.
    Returns a dictionary with diagnostic information.
    """
    status = {
        "timestamp": datetime.now().isoformat(),
        "db_parameters": {},
        "rls_functions": {},
        "tables_with_rls": [],
        "current_tenant": None,
        "test_results": {},
        "errors": []
    }
    
    # Get database parameters
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT name, setting FROM pg_settings WHERE name LIKE 'app.%' OR name = 'row_security'")
            params = cursor.fetchall()
            for name, value in params:
                status["db_parameters"][name] = value
                
            # Check current tenant
            try:
                cursor.execute("SELECT current_setting('app.current_tenant_id', true)")
                status["current_tenant"] = cursor.fetchone()[0]
            except Exception as e:
                status["errors"].append(f"Error getting current tenant: {str(e)}")
                
            # Check if RLS functions exist
            for func_name in ["get_tenant_context", "set_tenant_context"]:
                cursor.execute("""
                    SELECT count(*) FROM pg_proc p 
                    JOIN pg_namespace n ON p.pronamespace = n.oid 
                    WHERE p.proname = %s AND n.nspname = 'public'
                """, [func_name])
                status["rls_functions"][func_name] = cursor.fetchone()[0] > 0
                
            # Get tables with RLS enabled
            cursor.execute("""
                SELECT
                    n.nspname AS schema,
                    c.relname AS table,
                    (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid) AS policy_count
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE c.relrowsecurity = true
                AND n.nspname NOT IN ('pg_catalog', 'information_schema')
                ORDER BY n.nspname, c.relname
            """)
            
            tables = cursor.fetchall()
            for schema, table, policy_count in tables:
                status["tables_with_rls"].append({
                    "schema": schema,
                    "table": table,
                    "policy_count": policy_count
                })
                
            # Run quick RLS test
            try:
                # Create test table if it doesn't exist
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS rls_debug_test (
                        id SERIAL PRIMARY KEY,
                        tenant_id UUID NOT NULL,
                        data TEXT,
                        created_at TIMESTAMP DEFAULT NOW()
                    )
                """)
                
                # Enable RLS on the test table
                cursor.execute("ALTER TABLE rls_debug_test ENABLE ROW LEVEL SECURITY")
                
                # Create default policy
                cursor.execute("""
                    DROP POLICY IF EXISTS rls_debug_policy ON rls_debug_test;
                    CREATE POLICY rls_debug_policy ON rls_debug_test
                        USING (tenant_id::text = get_tenant_context() OR get_tenant_context() = 'unset')
                """)
                
                # Insert test data
                tenant1 = str(uuid.uuid4())
                tenant2 = str(uuid.uuid4())
                
                cursor.execute("TRUNCATE rls_debug_test")
                cursor.execute("INSERT INTO rls_debug_test (tenant_id, data) VALUES (%s, %s)", [tenant1, "Tenant 1 data"])
                cursor.execute("INSERT INTO rls_debug_test (tenant_id, data) VALUES (%s, %s)", [tenant2, "Tenant 2 data"])
                
                # Test with tenant1
                cursor.execute("SET app.current_tenant_id = %s", [tenant1])
                cursor.execute("SELECT COUNT(*) FROM rls_debug_test")
                tenant1_count = cursor.fetchone()[0]
                
                # Test with tenant2
                cursor.execute("SET app.current_tenant_id = %s", [tenant2])
                cursor.execute("SELECT COUNT(*) FROM rls_debug_test")
                tenant2_count = cursor.fetchone()[0]
                
                # Test with unset
                cursor.execute("SET app.current_tenant_id = 'unset'")
                cursor.execute("SELECT COUNT(*) FROM rls_debug_test")
                unset_count = cursor.fetchone()[0]
                
                status["test_results"] = {
                    "tenant1_uuid": tenant1,
                    "tenant1_visible_rows": tenant1_count,
                    "tenant2_uuid": tenant2,
                    "tenant2_visible_rows": tenant2_count,
                    "unset_visible_rows": unset_count,
                    "working_correctly": tenant1_count == 1 and tenant2_count == 1 and unset_count == 2,
                }
            except Exception as e:
                status["errors"].append(f"Error running test: {str(e)}")
                
    except Exception as e:
        status["errors"].append(f"Database error: {str(e)}")
        
    return status

@csrf_exempt
@require_http_methods(["GET", "POST"])
def rls_debug_view(request):
    """
    API endpoint for debugging RLS configuration and testing.
    GET: Returns current RLS status 
    POST: Sets tenant context and returns updated status
    """
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            tenant_id = data.get("tenant_id")
            
            if tenant_id:
                with connection.cursor() as cursor:
                    cursor.execute("SET app.current_tenant_id = %s", [tenant_id])
                    logger.info(f"Set tenant context to {tenant_id} for debugging")
            elif "reset" in data and data["reset"]:
                with connection.cursor() as cursor:
                    cursor.execute("SET app.current_tenant_id = 'unset'")
                    logger.info("Reset tenant context to 'unset' for debugging")
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
    
    # Get current status
    status = debug_rls_status()
    return JsonResponse(status)

def fix_rls_configuration():
    """Attempt to fix common RLS configuration issues."""
    results = {
        "fixed_issues": [],
        "errors": []
    }
    
    try:
        with connection.cursor() as cursor:
            # 1. Ensure parameter exists
            try:
                cursor.execute("""
                    DO $$
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM pg_settings 
                            WHERE name = 'app.current_tenant_id'
                        ) THEN
                            EXECUTE 'ALTER DATABASE ' || current_database() || ' SET app.current_tenant_id = ''unset''';
                        END IF;
                    END
                    $$;
                """)
                results["fixed_issues"].append("Ensured app.current_tenant_id parameter exists")
            except Exception as e:
                results["errors"].append(f"Failed to ensure parameter exists: {str(e)}")
            
            # 2. Fix RLS functions
            try:
                # Create or replace the get_tenant_context function
                cursor.execute("""
                    CREATE OR REPLACE FUNCTION get_tenant_context()
                    RETURNS text AS $$
                    BEGIN
                        -- First try app.current_tenant_id
                        BEGIN
                            RETURN current_setting('app.current_tenant_id', true);
                        EXCEPTION WHEN undefined_object THEN
                            -- If parameter doesn't exist, use the alternative
                            BEGIN
                                RETURN current_setting('app.current_tenant', true);
                            EXCEPTION WHEN undefined_object THEN
                                -- Default to 'unset' if neither parameter exists
                                RETURN 'unset';
                            END;
                        END;
                    END;
                    $$ LANGUAGE plpgsql;
                """)
                
                # Create or replace the set_tenant_context function
                cursor.execute("""
                    CREATE OR REPLACE FUNCTION set_tenant_context(tenant text)
                    RETURNS text AS $$
                    BEGIN
                        -- Set the tenant context
                        SET app.current_tenant_id = tenant;
                        
                        -- Return the current context
                        RETURN get_tenant_context();
                    EXCEPTION WHEN OTHERS THEN
                        RAISE NOTICE 'Error setting tenant context: %', SQLERRM;
                        RETURN NULL;
                    END;
                    $$ LANGUAGE plpgsql;
                """)
                
                results["fixed_issues"].append("Fixed RLS helper functions")
            except Exception as e:
                results["errors"].append(f"Failed to fix RLS functions: {str(e)}")
                
            # 3. Check and fix the test table
            try:
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS rls_test (
                        id SERIAL PRIMARY KEY,
                        tenant_id UUID NOT NULL,
                        data TEXT,
                        created_at TIMESTAMP DEFAULT NOW()
                    )
                """)
                
                # Enable RLS on the test table
                cursor.execute("ALTER TABLE rls_test ENABLE ROW LEVEL SECURITY")
                
                # Create default policy
                cursor.execute("""
                    DROP POLICY IF EXISTS tenant_isolation_policy ON rls_test;
                    CREATE POLICY tenant_isolation_policy ON rls_test
                        USING (tenant_id::text = get_tenant_context() OR get_tenant_context() = 'unset')
                """)
                
                results["fixed_issues"].append("Fixed RLS test table configuration")
            except Exception as e:
                results["errors"].append(f"Failed to fix test table: {str(e)}")
                
    except Exception as e:
        results["errors"].append(f"General error: {str(e)}")
        
    return results

@csrf_exempt
@require_http_methods(["POST"])
def fix_rls_view(request):
    """API endpoint to fix common RLS configuration issues."""
    results = fix_rls_configuration()
    return JsonResponse(results) 