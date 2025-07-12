#!/usr/bin/env python
"""
Startup script to ensure hr_locationlog table exists
Add this to your deployment startup sequence
"""

import os
import sys
import django
from django.db import connection
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add the parent directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def ensure_locationlog_table():
    """Ensure hr_locationlog table exists on startup"""
    logger.info("🔍 Checking for hr_locationlog table...")
    
    with connection.cursor() as cursor:
        # Check if table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'hr_locationlog'
            );
        """)
        exists = cursor.fetchone()[0]
        
        if exists:
            logger.info("✅ hr_locationlog table exists")
            return True
        
        logger.warning("⚠️  hr_locationlog table missing - creating it now...")
        
        # Create the table with minimal structure
        # Foreign keys will be added by migrations when possible
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS hr_locationlog (
                tenant_id UUID,
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                business_id UUID,
                location_type VARCHAR(15) NOT NULL,
                latitude DECIMAL(9,6),
                longitude DECIMAL(9,6),
                accuracy DECIMAL(10,2),
                street_address VARCHAR(255),
                city VARCHAR(100),
                state VARCHAR(50),
                postal_code VARCHAR(20),
                country VARCHAR(100),
                formatted_address TEXT,
                device_type VARCHAR(50),
                device_id VARCHAR(255),
                ip_address INET,
                user_agent TEXT,
                is_verified BOOLEAN DEFAULT TRUE,
                verification_method VARCHAR(50),
                logged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                employee_id UUID NOT NULL,
                timesheet_entry_id UUID,
                CONSTRAINT location_type_check CHECK (location_type IN ('CLOCK_IN', 'CLOCK_OUT', 'RANDOM_CHECK', 'BREAK_START', 'BREAK_END'))
            );
            
            CREATE INDEX IF NOT EXISTS hr_location_employe_8e7e91_idx ON hr_locationlog (employee_id, logged_at);
            CREATE INDEX IF NOT EXISTS hr_location_busines_e9e814_idx ON hr_locationlog (business_id, location_type, logged_at);
            CREATE INDEX IF NOT EXISTS idx_hr_locationlog_tenant_id ON hr_locationlog (tenant_id);
        """)
        
        logger.info("✅ hr_locationlog table created successfully")
        return True

if __name__ == "__main__":
    try:
        ensure_locationlog_table()
    except Exception as e:
        logger.error(f"❌ Failed to ensure hr_locationlog table: {str(e)}")
        # Don't fail the startup - just log the error
        pass