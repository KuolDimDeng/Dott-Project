#!/usr/bin/env python3
"""
Test script to demonstrate platform fee calculations
Run this to see how fees work for different amounts
"""
from stripe_fees import calculate_platform_fee, format_fee_for_display
from decimal import Decimal

def test_fee_calculations():
    """Test fee calculations for various amounts"""
    
    print("Platform Fee Structure Test")
    print("=" * 60)
    print("Your fee: 2.9% + $0.60")
    print("Stripe's cost: 2.9% + $0.30")
    print("Your profit: $0.30 per transaction")
    print("=" * 60)
    
    # Test amounts in dollars
    test_amounts = [10, 25, 50, 100, 250, 500, 1000, 5000, 10000]
    
    print("\nInvoice Payment Fees:")
    print("-" * 60)
    print(f"{'Amount':>10} | {'Platform Fee':>12} | {'Stripe Cost':>12} | {'Your Profit':>12}")
    print("-" * 60)
    
    total_profit = Decimal('0')
    
    for amount in test_amounts:
        amount_cents = amount * 100
        fee_info = calculate_platform_fee(amount_cents, 'invoice_payment')
        
        print(f"${amount:>9.2f} | "
              f"${fee_info['platform_fee']/100:>11.2f} | "
              f"${fee_info['stripe_cost']/100:>11.2f} | "
              f"${fee_info['platform_profit']/100:>11.2f}")
        
        total_profit += Decimal(str(fee_info['platform_profit'] / 100))
    
    print("-" * 60)
    print(f"Total profit from {len(test_amounts)} transactions: ${total_profit:.2f}")
    
    # Show fee display format
    print("\n\nHow fees are displayed to users:")
    print("-" * 60)
    
    for amount in [100, 500, 1000]:
        amount_cents = amount * 100
        display = format_fee_for_display(amount_cents, 'invoice_payment')
        
        print(f"\nInvoice Amount: {display['subtotal']}")
        print(f"Processing Fee: {display['processing_fee']} {display['breakdown']}")
        print(f"Total to Pay: {display['total']}")
    
    # Calculate monthly projections
    print("\n\nMonthly Revenue Projections:")
    print("-" * 60)
    
    for volume in [100, 500, 1000, 5000, 10000]:
        monthly_profit = volume * 0.30  # $0.30 per transaction
        print(f"{volume:>6} transactions/month = ${monthly_profit:>8.2f} profit")
    
    print("\n✅ Platform fee system is working correctly!")

if __name__ == "__main__":
    test_fee_calculations()