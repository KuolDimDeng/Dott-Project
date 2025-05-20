import logging
from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Fix missing unit column in inventory_customchargeplan table'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting to fix inventory_customchargeplan table...'))
        
        # Add missing 'unit' column to inventory_customchargeplan table
        self.add_unit_column_to_customchargeplan()
        
        self.stdout.write(self.style.SUCCESS('Fixed inventory_customchargeplan table successfully!'))
    
    def add_unit_column_to_customchargeplan(self):
        """Add missing 'unit' column to inventory_customchargeplan table"""
        self.stdout.write("Checking and adding 'unit' column to inventory_customchargeplan table...")
        
        with connection.cursor() as cursor:
            # Start a transaction
            cursor.execute("BEGIN;")
            
            try:
                # First check if the table exists
                cursor.execute("""
                SELECT EXISTS (
                   SELECT 1
                   FROM information_schema.tables 
                   WHERE table_schema = current_schema()
                   AND table_name = 'inventory_customchargeplan'
                );
                """)
                
                table_exists = cursor.fetchone()[0]
                
                if not table_exists:
                    self.stdout.write("Table 'inventory_customchargeplan' does not exist, creating it...")
                    
                    # Create the table with all required columns
                    cursor.execute("""
                    CREATE TABLE inventory_customchargeplan (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        name VARCHAR(255) NOT NULL,
                        quantity INTEGER NOT NULL,
                        unit VARCHAR(50) NOT NULL DEFAULT 'each',
                        price NUMERIC(12, 2) NOT NULL,
                        product_id UUID NOT NULL,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        CONSTRAINT fk_product
                            FOREIGN KEY(product_id) 
                            REFERENCES inventory_product(id)
                            ON DELETE CASCADE
                    );
                    """)
                    
                    self.stdout.write(self.style.SUCCESS("Table 'inventory_customchargeplan' created successfully!"))
                else:
                    # Check if the column already exists
                    cursor.execute("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_schema = current_schema()
                    AND table_name = 'inventory_customchargeplan' 
                    AND column_name = 'unit';
                    """)
                    
                    column_exists = cursor.fetchone()
                    
                    if not column_exists:
                        self.stdout.write("Column 'unit' does not exist, adding it...")
                        
                        # Add the missing column with a default value
                        cursor.execute("""
                        ALTER TABLE inventory_customchargeplan 
                        ADD COLUMN unit VARCHAR(50) DEFAULT 'each' NOT NULL;
                        """)
                        
                        self.stdout.write(self.style.SUCCESS("Column 'unit' added successfully!"))
                    else:
                        self.stdout.write("Column 'unit' already exists, skipping...")
                
                # Commit the transaction
                cursor.execute("COMMIT;")
                
            except Exception as e:
                # Rollback the transaction if there's an error
                cursor.execute("ROLLBACK;")
                self.stderr.write(self.style.ERROR(f"Error fixing inventory_customchargeplan table: {e}"))
                raise