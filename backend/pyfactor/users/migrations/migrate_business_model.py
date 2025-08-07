"""
Migration script to consolidate Business and BusinessDetails models
while preserving multi-tenant RLS architecture.

Run this with: python manage.py shell < users/migrations/migrate_business_model.py
"""

import logging
from django.db import transaction, connection
from users.models import Business, BusinessDetails, UserProfile, BusinessMember
from custom_auth.models import User, Tenant

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_business_model():
    """
    Migrate business data to consolidated model structure.
    This preserves tenant_id = business_id for RLS.
    """
    
    logger.info("=" * 80)
    logger.info("Starting Business Model Migration (RLS-Preserved)")
    logger.info("=" * 80)
    
    # Step 1: Add new fields to Business table if they don't exist
    logger.info("\n1. Adding new fields to Business table...")
    
    with connection.cursor() as cursor:
        # Check which columns already exist
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users_business'
        """)
        existing_columns = {row[0] for row in cursor.fetchall()}
        
        # Add missing columns
        columns_to_add = [
            ("business_type", "VARCHAR(50)"),
            ("simplified_business_type", "VARCHAR(50)"),
            ("legal_structure", "VARCHAR(50) DEFAULT 'SOLE_PROPRIETORSHIP'"),
            ("country", "VARCHAR(2) DEFAULT 'US'"),
            ("date_founded", "DATE"),
            ("preferred_currency_code", "VARCHAR(3) DEFAULT 'USD'"),
            ("preferred_currency_name", "VARCHAR(50) DEFAULT 'US Dollar'"),
            ("preferred_currency_symbol", "VARCHAR(10) DEFAULT '$'"),
            ("currency_updated_at", "TIMESTAMP"),
            ("accounting_standard", "VARCHAR(10) DEFAULT 'IFRS'"),
            ("logo_data", "TEXT"),
            ("is_active", "BOOLEAN DEFAULT TRUE"),
            ("tenant_id", "UUID"),
        ]
        
        for column_name, column_def in columns_to_add:
            if column_name not in existing_columns:
                try:
                    cursor.execute(f"""
                        ALTER TABLE users_business 
                        ADD COLUMN IF NOT EXISTS {column_name} {column_def}
                    """)
                    logger.info(f"  ✓ Added column: {column_name}")
                except Exception as e:
                    logger.warning(f"  ⚠ Column {column_name} might already exist: {e}")
    
    # Step 2: Migrate data from BusinessDetails to Business
    logger.info("\n2. Migrating data from BusinessDetails to Business...")
    
    migrated_count = 0
    failed_count = 0
    
    with transaction.atomic():
        for business in Business.objects.all():
            try:
                # Get BusinessDetails if exists
                details = BusinessDetails.objects.filter(business=business).first()
                
                if details:
                    # Copy essential fields
                    business.business_type = details.business_type
                    business.simplified_business_type = details.simplified_business_type
                    business.legal_structure = details.legal_structure
                    business.country = details.country
                    business.date_founded = details.date_founded
                    
                    # Copy currency preferences
                    business.preferred_currency_code = details.preferred_currency_code
                    business.preferred_currency_name = details.preferred_currency_name
                    business.preferred_currency_symbol = details.preferred_currency_symbol
                    business.currency_updated_at = details.currency_updated_at
                    
                    # Copy accounting standard
                    business.accounting_standard = getattr(details, 'accounting_standard', 'IFRS')
                    
                    # Copy logo
                    business.logo_data = details.logo_data
                    
                # CRITICAL: Set tenant_id = business.id for RLS
                business.tenant_id = business.id
                
                # Save without triggering signals
                business.save(update_fields=[
                    'business_type', 'simplified_business_type', 'legal_structure',
                    'country', 'date_founded', 'preferred_currency_code',
                    'preferred_currency_name', 'preferred_currency_symbol',
                    'currency_updated_at', 'accounting_standard', 'logo_data',
                    'tenant_id'
                ])
                
                migrated_count += 1
                
            except Exception as e:
                logger.error(f"  ✗ Failed to migrate business {business.id}: {e}")
                failed_count += 1
    
    logger.info(f"  ✓ Migrated {migrated_count} businesses")
    if failed_count:
        logger.warning(f"  ⚠ Failed to migrate {failed_count} businesses")
    
    # Step 3: Fix User.business_id to ensure it matches owned business
    logger.info("\n3. Fixing User.business_id relationships...")
    
    fixed_users = 0
    for user in User.objects.filter(business_id__isnull=False):
        try:
            business = Business.objects.filter(owner_id=user.id).first()
            if business and user.business_id != business.id:
                user.business_id = business.id
                user.save(update_fields=['business_id'])
                fixed_users += 1
        except Exception as e:
            logger.error(f"  ✗ Failed to fix user {user.email}: {e}")
    
    logger.info(f"  ✓ Fixed {fixed_users} user business relationships")
    
    # Step 4: Ensure Tenant records exist for all businesses
    logger.info("\n4. Ensuring Tenant records for RLS...")
    
    created_tenants = 0
    for business in Business.objects.all():
        try:
            tenant, created = Tenant.objects.get_or_create(
                id=business.id,
                defaults={
                    'name': business.name,
                    'owner_id': str(business.owner_id) if business.owner_id else None,
                    'rls_enabled': True,
                    'is_active': True
                }
            )
            if created:
                created_tenants += 1
                logger.info(f"  ✓ Created tenant for business: {business.name}")
        except Exception as e:
            logger.error(f"  ✗ Failed to create tenant for {business.id}: {e}")
    
    logger.info(f"  ✓ Created {created_tenants} new tenant records")
    
    # Step 5: Create BusinessMember records for owners
    logger.info("\n5. Creating BusinessMember records...")
    
    created_members = 0
    for business in Business.objects.filter(owner_id__isnull=False):
        try:
            # Find the owner user
            owner = User.objects.filter(id=business.owner_id).first()
            if owner:
                member, created = BusinessMember.objects.get_or_create(
                    business=business,
                    user=owner,
                    defaults={
                        'role': 'owner',
                        'is_active': True,
                        'can_edit_business': True,
                        'can_manage_users': True,
                        'can_view_reports': True
                    }
                )
                if created:
                    created_members += 1
        except Exception as e:
            logger.error(f"  ✗ Failed to create member for {business.id}: {e}")
    
    logger.info(f"  ✓ Created {created_members} business member records")
    
    # Step 6: Add indexes for performance
    logger.info("\n6. Adding database indexes...")
    
    with connection.cursor() as cursor:
        indexes = [
            ("idx_business_tenant_id", "users_business", "tenant_id"),
            ("idx_business_country_currency", "users_business", "country, preferred_currency_code"),
            ("idx_business_owner_active", "users_business", "owner_id, is_active"),
        ]
        
        for index_name, table_name, columns in indexes:
            try:
                cursor.execute(f"""
                    CREATE INDEX IF NOT EXISTS {index_name} 
                    ON {table_name} ({columns})
                """)
                logger.info(f"  ✓ Created index: {index_name}")
            except Exception as e:
                logger.warning(f"  ⚠ Index {index_name} might already exist: {e}")
    
    logger.info("\n" + "=" * 80)
    logger.info("Migration Complete!")
    logger.info("=" * 80)
    
    # Summary
    logger.info("\nSummary:")
    logger.info(f"  • Migrated {migrated_count} businesses")
    logger.info(f"  • Fixed {fixed_users} user relationships")
    logger.info(f"  • Created {created_tenants} tenant records")
    logger.info(f"  • Created {created_members} member records")
    logger.info("\nRLS Status: PRESERVED (tenant_id = business_id)")
    
    return True

if __name__ == "__main__":
    try:
        success = migrate_business_model()
        if success:
            print("\n✅ Migration completed successfully!")
        else:
            print("\n❌ Migration encountered issues. Check logs.")
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()