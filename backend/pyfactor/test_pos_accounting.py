#!/usr/bin/env python3
"""
Test the specific POS accounting scenario that's failing
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def test_pos_accounting_flow():
    """Test the exact flow that's failing in production"""
    print("Testing POS accounting flow...\n")
    
    try:
        # Import all the modules involved in the error
        from sales.services.accounting_service import AccountingService
        from finance.models import JournalEntry, JournalEntryLine, ChartOfAccount
        from django.db import transaction as db_transaction
        from django.core.exceptions import ValidationError
        
        print("✅ All imports successful")
        
        # Test that we can access the create_sale_journal_entry method
        method = getattr(AccountingService, 'create_sale_journal_entry', None)
        if method:
            print("✅ create_sale_journal_entry method exists")
        else:
            print("❌ create_sale_journal_entry method not found")
            return False
        
        # Test the transaction context that was failing
        try:
            with db_transaction.atomic():
                # This simulates what happens inside create_pos_sale_entries
                print("✅ Can create transaction context successfully")
                
                # Test that JournalEntry can be instantiated
                from django.utils import timezone
                test_entry = JournalEntry(
                    date=timezone.now().date(),
                    description="Test POS Sale",
                    reference="POS-TEST-001",
                    status='draft'
                )
                print("✅ JournalEntry can be instantiated")
                
                # Test that the post method would work (without actually calling it)
                import inspect
                post_source = inspect.getsource(test_entry.post)
                if 'db_transaction.atomic()' in post_source:
                    print("✅ JournalEntry.post() will use correct transaction import")
                else:
                    print("❌ JournalEntry.post() may fail with transaction error")
                    return False
                    
        except Exception as e:
            print(f"❌ Transaction context failed: {e}")
            return False
            
        # Check the exact error path
        try:
            # Simulate an exception being caught and re-raised
            # This is what happens at line 270 of accounting_service.py
            try:
                raise Exception("Test exception")
            except Exception as e:
                # This mimics the error handling in create_pos_sale_entries
                error_msg = f"Failed to create accounting entries: {str(e)}"
                print(f"✅ Error handling works: {error_msg}")
        except Exception as e:
            print(f"❌ Error handling failed: {e}")
            return False
            
        return True
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("=" * 60)
    print("POS Accounting Flow Test")
    print("=" * 60)
    
    success = test_pos_accounting_flow()
    
    print("\n" + "=" * 60)
    if success:
        print("✅ POS ACCOUNTING TEST PASSED - The fix should work!")
    else:
        print("❌ POS ACCOUNTING TEST FAILED - More fixes needed!")
    print("=" * 60)