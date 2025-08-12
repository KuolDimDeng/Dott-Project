#!/usr/bin/env python3
"""
Test script to verify transaction import fixes before deployment
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def test_imports():
    """Test that all critical imports work correctly"""
    print("Testing transaction import fixes...\n")
    
    # Test 1: Import accounting service
    try:
        from sales.services.accounting_service import AccountingService
        print("✅ AccountingService imported successfully")
    except Exception as e:
        print(f"❌ Failed to import AccountingService: {e}")
        return False
    
    # Test 2: Import finance models
    try:
        from finance.models import JournalEntry, JournalEntryLine
        print("✅ Finance models imported successfully")
    except Exception as e:
        print(f"❌ Failed to import finance models: {e}")
        return False
    
    # Test 3: Check JournalEntry.post method
    try:
        import inspect
        from finance.models import JournalEntry
        source = inspect.getsource(JournalEntry.post)
        
        if 'with transaction.atomic():' in source:
            print("❌ JournalEntry.post() still uses 'transaction.atomic()' - NOT FIXED!")
            return False
        elif 'with db_transaction.atomic():' in source:
            print("✅ JournalEntry.post() correctly uses 'db_transaction.atomic()'")
        else:
            print("⚠️  Could not verify transaction usage in JournalEntry.post()")
    except Exception as e:
        print(f"❌ Error checking JournalEntry.post(): {e}")
        return False
    
    # Test 4: Simulate the accounting service call
    try:
        # This won't actually create entries, but will test the import chain
        from django.db import transaction as db_transaction
        with db_transaction.atomic():
            # Test that we can create a mock journal entry
            from finance.models import JournalEntry
            from django.utils import timezone
            
            # Just test instantiation, don't save
            journal = JournalEntry(
                date=timezone.now().date(),
                description="Test entry",
                reference="TEST001",
                status='draft'
            )
            print("✅ Can instantiate JournalEntry without import errors")
    except Exception as e:
        print(f"❌ Error during transaction test: {e}")
        return False
    
    # Test 5: Check for any remaining 'transaction.' usage
    print("\nChecking for any remaining incorrect transaction usage...")
    problem_files = []
    
    files_to_check = [
        'sales/services/accounting_service.py',
        'finance/models.py',
        'finance/utils.py',
        'finance/views.py',
        'sales/pos_viewsets.py',
        'sales/views.py',
        'sales/services/inventory_service.py'
    ]
    
    for file_path in files_to_check:
        try:
            with open(file_path, 'r') as f:
                content = f.read()
                # Check for transaction. usage without db_transaction
                if 'transaction.atomic(' in content and 'db_transaction' not in content:
                    problem_files.append(file_path)
                    print(f"❌ {file_path} - Still has incorrect transaction usage")
                elif 'with transaction.atomic():' in content:
                    problem_files.append(file_path)
                    print(f"❌ {file_path} - Still uses 'with transaction.atomic():'")
        except FileNotFoundError:
            pass
    
    if not problem_files:
        print("✅ No incorrect transaction usage found in key files")
    
    return len(problem_files) == 0

if __name__ == '__main__':
    print("=" * 60)
    print("Transaction Import Fix Verification")
    print("=" * 60)
    
    success = test_imports()
    
    print("\n" + "=" * 60)
    if success:
        print("✅ ALL TESTS PASSED - Safe to deploy!")
    else:
        print("❌ TESTS FAILED - Do not deploy yet!")
    print("=" * 60)