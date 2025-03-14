import logging
from django.core.management.base import BaseCommand, CommandError
from custom_auth.models import Tenant
from custom_auth.tasks import migrate_tenant_schema

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Migrate a specific tenant schema'

    def add_arguments(self, parser):
        parser.add_argument('tenant_id', type=str, help='ID of the tenant to migrate')
        parser.add_argument('--async', action='store_true', help='Run migration asynchronously using Celery')

    def handle(self, *args, **options):
        tenant_id = options['tenant_id']
        async_mode = options.get('async', False)
        
        try:
            # Validate tenant exists
            try:
                tenant = Tenant.objects.get(id=tenant_id)
            except Tenant.DoesNotExist:
                raise CommandError(f"Tenant with ID {tenant_id} does not exist")
            
            self.stdout.write(self.style.SUCCESS(f"Found tenant: {tenant.name} (Schema: {tenant.schema_name})"))
            
            if async_mode:
                # Run migration asynchronously using Celery
                self.stdout.write(self.style.WARNING(f"Starting async migration for tenant {tenant_id}..."))
                task = migrate_tenant_schema.delay(tenant_id)
                self.stdout.write(self.style.SUCCESS(f"Migration task started with ID: {task.id}"))
                self.stdout.write(self.style.WARNING("Check celery logs for migration progress"))
            else:
                # Run migration synchronously
                self.stdout.write(self.style.WARNING(f"Starting migration for tenant {tenant_id}..."))
                result = migrate_tenant_schema(tenant_id)
                if result:
                    self.stdout.write(self.style.SUCCESS(f"Migration completed successfully for tenant {tenant_id}"))
                else:
                    self.stdout.write(self.style.ERROR(f"Migration failed for tenant {tenant_id}"))
        
        except Exception as e:
            logger.error(f"Error migrating tenant {tenant_id}: {str(e)}", exc_info=True)
            raise CommandError(f"Error migrating tenant: {str(e)}")