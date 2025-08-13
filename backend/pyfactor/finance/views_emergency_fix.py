"""
Emergency endpoint to fix database schema issues.
This should be removed after fixing the issue.
"""

from django.http import JsonResponse
from django.db import connection
from django.views.decorators.csrf import csrf_exempt
import logging

logger = logging.getLogger(__name__)

@csrf_exempt
def emergency_fix_schema(request):
    """Emergency endpoint to add missing columns."""
    
    if request.method != 'POST':
        return JsonResponse({'error': 'POST only'}, status=405)
    
    # Check for a secret key to prevent abuse
    secret = request.POST.get('secret', request.GET.get('secret'))
    if secret != 'fix-pos-emergency-2024':
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    
    results = []
    
    try:
        with connection.cursor() as cursor:
            # Fix finance_journalentryline
            tables_to_fix = [
                'finance_journalentryline',
                'finance_journalentry',
                'finance_generalledgerentry',
                'finance_chartofaccount',
            ]
            
            for table in tables_to_fix:
                try:
                    # Check if table exists
                    cursor.execute(f"""
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_name = '{table}'
                        );
                    """)
                    
                    if not cursor.fetchone()[0]:
                        results.append(f"{table}: Table doesn't exist")
                        continue
                    
                    # Add tenant_id if missing
                    cursor.execute(f"""
                        DO $$ 
                        BEGIN
                            ALTER TABLE {table} ADD COLUMN tenant_id uuid;
                        EXCEPTION
                            WHEN duplicate_column THEN NULL;
                        END $$;
                    """)
                    
                    # Add business_id if missing
                    cursor.execute(f"""
                        DO $$ 
                        BEGIN
                            ALTER TABLE {table} ADD COLUMN business_id uuid;
                        EXCEPTION
                            WHEN duplicate_column THEN NULL;
                        END $$;
                    """)
                    
                    # Update business_id from tenant_id
                    cursor.execute(f"""
                        UPDATE {table} 
                        SET business_id = tenant_id 
                        WHERE business_id IS NULL AND tenant_id IS NOT NULL;
                    """)
                    
                    results.append(f"{table}: Fixed successfully")
                    
                except Exception as e:
                    results.append(f"{table}: Error - {str(e)}")
        
        return JsonResponse({
            'success': True,
            'results': results,
            'message': 'Schema fix completed'
        })
        
    except Exception as e:
        logger.error(f"Emergency fix failed: {e}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)