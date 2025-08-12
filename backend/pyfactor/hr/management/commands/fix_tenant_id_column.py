# Management command to fix tenant_id column issue in hr_employee table
from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction as db_transaction
from pyfactor.logging_config import get_logger
import traceback

logger = get_logger()


class Command(BaseCommand):
    help = 'Fix tenant_id column issue in hr_employee table'

    def handle(self, *args, **options):
        logger.info('🚀 [Fix Tenant ID] === START ===')
        
        try:
            with connection.cursor() as cursor:
                # Check if the column exists
                logger.info('🔍 [Fix Tenant ID] Checking if tenant_id column exists...')
                cursor.execute("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'hr_employee' 
                    AND column_name = 'tenant_id';
                """)
                
                result = cursor.fetchone()
                
                if result:
                    logger.info('✅ [Fix Tenant ID] Column tenant_id already exists')
                    
                    # Update any null tenant_id values with business_id
                    logger.info('🔄 [Fix Tenant ID] Updating null tenant_id values...')
                    cursor.execute("""
                        UPDATE hr_employee 
                        SET tenant_id = business_id 
                        WHERE tenant_id IS NULL 
                        AND business_id IS NOT NULL;
                    """)
                    
                    updated_count = cursor.rowcount
                    logger.info(f'✅ [Fix Tenant ID] Updated {updated_count} records')
                    
                else:
                    logger.info('⚠️ [Fix Tenant ID] Column tenant_id does not exist, creating it...')
                    
                    with db_transaction.atomic():
                        # Add the column
                        cursor.execute("""
                            ALTER TABLE hr_employee 
                            ADD COLUMN tenant_id UUID;
                        """)
                        logger.info('✅ [Fix Tenant ID] Added tenant_id column')
                        
                        # Create index
                        cursor.execute("""
                            CREATE INDEX IF NOT EXISTS hr_employee_tenant_id_idx 
                            ON hr_employee(tenant_id);
                        """)
                        logger.info('✅ [Fix Tenant ID] Created index on tenant_id')
                        
                        # Populate with business_id values
                        cursor.execute("""
                            UPDATE hr_employee 
                            SET tenant_id = business_id 
                            WHERE business_id IS NOT NULL;
                        """)
                        
                        updated_count = cursor.rowcount
                        logger.info(f'✅ [Fix Tenant ID] Populated {updated_count} records with tenant_id')
                
                # Verify the fix
                logger.info('🔍 [Fix Tenant ID] Verifying the fix...')
                cursor.execute("""
                    SELECT COUNT(*) as total,
                           COUNT(tenant_id) as with_tenant_id,
                           COUNT(CASE WHEN tenant_id IS NULL AND business_id IS NOT NULL THEN 1 END) as missing_tenant_id
                    FROM hr_employee;
                """)
                
                stats = cursor.fetchone()
                logger.info(f'📊 [Fix Tenant ID] Stats - Total: {stats[0]}, With tenant_id: {stats[1]}, Missing tenant_id: {stats[2]}')
                
                if stats[2] > 0:
                    logger.warning(f'⚠️ [Fix Tenant ID] {stats[2]} records still missing tenant_id')
                else:
                    logger.info('✅ [Fix Tenant ID] All records have tenant_id')
                
                self.stdout.write(self.style.SUCCESS('Successfully fixed tenant_id column'))
                
        except Exception as e:
            logger.error(f'❌ [Fix Tenant ID] Error: {str(e)}')
            logger.error(f'❌ [Fix Tenant ID] Traceback:\n{traceback.format_exc()}')
            raise CommandError(f'Failed to fix tenant_id column: {str(e)}')
        
        logger.info('🏁 [Fix Tenant ID] === END ===')