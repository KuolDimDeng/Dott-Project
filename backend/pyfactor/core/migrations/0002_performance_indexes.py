# Generated performance optimization indexes
from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('core', '0001_initial'),
        ('users', '0001_initial'),
        ('accounting', '0001_initial'),
        ('inventory', '0001_initial'),
        ('hr', '0001_initial'),
    ]

    operations = [
        # Business-related indexes
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_business_tenant_id ON public.business(tenant_id);",
            reverse_sql="DROP INDEX IF EXISTS idx_business_tenant_id;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_business_created_at ON public.business(created_at DESC);",
            reverse_sql="DROP INDEX IF EXISTS idx_business_created_at;"
        ),
        
        # User profile indexes
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_userprofile_business_id ON public.users_userprofile(business_id);",
            reverse_sql="DROP INDEX IF EXISTS idx_userprofile_business_id;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_userprofile_user_business ON public.users_userprofile(user_id, business_id);",
            reverse_sql="DROP INDEX IF EXISTS idx_userprofile_user_business;"
        ),
        
        # Invoice indexes for fast lookups
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_invoice_business_date ON public.accounting_invoice(business_id, date DESC);",
            reverse_sql="DROP INDEX IF EXISTS idx_invoice_business_date;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_invoice_status_business ON public.accounting_invoice(status, business_id);",
            reverse_sql="DROP INDEX IF EXISTS idx_invoice_status_business;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_invoice_customer_business ON public.accounting_invoice(customer_id, business_id);",
            reverse_sql="DROP INDEX IF EXISTS idx_invoice_customer_business;"
        ),
        
        # Customer indexes
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_customer_business_name ON public.accounting_customer(business_id, name);",
            reverse_sql="DROP INDEX IF EXISTS idx_customer_business_name;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_customer_email_business ON public.accounting_customer(email, business_id);",
            reverse_sql="DROP INDEX IF EXISTS idx_customer_email_business;"
        ),
        
        # Product/Service indexes
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_product_business_active ON public.inventory_product(business_id, is_active);",
            reverse_sql="DROP INDEX IF EXISTS idx_product_business_active;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_service_business_active ON public.inventory_service(business_id, is_active);",
            reverse_sql="DROP INDEX IF EXISTS idx_service_business_active;"
        ),
        
        # Employee indexes
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_employee_business_active ON public.hr_employee(business_id, is_active);",
            reverse_sql="DROP INDEX IF EXISTS idx_employee_business_active;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_employee_user_business ON public.hr_employee(user_id, business_id);",
            reverse_sql="DROP INDEX IF EXISTS idx_employee_user_business;"
        ),
        
        # Transaction/Activity indexes
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_transaction_business_date ON public.accounting_transaction(business_id, date DESC);",
            reverse_sql="DROP INDEX IF EXISTS idx_transaction_business_date;"
        ),
        
        # Session indexes (already exists but let's ensure)
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_session_user_active ON public.api_session(user_id, is_active);",
            reverse_sql="DROP INDEX IF EXISTS idx_session_user_active;"
        ),
        
        # Notification indexes
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_notification_user_read ON public.notifications_usernotification(user_id, is_read, created_at DESC);",
            reverse_sql="DROP INDEX IF EXISTS idx_notification_user_read;"
        ),
        
        # Full-text search indexes for common searches
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_customer_search ON public.accounting_customer USING gin(to_tsvector('english', name || ' ' || COALESCE(email, '')));",
            reverse_sql="DROP INDEX IF EXISTS idx_customer_search;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_product_search ON public.inventory_product USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));",
            reverse_sql="DROP INDEX IF EXISTS idx_product_search;"
        ),
    ]