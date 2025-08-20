#!/usr/bin/env python3
"""
Check production database for sales data and API configuration
"""

import os
import sys
import django
import requests
from datetime import datetime, timedelta
from decimal import Decimal

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
from django.conf import settings
from accounting.models import Invoice, ChartOfAccounts
from pos.models import POSTransaction, POSTransactionItem
from hr.models import UserProfile

def check_sales_data():
    """Check if production database has sales data"""
    print("\n" + "="*60)
    print("CHECKING PRODUCTION SALES DATA")
    print("="*60)
    
    with connection.cursor() as cursor:
        # 1. Check total invoices
        cursor.execute("""
            SELECT 
                COUNT(*) as total_invoices,
                COUNT(CASE WHEN status = 'Paid' THEN 1 END) as paid_invoices,
                SUM(total_amount) as total_invoice_amount,
                MIN(invoice_date) as earliest_invoice,
                MAX(invoice_date) as latest_invoice
            FROM accounting_invoice
        """)
        invoice_data = cursor.fetchone()
        print(f"\n📊 INVOICE DATA:")
        print(f"   Total Invoices: {invoice_data[0]}")
        print(f"   Paid Invoices: {invoice_data[1]}")
        print(f"   Total Amount: ${invoice_data[2] or 0:,.2f}")
        print(f"   Date Range: {invoice_data[3]} to {invoice_data[4]}")
        
        # 2. Check POS transactions
        cursor.execute("""
            SELECT 
                COUNT(*) as total_transactions,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_transactions,
                SUM(total_amount) as total_pos_amount,
                MIN(created_at) as earliest_transaction,
                MAX(created_at) as latest_transaction
            FROM pos_postransaction
        """)
        pos_data = cursor.fetchone()
        print(f"\n💳 POS TRANSACTION DATA:")
        print(f"   Total Transactions: {pos_data[0]}")
        print(f"   Completed Transactions: {pos_data[1]}")
        print(f"   Total Amount: ${pos_data[2] or 0:,.2f}")
        print(f"   Date Range: {pos_data[3]} to {pos_data[4]}")
        
        # 3. Check last 30 days sales
        cursor.execute("""
            SELECT 
                DATE(created_at) as sale_date,
                COUNT(*) as transaction_count,
                SUM(total_amount) as daily_total
            FROM pos_postransaction
            WHERE created_at >= NOW() - INTERVAL '30 days'
                AND status = 'completed'
            GROUP BY DATE(created_at)
            ORDER BY sale_date DESC
            LIMIT 10
        """)
        recent_sales = cursor.fetchall()
        print(f"\n📈 RECENT DAILY SALES (Last 10 days with data):")
        if recent_sales:
            for date, count, total in recent_sales:
                print(f"   {date}: {count} transactions, ${total or 0:,.2f}")
        else:
            print("   No sales in the last 30 days")
        
        # 4. Check invoice items for product data
        cursor.execute("""
            SELECT 
                ii.name as product_name,
                COUNT(*) as times_sold,
                SUM(ii.quantity) as total_quantity,
                SUM(ii.quantity * ii.rate) as total_revenue
            FROM accounting_invoiceitem ii
            JOIN accounting_invoice i ON ii.invoice_id = i.id
            WHERE i.status = 'Paid'
            GROUP BY ii.name
            ORDER BY total_revenue DESC NULLS LAST
            LIMIT 5
        """)
        top_products = cursor.fetchall()
        print(f"\n🏆 TOP PRODUCTS BY REVENUE:")
        if top_products:
            for name, count, qty, revenue in top_products:
                print(f"   {name or 'Unnamed'}: {count} sales, {qty} units, ${revenue or 0:,.2f}")
        else:
            print("   No product sales data found")
        
        # 5. Check users with sales data
        cursor.execute("""
            SELECT 
                COUNT(DISTINCT tenant_id) as tenants_with_invoices
            FROM accounting_invoice
        """)
        tenant_invoice_count = cursor.fetchone()[0]
        
        cursor.execute("""
            SELECT 
                COUNT(DISTINCT tenant_id) as tenants_with_pos
            FROM pos_postransaction
        """)
        tenant_pos_count = cursor.fetchone()[0]
        
        print(f"\n👥 TENANT SALES ACTIVITY:")
        print(f"   Tenants with Invoices: {tenant_invoice_count}")
        print(f"   Tenants with POS Sales: {tenant_pos_count}")
        
        # 6. Check for test vs real data
        cursor.execute("""
            SELECT 
                COUNT(*) as test_transactions
            FROM pos_postransaction
            WHERE customer_name ILIKE '%test%' 
                OR customer_email ILIKE '%test%'
        """)
        test_count = cursor.fetchone()[0]
        print(f"\n🧪 DATA QUALITY:")
        print(f"   Possible test transactions: {test_count}")

