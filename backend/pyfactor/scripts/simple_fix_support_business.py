#!/usr/bin/env python
"""
Simple script to update support@dottapps.com business name and type
"""

import os
import sys
import django

# Add the parent directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection

def main():
    """Update support user's existing business"""
    
    try:
        with connection.cursor() as cursor:
            # First, let's see what the business record looks like
            cursor.execute("""
                SELECT id, name, business_type, simplified_business_type 
                FROM users_business 
                WHERE id = '00000000-0000-0000-0000-0000000000fa'
            """)
            result = cursor.fetchone()
            
            if result:
                print(f"✅ Found existing business:")
                print(f"   ID: {result[0]}")
                print(f"   Current Name: {result[1]}")
                print(f"   Current Type: {result[2]}")
                print(f"   Current Simplified Type: {result[3]}")
                
                # Update just the essential fields
                cursor.execute("""
                    UPDATE users_business 
                    SET name = %s,
                        business_type = %s,
                        simplified_business_type = %s,
                        updated_at = NOW()
                    WHERE id = '00000000-0000-0000-0000-0000000000fa'
                """, [
                    'Dott Restaurant & Cafe',
                    'RESTAURANT_CAFE',
                    'RESTAURANT'
                ])
                
                print(f"\n✅ Successfully updated business!")
                print(f"   New Name: Dott Restaurant & Cafe")
                print(f"   New Type: RESTAURANT_CAFE")
                print(f"   New Simplified Type: RESTAURANT")
                print(f"\n🎉 The support@dottapps.com account is now recognized as a restaurant business!")
                print(f"   - Gets free POS, Inventory, and Menu features")
                print(f"   - Has unrestricted access as a test account")
                
            else:
                print(f"❌ No business found with ID 00000000-0000-0000-0000-0000000000fa")
                print(f"   This means the support user doesn't have a business yet.")
                print(f"   You may need to log in as support@dottapps.com and complete onboarding first.")
                
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == '__main__':
    print("🍴 Updating support@dottapps.com Business Name and Type...")
    print("=" * 60)
    main()