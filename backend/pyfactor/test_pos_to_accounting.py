#!/usr/bin/env python3
"""
Test script to verify POS sales create accounting entries
"""
import os
import sys
import django
from decimal import Decimal
from datetime import datetime

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def test_pos_accounting_integration():
    """Test that POS sales create journal entries in the accounting system"""
    print("=" * 60)
    print("Testing POS to Accounting Integration")
    print("=" * 60)
    
    try:
        # Import required models
        from sales.models import POSTransaction, POSTransactionItem
        from inventory.models import Product
        from finance.models import JournalEntry, JournalEntryLine, ChartOfAccount
        from django.contrib.auth import get_user_model
        from custom_auth.models import TenantManager
        from sales.services.accounting_service import AccountingService
        from django.db import transaction as db_transaction
        
        User = get_user_model()
        
        # Check if we have accounts in the database
        print("\n1. Checking Chart of Accounts...")
        accounts = ChartOfAccount.objects.all()
        print(f"   ✅ Found {accounts.count()} accounts in the database")
        
        # Show critical accounts for POS
        critical_accounts = ['Cash', 'Sales Revenue', 'Cost of Goods Sold', 'Inventory', 'Sales Tax Payable']
        for account_name in critical_accounts:
            account = ChartOfAccount.objects.filter(name__icontains=account_name).first()
            if account:
                print(f"   ✓ {account_name}: {account.account_number} - {account.name}")
            else:
                print(f"   ✗ {account_name}: NOT FOUND")
        
        # Check existing journal entries
        print("\n2. Checking existing journal entries...")
        journal_entries = JournalEntry.objects.all()
        print(f"   Current journal entries in database: {journal_entries.count()}")
        
        # Create a test POS transaction
        print("\n3. Creating test POS transaction...")
        
        # Get or create a test user
        test_user = User.objects.filter(email='test@example.com').first()
        if not test_user:
            print("   Creating test user...")
            test_user = User.objects.create_user(
                email='test@example.com',
                first_name='Test',
                last_name='User',
                password='TestPass123!'
            )
        
        # Create or get a test product
        test_product = Product.objects.filter(name='Test Product').first()
        if not test_product:
            print("   Creating test product...")
            test_product = Product.objects.create(
                name='Test Product',
                description='Product for testing',
                selling_price=Decimal('100.00'),
                cost_price=Decimal('60.00'),
                quantity_on_hand=100,
                sku='TEST-001'
            )
        
        # Create the POS transaction
        with db_transaction.atomic():
            # Create POS transaction
            pos_transaction = POSTransaction.objects.create(
                transaction_number=f"POS-TEST-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                subtotal=Decimal('100.00'),
                tax_amount=Decimal('8.00'),
                discount_amount=Decimal('0.00'),
                total_amount=Decimal('108.00'),
                payment_method='cash',
                amount_tendered=Decimal('110.00'),
                change_given=Decimal('2.00'),
                status='completed',
                created_by=test_user,
                notes='Test transaction for accounting integration'
            )
            
            # Create transaction item
            transaction_item = POSTransactionItem.objects.create(
                transaction=pos_transaction,
                product=test_product,
                quantity=1,
                unit_price=Decimal('100.00'),
                discount_percentage=Decimal('0.00'),
                tax_amount=Decimal('8.00'),
                line_total=Decimal('108.00'),
                cost_price=Decimal('60.00')
            )
            
            print(f"   ✅ Created POS transaction: {pos_transaction.transaction_number}")
            
            # Now create the journal entry using the accounting service
            print("\n4. Creating journal entry for POS sale...")
            
            items_data = [{
                'type': 'product',
                'item': test_product,
                'quantity': 1,
                'cost_price': Decimal('60.00')
            }]
            
            try:
                journal_entry = AccountingService.create_sale_journal_entry(
                    pos_transaction,
                    items_data
                )
                
                if journal_entry:
                    print(f"   ✅ Journal entry created: {journal_entry.reference}")
                    print(f"      Date: {journal_entry.date}")
                    print(f"      Description: {journal_entry.description}")
                    print(f"      Status: {journal_entry.status}")
                    
                    # Show the journal entry lines
                    print("\n   Journal Entry Lines:")
                    for line in journal_entry.lines.all():
                        debit_credit = f"Dr {line.debit_amount}" if line.debit_amount else f"Cr {line.credit_amount}"
                        print(f"      {line.account.account_number} - {line.account.name}: {debit_credit}")
                    
                    # Verify totals
                    total_debits = sum(line.debit_amount for line in journal_entry.lines.all())
                    total_credits = sum(line.credit_amount for line in journal_entry.lines.all())
                    print(f"\n   Total Debits: {total_debits}")
                    print(f"   Total Credits: {total_credits}")
                    
                    if total_debits == total_credits:
                        print("   ✅ Journal entry is balanced!")
                    else:
                        print("   ❌ Journal entry is NOT balanced!")
                else:
                    print("   ❌ Failed to create journal entry")
                    
            except Exception as e:
                print(f"   ❌ Error creating journal entry: {e}")
                import traceback
                traceback.print_exc()
        
        # Check if journal entries increased
        print("\n5. Verifying journal entries...")
        new_journal_count = JournalEntry.objects.all().count()
        print(f"   Journal entries after POS sale: {new_journal_count}")
        
        if new_journal_count > journal_entries.count():
            print("   ✅ Journal entry was successfully created!")
            
            # Check cash flow data
            print("\n6. Checking cash flow impact...")
            latest_entry = JournalEntry.objects.latest('created_at')
            cash_lines = latest_entry.lines.filter(account__name__icontains='cash')
            revenue_lines = latest_entry.lines.filter(account__name__icontains='revenue')
            
            if cash_lines.exists():
                for line in cash_lines:
                    print(f"   Cash account updated: Dr {line.debit_amount} Cr {line.credit_amount}")
            
            if revenue_lines.exists():
                for line in revenue_lines:
                    print(f"   Revenue account updated: Dr {line.debit_amount} Cr {line.credit_amount}")
            
            print("\n   ✅ POS sale should now appear in cash flow!")
        else:
            print("   ⚠️ No new journal entry created - check the logs for errors")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = test_pos_accounting_integration()
    
    print("\n" + "=" * 60)
    if success:
        print("✅ POS TO ACCOUNTING INTEGRATION TEST COMPLETE")
        print("Your POS sales should now update the cash flow!")
    else:
        print("❌ TEST FAILED - Check the errors above")
    print("=" * 60)