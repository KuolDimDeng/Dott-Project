from django.core.management.base import BaseCommand
from django.db import connection
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Create vehicles table if it does not exist'

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            # Check if the table exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'jobs_vehicle'
                );
            """)
            
            table_exists = cursor.fetchone()[0]
            
            if not table_exists:
                self.stdout.write(self.style.WARNING('Vehicles table does not exist. Creating...'))
                
                # Create the table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS jobs_vehicle (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        registration_number VARCHAR(50) NOT NULL,
                        vehicle_type VARCHAR(20) NOT NULL,
                        make VARCHAR(100) NOT NULL,
                        model VARCHAR(100) NOT NULL,
                        year INTEGER NOT NULL,
                        color VARCHAR(50),
                        vin VARCHAR(50),
                        fuel_type VARCHAR(20) NOT NULL,
                        mileage INTEGER DEFAULT 0,
                        license_plate VARCHAR(50),
                        status VARCHAR(20) NOT NULL DEFAULT 'active',
                        is_available BOOLEAN DEFAULT true,
                        assigned_to_id UUID REFERENCES hr_employee(id) ON DELETE SET NULL,
                        purchase_date DATE,
                        purchase_price DECIMAL(10,2),
                        insurance_policy VARCHAR(100),
                        insurance_expiry DATE,
                        last_service_date DATE,
                        next_service_date DATE,
                        service_interval_miles INTEGER DEFAULT 5000,
                        notes TEXT,
                        photo VARCHAR(200),
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        created_by_id UUID REFERENCES users_user(id) ON DELETE SET NULL,
                        updated_by_id UUID REFERENCES users_user(id) ON DELETE SET NULL,
                        tenant_id UUID REFERENCES users_businessprofile(id) ON DELETE CASCADE,
                        UNIQUE (registration_number, tenant_id)
                    );
                """)
                
                # Create indexes
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_jobs_vehicle_tenant ON jobs_vehicle(tenant_id);")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_jobs_vehicle_status ON jobs_vehicle(status);")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_jobs_vehicle_assigned ON jobs_vehicle(assigned_to_id);")
                
                self.stdout.write(self.style.SUCCESS('Successfully created vehicles table'))
            else:
                self.stdout.write(self.style.SUCCESS('Vehicles table already exists'))