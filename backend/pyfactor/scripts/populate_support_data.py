"""
Script to populate test data for support@dottapps.com
Ensures they have data for all entity types for testing.
"""
import os
import sys
import django
import uuid
from datetime import datetime, timedelta
from decimal import Decimal

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import transaction
from custom_auth.models import User
from inventory.models import Product, Service
from crm.models import Customer
from finance.models import Invoice, Estimate
from purchases.models import Vendor, PurchaseOrder, Bill
from hr.models import Employee
import logging

logger = logging.getLogger(__name__)


def populate_support_data():
    """
    Populate comprehensive test data for support@dottapps.com
    """
    try:
        # Get support user
        user = User.objects.get(email='support@dottapps.com')
        tenant_id = user.business_id or user.tenant_id
        
        if not tenant_id:
            print(f"❌ User support@dottapps.com has no tenant_id")
            return False
        
        print(f"✅ Found user: {user.email}")
        print(f"   Tenant ID: {tenant_id}")
        
        with transaction.atomic():
            # 1. Create Services (currently 0)
            services_created = 0
            existing_services = Service.objects.filter(tenant_id=tenant_id).count()
            print(f"\n📦 Services: {existing_services} existing")
            
            if existing_services < 5:
                service_data = [
                    {"name": "Consulting Service", "price": 150.00, "description": "Professional consulting"},
                    {"name": "Training Service", "price": 200.00, "description": "Training and education"},
                    {"name": "Support Service", "price": 100.00, "description": "Technical support"},
                    {"name": "Installation Service", "price": 75.00, "description": "Product installation"},
                    {"name": "Maintenance Service", "price": 50.00, "description": "Regular maintenance"}
                ]
                
                for data in service_data[:5-existing_services]:
                    service = Service.objects.create(
                        tenant_id=tenant_id,
                        name=data["name"],
                        price=Decimal(str(data["price"])),
                        description=data["description"],
                        is_active=True,
                        created_by=user
                    )
                    services_created += 1
                    print(f"   ✅ Created service: {service.name}")
            
            # 2. Ensure Customers exist (currently showing 0, but should be 5)
            customers_created = 0
            existing_customers = Customer.objects.filter(tenant_id=tenant_id).count()
            print(f"\n👥 Customers: {existing_customers} existing")
            
            if existing_customers < 5:
                customer_data = [
                    {"name": "John Smith", "email": "john@example.com", "phone": "+1234567890"},
                    {"name": "Jane Doe", "email": "jane@example.com", "phone": "+1234567891"},
                    {"name": "ABC Company", "email": "abc@company.com", "phone": "+1234567892"},
                    {"name": "XYZ Corp", "email": "xyz@corp.com", "phone": "+1234567893"},
                    {"name": "Test Client", "email": "test@client.com", "phone": "+1234567894"}
                ]
                
                for data in customer_data[:5-existing_customers]:
                    # Split name for first/last or use as business name
                    if " " in data["name"]:
                        parts = data["name"].split(" ", 1)
                        customer = Customer.objects.create(
                            tenant_id=tenant_id,
                            first_name=parts[0],
                            last_name=parts[1],
                            email=data["email"],
                            phone=data["phone"],
                            is_active=True,
                            created_by=user
                        )
                    else:
                        customer = Customer.objects.create(
                            tenant_id=tenant_id,
                            business_name=data["name"],
                            email=data["email"],
                            phone=data["phone"],
                            is_active=True,
                            created_by=user
                        )
                    customers_created += 1
                    print(f"   ✅ Created customer: {data['name']}")
            
            # 3. Create Invoices (currently 0)
            invoices_created = 0
            existing_invoices = Invoice.objects.filter(tenant_id=tenant_id).count()
            print(f"\n📄 Invoices: {existing_invoices} existing")
            
            if existing_invoices < 3:
                # Get a customer for invoices
                customer = Customer.objects.filter(tenant_id=tenant_id).first()
                if customer:
                    for i in range(3 - existing_invoices):
                        invoice = Invoice.objects.create(
                            tenant_id=tenant_id,
                            customer=customer,
                            invoice_number=f"INV-{datetime.now().strftime('%Y%m%d')}-{i+1:03d}",
                            date=datetime.now().date(),
                            due_date=(datetime.now() + timedelta(days=30)).date(),
                            total_amount=Decimal(str(100 + i * 50)),
                            status='pending',
                            created_by=user
                        )
                        invoices_created += 1
                        print(f"   ✅ Created invoice: {invoice.invoice_number}")
            
            # 4. Create Vendors (if none exist)
            vendors_created = 0
            existing_vendors = Vendor.objects.filter(tenant_id=tenant_id).count()
            print(f"\n🏢 Vendors: {existing_vendors} existing")
            
            if existing_vendors < 3:
                vendor_data = [
                    {"name": "Office Supplies Inc", "email": "supplies@vendor.com"},
                    {"name": "Tech Equipment Co", "email": "tech@vendor.com"},
                    {"name": "Service Provider LLC", "email": "service@vendor.com"}
                ]
                
                for data in vendor_data[:3-existing_vendors]:
                    vendor = Vendor.objects.create(
                        tenant_id=tenant_id,
                        name=data["name"],
                        email=data["email"],
                        is_active=True,
                        created_by=user
                    )
                    vendors_created += 1
                    print(f"   ✅ Created vendor: {vendor.name}")
            
            # 5. Create Estimates
            estimates_created = 0
            existing_estimates = Estimate.objects.filter(tenant_id=tenant_id).count()
            print(f"\n📋 Estimates: {existing_estimates} existing")
            
            if existing_estimates < 2:
                customer = Customer.objects.filter(tenant_id=tenant_id).first()
                if customer:
                    for i in range(2 - existing_estimates):
                        estimate = Estimate.objects.create(
                            tenant_id=tenant_id,
                            customer=customer,
                            estimate_number=f"EST-{datetime.now().strftime('%Y%m%d')}-{i+1:03d}",
                            date=datetime.now().date(),
                            valid_until=(datetime.now() + timedelta(days=15)).date(),
                            total_amount=Decimal(str(200 + i * 100)),
                            status='draft',
                            created_by=user
                        )
                        estimates_created += 1
                        print(f"   ✅ Created estimate: {estimate.estimate_number}")
            
            # 6. Create Employee record for the user
            employees_created = 0
            existing_employees = Employee.objects.filter(tenant_id=tenant_id).count()
            print(f"\n👷 Employees: {existing_employees} existing")
            
            if existing_employees == 0:
                employee = Employee.objects.create(
                    tenant_id=tenant_id,
                    user=user,
                    first_name="Support",
                    last_name="Admin",
                    email=user.email,
                    employee_id=f"EMP{str(uuid.uuid4())[:6].upper()}",
                    hire_date=datetime.now().date(),
                    is_active=True,
                    created_by=user
                )
                employees_created += 1
                print(f"   ✅ Created employee: {employee.first_name} {employee.last_name}")
            
            print(f"\n📊 Summary:")
            print(f"   Services created: {services_created}")
            print(f"   Customers created: {customers_created}")
            print(f"   Invoices created: {invoices_created}")
            print(f"   Vendors created: {vendors_created}")
            print(f"   Estimates created: {estimates_created}")
            print(f"   Employees created: {employees_created}")
            
            # Verify final counts
            print(f"\n✅ Final data counts for tenant {tenant_id}:")
            print(f"   Products: {Product.objects.filter(tenant_id=tenant_id).count()}")
            print(f"   Services: {Service.objects.filter(tenant_id=tenant_id).count()}")
            print(f"   Customers: {Customer.objects.filter(tenant_id=tenant_id).count()}")
            print(f"   Invoices: {Invoice.objects.filter(tenant_id=tenant_id).count()}")
            print(f"   Vendors: {Vendor.objects.filter(tenant_id=tenant_id).count()}")
            print(f"   Estimates: {Estimate.objects.filter(tenant_id=tenant_id).count()}")
            print(f"   Employees: {Employee.objects.filter(tenant_id=tenant_id).count()}")
            
            return True
            
    except User.DoesNotExist:
        print(f"❌ User support@dottapps.com not found")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("POPULATE TEST DATA FOR support@dottapps.com")
    print("=" * 60)
    
    success = populate_support_data()
    
    if success:
        print("\n✅ Data population completed successfully!")
    else:
        print("\n❌ Data population failed!")