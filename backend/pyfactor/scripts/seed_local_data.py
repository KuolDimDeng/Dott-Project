#!/usr/bin/env python
"""
Local Development Data Seeding Script

This script creates sample data for local development and testing.
Run with: python manage.py shell < scripts/seed_local_data.py
"""

import os
import django
from django.contrib.auth import get_user_model
from django.db import transaction

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

User = get_user_model()

def create_sample_users():
    """Create sample users for testing"""
    sample_users = [
        {
            'email': 'owner@testcompany.com',
            'username': 'testowner',
            'first_name': 'John',
            'last_name': 'Owner',
            'is_staff': False,
            'is_superuser': False
        },
        {
            'email': 'admin@testcompany.com', 
            'username': 'testadmin',
            'first_name': 'Jane',
            'last_name': 'Admin',
            'is_staff': False,
            'is_superuser': False
        },
        {
            'email': 'user@testcompany.com',
            'username': 'testuser', 
            'first_name': 'Bob',
            'last_name': 'User',
            'is_staff': False,
            'is_superuser': False
        }
    ]
    
    for user_data in sample_users:
        user, created = User.objects.get_or_create(
            email=user_data['email'],
            defaults=user_data
        )
        if created:
            user.set_password('testpass123')
            user.save()
            print(f"✅ Created user: {user.email}")
        else:
            print(f"👤 User already exists: {user.email}")

def create_sample_business_data():
    """Create sample business data"""
    try:
        from businesses.models import Business
        from users.models import UserProfile
        
        # Create a sample business
        business, created = Business.objects.get_or_create(
            name="Test Company Inc",
            defaults={
                'address': '123 Main St',
                'city': 'San Francisco',
                'state': 'CA',
                'zip_code': '94102',
                'country': 'US',
                'phone': '+1-555-123-4567',
                'website': 'https://testcompany.com',
                'industry': 'Technology'
            }
        )
        
        if created:
            print(f"✅ Created business: {business.name}")
        else:
            print(f"🏢 Business already exists: {business.name}")
            
        # Associate users with business
        owner_user = User.objects.get(email='owner@testcompany.com')
        admin_user = User.objects.get(email='admin@testcompany.com')
        regular_user = User.objects.get(email='user@testcompany.com')
        
        # Update user profiles
        for user, role in [(owner_user, 'OWNER'), (admin_user, 'ADMIN'), (regular_user, 'USER')]:
            profile, created = UserProfile.objects.get_or_create(
                user=user,
                defaults={
                    'business': business,
                    'role': role,
                    'onboarding_completed': True,
                    'country': 'US'
                }
            )
            if created:
                print(f"✅ Created profile for {user.email} with role {role}")
            else:
                print(f"👤 Profile already exists for {user.email}")
                
    except ImportError as e:
        print(f"⚠️  Skipping business data creation: {e}")

def create_sample_financial_data():
    """Create sample financial data like invoices, expenses"""
    try:
        from invoices.models import Invoice
        from expenses.models import Expense
        from businesses.models import Business
        
        business = Business.objects.get(name="Test Company Inc")
        
        # Create sample invoice
        invoice, created = Invoice.objects.get_or_create(
            business=business,
            invoice_number="INV-001",
            defaults={
                'client_name': 'ABC Corporation',
                'amount': 2500.00,
                'status': 'sent',
                'description': 'Website Development Services',
                'due_date': '2024-08-01'
            }
        )
        
        if created:
            print(f"✅ Created sample invoice: {invoice.invoice_number}")
        else:
            print(f"💰 Invoice already exists: {invoice.invoice_number}")
            
        # Create sample expense
        expense, created = Expense.objects.get_or_create(
            business=business,
            description="Office Supplies",
            defaults={
                'amount': 150.00,
                'category': 'Office Expenses',
                'date': '2024-07-15'
            }
        )
        
        if created:
            print(f"✅ Created sample expense: {expense.description}")
        else:
            print(f"💳 Expense already exists: {expense.description}")
            
    except ImportError as e:
        print(f"⚠️  Skipping financial data creation: {e}")

def main():
    """Main seeding function"""
    print("🌱 Seeding local development data...")
    
    try:
        with transaction.atomic():
            create_sample_users()
            create_sample_business_data()
            create_sample_financial_data()
            
        print("\n✅ Data seeding completed successfully!")
        print("\n📋 Test Accounts Created:")
        print("   Owner: owner@testcompany.com / testpass123")
        print("   Admin: admin@testcompany.com / testpass123") 
        print("   User:  user@testcompany.com / testpass123")
        print("\n🏢 Sample business: Test Company Inc")
        print("💰 Sample invoice and expense records created")
        
    except Exception as e:
        print(f"❌ Error during data seeding: {e}")
        raise

if __name__ == "__main__":
    main()