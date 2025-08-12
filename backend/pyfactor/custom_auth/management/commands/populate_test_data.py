"""
Management command to populate test data for support user
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from custom_auth.models import User
from inventory.models import Product, Service
from crm.models import Customer
from finance.models import Invoice, Estimate
from purchases.models import Vendor
from hr.models import Employee
from decimal import Decimal
from datetime import datetime, timedelta
import uuid


class Command(BaseCommand):
    help = 'Populate test data for support@dottapps.com to ensure all entity types have data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            default='support@dottapps.com',
            help='Email of user to populate data for',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run without making changes',
        )

    def handle(self, *args, **options):
        email = options['email']
        dry_run = options.get('dry_run', False)
        
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN MODE - No changes will be made"))
        
        try:
            user = User.objects.get(email=email)
            tenant_id = user.business_id or user.tenant_id
            
            if not tenant_id:
                self.stdout.write(self.style.ERROR(f"User {email} has no tenant_id"))
                return
            
            self.stdout.write(self.style.SUCCESS(f"✅ Found user: {email}"))
            self.stdout.write(f"   Tenant ID: {tenant_id}")
            
            # Check current data
            self.stdout.write("\n📊 Current data counts:")
            current_counts = {
                'Products': Product.objects.filter(tenant_id=tenant_id).count(),
                'Services': Service.objects.filter(tenant_id=tenant_id).count(),
                'Customers': Customer.objects.filter(tenant_id=tenant_id).count(),
                'Invoices': Invoice.objects.filter(tenant_id=tenant_id).count(),
                'Vendors': Vendor.objects.filter(tenant_id=tenant_id).count(),
                'Estimates': Estimate.objects.filter(tenant_id=tenant_id).count(),
                'Employees': Employee.objects.filter(tenant_id=tenant_id).count(),
            }
            
            for entity, count in current_counts.items():
                status = "✅" if count > 0 else "❌"
                self.stdout.write(f"   {status} {entity}: {count}")
            
            if dry_run:
                self.stdout.write("\nData would be created for entities with 0 count")
                return
            
            with transaction.atomic():
                created_counts = {}
                
                # Create Services if none exist
                if current_counts['Services'] == 0:
                    self.stdout.write("\n📦 Creating Services...")
                    services = [
                        Service.objects.create(
                            tenant_id=tenant_id,
                            name=f"Service {i+1}",
                            price=Decimal(str(50 + i * 25)),
                            description=f"Test service {i+1}",
                            is_active=True,
                            created_by=user
                        ) for i in range(5)
                    ]
                    created_counts['Services'] = len(services)
                    self.stdout.write(self.style.SUCCESS(f"   Created {len(services)} services"))
                
                # Create Customers if none exist  
                if current_counts['Customers'] == 0:
                    self.stdout.write("\n👥 Creating Customers...")
                    customers = []
                    for i in range(5):
                        customer = Customer.objects.create(
                            tenant_id=tenant_id,
                            first_name=f"Customer",
                            last_name=f"{i+1}",
                            email=f"customer{i+1}@test.com",
                            phone=f"+123456789{i}",
                            is_active=True,
                            created_by=user
                        )
                        customers.append(customer)
                    created_counts['Customers'] = len(customers)
                    self.stdout.write(self.style.SUCCESS(f"   Created {len(customers)} customers"))
                
                # Create Invoices if none exist
                if current_counts['Invoices'] == 0:
                    self.stdout.write("\n📄 Creating Invoices...")
                    customer = Customer.objects.filter(tenant_id=tenant_id).first()
                    if customer:
                        invoices = []
                        for i in range(3):
                            invoice = Invoice.objects.create(
                                tenant_id=tenant_id,
                                customer=customer,
                                invoice_number=f"INV-TEST-{i+1:03d}",
                                date=datetime.now().date(),
                                due_date=(datetime.now() + timedelta(days=30)).date(),
                                total_amount=Decimal(str(100 + i * 50)),
                                status='pending',
                                created_by=user
                            )
                            invoices.append(invoice)
                        created_counts['Invoices'] = len(invoices)
                        self.stdout.write(self.style.SUCCESS(f"   Created {len(invoices)} invoices"))
                
                # Create Vendors if none exist
                if current_counts['Vendors'] == 0:
                    self.stdout.write("\n🏢 Creating Vendors...")
                    vendors = []
                    for i in range(3):
                        vendor = Vendor.objects.create(
                            tenant_id=tenant_id,
                            name=f"Vendor {i+1}",
                            email=f"vendor{i+1}@test.com",
                            is_active=True,
                            created_by=user
                        )
                        vendors.append(vendor)
                    created_counts['Vendors'] = len(vendors)
                    self.stdout.write(self.style.SUCCESS(f"   Created {len(vendors)} vendors"))
                
                # Create Estimates if none exist
                if current_counts['Estimates'] == 0:
                    self.stdout.write("\n📋 Creating Estimates...")
                    customer = Customer.objects.filter(tenant_id=tenant_id).first()
                    if customer:
                        estimates = []
                        for i in range(2):
                            estimate = Estimate.objects.create(
                                tenant_id=tenant_id,
                                customer=customer,
                                estimate_number=f"EST-TEST-{i+1:03d}",
                                date=datetime.now().date(),
                                valid_until=(datetime.now() + timedelta(days=15)).date(),
                                total_amount=Decimal(str(200 + i * 100)),
                                status='draft',
                                created_by=user
                            )
                            estimates.append(estimate)
                        created_counts['Estimates'] = len(estimates)
                        self.stdout.write(self.style.SUCCESS(f"   Created {len(estimates)} estimates"))
                
                # Create Employee if none exist
                if current_counts['Employees'] == 0:
                    self.stdout.write("\n👷 Creating Employee...")
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
                    created_counts['Employees'] = 1
                    self.stdout.write(self.style.SUCCESS("   Created employee record"))
                
                # Final summary
                self.stdout.write("\n" + "=" * 60)
                self.stdout.write(self.style.SUCCESS("✅ DATA POPULATION COMPLETED"))
                self.stdout.write("=" * 60)
                
                self.stdout.write("\n📊 Final counts:")
                for entity in current_counts.keys():
                    model_map = {
                        'Products': Product,
                        'Services': Service,
                        'Customers': Customer,
                        'Invoices': Invoice,
                        'Vendors': Vendor,
                        'Estimates': Estimate,
                        'Employees': Employee,
                    }
                    count = model_map[entity].objects.filter(tenant_id=tenant_id).count()
                    created = created_counts.get(entity, 0)
                    if created > 0:
                        self.stdout.write(self.style.SUCCESS(f"   ✅ {entity}: {count} (created {created})"))
                    else:
                        self.stdout.write(f"   {entity}: {count}")
                
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"User {email} not found"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error: {str(e)}"))