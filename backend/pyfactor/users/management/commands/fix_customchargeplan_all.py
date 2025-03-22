import logging
from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Fix missing columns in inventory_customchargeplan table'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting to fix inventory_customchargeplan table...'))
        
        # Fix the schemas using direct SQL
        self.fix_schemas()
        
        self.stdout.write(self.style.SUCCESS('Fixed inventory_customchargeplan table successfully!'))
    
    def fix_schemas(self):
        """Add missing columns to inventory_customchargeplan table across all schemas"""
        self.stdout.write("Fixing inventory_customchargeplan table across all schemas...")
        
        with connection.cursor() as cursor:
            # Get all tenant schemas
            cursor.execute("""
            SELECT schema_name 
            FROM information_schema.schemata 
            WHERE schema_name LIKE 'tenant_%' 
               OR schema_name = 'public';
            """)
            
            schemas = [row[0] for row in cursor.fetchall()]
            self.stdout.write(f"Found {len(schemas)} schemas to process")
            
            for schema in schemas:
                self.stdout.write(f"Processing schema: {schema}")
                
                # Start a transaction
                cursor.execute("BEGIN;")
                
                try:
                    # Set search path to current schema
                    cursor.execute(f"SET search_path TO {schema}, public;")
                    
                    # Check if the table exists in this schema
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
                        self.stdout.write(f"Table 'inventory_customchargeplan' does not exist in schema {schema}, creating it...")
                        
                        # Create the table with all required columns
                        cursor.execute("""
                        CREATE TABLE inventory_customchargeplan (
                            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                            name VARCHAR(255) NOT NULL,
                            quantity INTEGER NOT NULL,
                            unit VARCHAR(50) NOT NULL DEFAULT 'each',
                            custom_unit VARCHAR(50) NULL,
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
                        
                        self.stdout.write(self.style.SUCCESS(f"Table 'inventory_customchargeplan' created successfully in schema {schema}!"))
                    else:
                        # Check if 'unit' column exists
                        cursor.execute("""
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_schema = current_schema()
                        AND table_name = 'inventory_customchargeplan' 
                        AND column_name = 'unit';
                        """)
                        
                        unit_column_exists = cursor.fetchone() is not None
                        
                        if not unit_column_exists:
                            self.stdout.write(f"Column 'unit' does not exist in schema {schema}, adding it...")
                            
                            # Add the missing column with a default value
                            cursor.execute("""
                            ALTER TABLE inventory_customchargeplan 
                            ADD COLUMN unit VARCHAR(50) DEFAULT 'each' NOT NULL;
                            """)
                            
                            self.stdout.write(self.style.SUCCESS(f"Column 'unit' added successfully in schema {schema}!"))
                        
                        # Check if 'custom_unit' column exists
                        cursor.execute("""
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_schema = current_schema()
                        AND table_name = 'inventory_customchargeplan' 
                        AND column_name = 'custom_unit';
                        """)
                        
                        custom_unit_column_exists = cursor.fetchone() is not None
                        
                        if not custom_unit_column_exists:
                            self.stdout.write(f"Column 'custom_unit' does not exist in schema {schema}, adding it...")
                            
                            # Add the missing column
                            cursor.execute("""
                            ALTER TABLE inventory_customchargeplan 
                            ADD COLUMN custom_unit VARCHAR(50) NULL;
                            """)
                            
                            self.stdout.write(self.style.SUCCESS(f"Column 'custom_unit' added successfully in schema {schema}!"))
                    
                    # Commit the transaction for this schema
                    cursor.execute("COMMIT;")
                    
                except Exception as e:
                    # Rollback the transaction if there's an error
                    cursor.execute("ROLLBACK;")
                    self.stderr.write(self.style.ERROR(f"Error fixing inventory_customchargeplan table in schema {schema}: {e}"))
                    self.stderr.write(self.style.ERROR("Continuing with next schema..."))
                    
                    # Don't raise the exception, just continue with the next schema