def test_api_endpoint():
    """Test the backend API response"""
    print("\n" + "="*60)
    print("TESTING BACKEND API")
    print("="*60)
    
    api_url = "https://api.dottapps.com"
    
    # Test basic connectivity
    print(f"\n🌐 Testing API at: {api_url}")
    
    try:
        # 1. Test health endpoint
        health_response = requests.get(f"{api_url}/health", timeout=10)
        print(f"   Health Check: {health_response.status_code}")
        if health_response.status_code == 200:
            print(f"   Response: {health_response.text[:100]}")
    except Exception as e:
        print(f"   Health Check Failed: {e}")
    
    try:
        # 2. Test analytics endpoint structure (without auth)
        analytics_response = requests.get(
            f"{api_url}/api/analytics/sales-data?time_range=1",
            timeout=10
        )
        print(f"\n   Analytics Endpoint Status: {analytics_response.status_code}")
        
        if analytics_response.status_code == 401:
            print("   ✓ Endpoint exists and requires authentication (expected)")
        elif analytics_response.status_code == 200:
            print("   ⚠️ Endpoint returned 200 without auth (security concern)")
        else:
            print(f"   Response: {analytics_response.text[:200]}")
    except Exception as e:
        print(f"   Analytics Endpoint Failed: {e}")

def check_middleware_config():
    """Check middleware and authentication configuration"""
    print("\n" + "="*60)
    print("CHECKING MIDDLEWARE CONFIGURATION")
    print("="*60)
    
    # Check Django settings
    print(f"\n⚙️ DJANGO CONFIGURATION:")
    print(f"   DEBUG: {settings.DEBUG}")
    print(f"   ALLOWED_HOSTS: {settings.ALLOWED_HOSTS[:3]}...")
    print(f"   Database: {settings.DATABASES['default']['NAME']}")
    
    # Check middleware count
    middleware_count = len(settings.MIDDLEWARE)
    print(f"\n🔧 MIDDLEWARE:")
    print(f"   Total Middleware: {middleware_count}")
    if middleware_count > 10:
        print(f"   ⚠️ Warning: High middleware count (expected 10, got {middleware_count})")
    
    # Check for key middleware
    middleware_names = [m.split('.')[-1] for m in settings.MIDDLEWARE]
    print(f"   Key Middleware Present:")
    important_middleware = [
        'UnifiedTenantMiddleware',
        'UnifiedSessionMiddleware',
        'CorsMiddleware',
        'SecurityMiddleware'
    ]
    for mw in important_middleware:
        present = any(mw in m for m in settings.MIDDLEWARE)
        status = "✓" if present else "✗"
        print(f"      {status} {mw}")
    
    # Check tenant exempt paths
    if hasattr(settings, 'TENANT_EXEMPT_PATHS'):
        print(f"\n🔓 TENANT EXEMPT PATHS:")
        for path in settings.TENANT_EXEMPT_PATHS[:5]:
            print(f"   - {path}")
        if '/api/analytics/' in settings.TENANT_EXEMPT_PATHS:
            print("   ⚠️ Warning: Analytics API in exempt paths")
    
    # Check session configuration
    print(f"\n🔐 SESSION CONFIGURATION:")
    print(f"   SESSION_ENGINE: {settings.SESSION_ENGINE}")
    print(f"   SESSION_COOKIE_NAME: {settings.SESSION_COOKIE_NAME}")
    print(f"   SESSION_COOKIE_SECURE: {settings.SESSION_COOKIE_SECURE}")
    print(f"   SESSION_COOKIE_HTTPONLY: {settings.SESSION_COOKIE_HTTPONLY}")
    print(f"   SESSION_COOKIE_SAMESITE: {settings.SESSION_COOKIE_SAMESITE}")

def check_recent_api_errors():
    """Check for recent errors in the database"""
    print("\n" + "="*60)
    print("CHECKING RECENT API ERRORS")
    print("="*60)
    
    with connection.cursor() as cursor:
        # Check if there's an error log table
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
                AND table_name LIKE '%log%'
            LIMIT 5
        """)
        log_tables = cursor.fetchall()
        
        if log_tables:
            print(f"\n📝 LOG TABLES FOUND:")
            for table in log_tables:
                print(f"   - {table[0]}")
        else:
            print("\n   No log tables found in database")

def main():
    print("\n" + "="*60)
    print("PRODUCTION SALES DATA DIAGNOSTIC")
    print(f"Timestamp: {datetime.now()}")
    print("="*60)
    
    try:
        # Run all checks
        check_sales_data()
        test_api_endpoint()
        check_middleware_config()
        check_recent_api_errors()
        
        print("\n" + "="*60)
        print("DIAGNOSTIC COMPLETE")
        print("="*60)
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()