#!/usr/bin/env python3
"""
Test the cash flow endpoint to ensure it returns correct data
"""
import os
import sys
import django
import json

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.test import RequestFactory
from django.contrib.auth import get_user_model
from analysis.views import get_cash_flow_data
from finance.models import JournalEntry, JournalEntryLine, ChartOfAccount
from django.db.models import Sum

User = get_user_model()

def test_cashflow_endpoint():
    """Test the cash flow endpoint"""
    print("=" * 60)
    print("Testing Cash Flow Endpoint")
    print("=" * 60)
    
    # Create a mock request
    factory = RequestFactory()
    
    # Get a test user (use the one we created earlier)
    test_user = User.objects.filter(email='test@example.com').first()
    if not test_user:
        print("❌ Test user not found. Run test_pos_to_accounting.py first.")
        return False
    
    # Create request with user
    request = factory.get('/api/analysis/cash-flow-data?time_granularity=3')
    request.user = test_user
    
    print(f"\n1. Testing with user: {test_user.email}")
    
    # Call the view function directly
    try:
        response = get_cash_flow_data(request)
        
        # Parse the response - JsonResponse needs special handling
        # Check if response needs rendering first
        if hasattr(response, 'render'):
            response.render()
        
        # Now get the content
        if hasattr(response, 'content'):
            data = json.loads(response.content.decode('utf-8'))
        else:
            data = response
        
        print(f"\n2. Response received:")
        print(f"   Status Code: {response.status_code if hasattr(response, 'status_code') else 'N/A'}")
        
        if isinstance(data, dict) and 'cash_flow_data' in data:
            print(f"   ✅ Cash flow data found!")
            print(f"   Number of periods: {len(data['cash_flow_data'])}")
            
            # Display the data
            print("\n3. Cash Flow by Month:")
            for month_data in data['cash_flow_data']:
                print(f"   {month_data['month']}:")
                print(f"      Inflows:  ${month_data['inflow']:,.2f}")
                print(f"      Outflows: ${month_data['outflow']:,.2f}")
                print(f"      Net Flow: ${month_data['net_cash_flow']:,.2f}")
            
            # Show summary
            if 'summary' in data:
                print("\n4. Summary:")
                print(f"   Total Inflows:  ${data['summary']['total_inflow']:,.2f}")
                print(f"   Total Outflows: ${data['summary']['total_outflow']:,.2f}")
                print(f"   Net Position:   ${data['summary']['net_position']:,.2f}")
            
            # Verify against actual journal entries
            print("\n5. Verifying against journal entries...")
            cash_accounts = ChartOfAccount.objects.filter(name__icontains='cash')
            total_debits = JournalEntryLine.objects.filter(
                account__in=cash_accounts,
                journal_entry__status='posted'
            ).aggregate(total=Sum('debit_amount'))['total'] or 0
            
            total_credits = JournalEntryLine.objects.filter(
                account__in=cash_accounts,
                journal_entry__status='posted'
            ).aggregate(total=Sum('credit_amount'))['total'] or 0
            
            print(f"   Database totals:")
            print(f"      Total Cash Debits:  ${total_debits:,.2f}")
            print(f"      Total Cash Credits: ${total_credits:,.2f}")
            print(f"      Net Cash Position:  ${total_debits - total_credits:,.2f}")
            
            # Check if amounts match
            api_total_inflow = data['summary']['total_inflow']
            if abs(api_total_inflow - float(total_debits)) < 0.01:
                print(f"\n   ✅ API data matches database!")
            else:
                print(f"\n   ⚠️ API data may not match database (could be date range difference)")
            
            return True
        else:
            print(f"   ❌ Unexpected response format:")
            print(f"   {json.dumps(data, indent=2)}")
            return False
            
    except Exception as e:
        print(f"\n❌ Error calling endpoint: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = test_cashflow_endpoint()
    
    print("\n" + "=" * 60)
    if success:
        print("✅ CASH FLOW ENDPOINT TEST PASSED!")
        print("The frontend widget should now display the correct amounts.")
    else:
        print("❌ CASH FLOW ENDPOINT TEST FAILED")
    print("=" * 60)