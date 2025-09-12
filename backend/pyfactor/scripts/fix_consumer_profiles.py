#!/usr/bin/env python3
"""
Fix Consumer Profiles Table
============================
Creates the missing marketplace_consumer_profiles table
"""

import os
import sys
import django

# Add the project directory to the Python path
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection
import logging

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

def create_consumer_profiles_table():
    """Create the missing consumer profiles table"""
    
    logger.info("🚨 CREATING CONSUMER PROFILES TABLE...")
    
    with connection.cursor() as cursor:
        # Check if table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'marketplace_consumer_profiles'
            );
        """)
        
        if cursor.fetchone()[0]:
            logger.info("✅ Table marketplace_consumer_profiles already exists")
            return
        
        # Create the table
        logger.info("📦 Creating marketplace_consumer_profiles table...")
        cursor.execute("""
            CREATE TABLE marketplace_consumer_profiles (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id INTEGER REFERENCES custom_auth_user(id) ON DELETE CASCADE,
                default_delivery_address JSONB,
                delivery_addresses JSONB DEFAULT '[]'::jsonb,
                current_latitude DECIMAL(10, 8),
                current_longitude DECIMAL(11, 8),
                current_city VARCHAR(100),
                current_country VARCHAR(2),
                preferred_categories JSONB DEFAULT '[]'::jsonb,
                favorite_businesses JSONB DEFAULT '[]'::jsonb,
                recent_searches JSONB DEFAULT '[]'::jsonb,
                total_orders INTEGER DEFAULT 0,
                total_spent DECIMAL(10, 2) DEFAULT 0,
                average_order_value DECIMAL(10, 2) DEFAULT 0,
                consumer_rating DECIMAL(2, 1) DEFAULT 5.0,
                total_ratings_received INTEGER DEFAULT 0,
                preferred_payment_method VARCHAR(50),
                notification_preferences JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_order_at TIMESTAMP
            );
        """)
        
        # Create indexes
        cursor.execute("""
            CREATE INDEX idx_consumer_profiles_user 
            ON marketplace_consumer_profiles(user_id);
        """)
        
        cursor.execute("""
            CREATE INDEX idx_consumer_profiles_location 
            ON marketplace_consumer_profiles(current_city, current_country);
        """)
        
        logger.info("✅ Table marketplace_consumer_profiles created successfully!")
        
        # Also check for the correct table name
        cursor.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_name LIKE '%consumer%profile%'
        """)
        tables = [row[0] for row in cursor.fetchall()]
        logger.info(f"Found consumer profile tables: {tables}")

if __name__ == "__main__":
    try:
        create_consumer_profiles_table()
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)