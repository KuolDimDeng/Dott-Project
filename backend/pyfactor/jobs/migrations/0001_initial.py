# Generated manually for job costing models

from django.conf import settings
import django.core.validators
from django.db import migrations, models
import django.db.models.deletion
from django.utils import timezone
from decimal import Decimal

class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('crm', '0001_initial'),
        ('hr', '0001_initial'),
        ('inventory', '0009_add_inventory_type_and_supply_fields'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('events', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Job',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tenant_id', models.UUIDField(db_index=True)),
                ('job_number', models.CharField(max_length=50, unique=True)),
                ('name', models.CharField(max_length=200)),
                ('description', models.TextField(blank=True)),
                ('status', models.CharField(choices=[('quote', 'Quote'), ('scheduled', 'Scheduled'), ('in_progress', 'In Progress'), ('completed', 'Completed'), ('invoiced', 'Invoiced'), ('paid', 'Paid'), ('cancelled', 'Cancelled')], default='quote', max_length=20)),
                ('quote_date', models.DateField(default=timezone.now)),
                ('scheduled_date', models.DateField(blank=True, null=True)),
                ('start_date', models.DateField(blank=True, null=True)),
                ('completion_date', models.DateField(blank=True, null=True)),
                ('quoted_amount', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('labor_rate', models.DecimalField(decimal_places=2, default=0, help_text='Hourly labor rate for this job', max_digits=6)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('assigned_to', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='assigned_jobs', to='hr.employee')),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='jobs_created', to=settings.AUTH_USER_MODEL)),
                ('customer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='jobs', to='crm.customer')),
            ],
            options={
                'indexes': [
                    models.Index(fields=['tenant_id', 'status'], name='jobs_job_tenant__1e4b36_idx'),
                    models.Index(fields=['tenant_id', 'customer'], name='jobs_job_tenant__bb7e12_idx'),
                    models.Index(fields=['tenant_id', 'job_number'], name='jobs_job_tenant__d0f7af_idx'),
                ],
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='JobExpense',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tenant_id', models.UUIDField(db_index=True)),
                ('expense_type', models.CharField(choices=[('permit', 'Permit/License'), ('subcontractor', 'Subcontractor'), ('equipment_rental', 'Equipment Rental'), ('travel', 'Travel'), ('other', 'Other')], max_length=20)),
                ('description', models.CharField(max_length=200)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('is_billable', models.BooleanField(default=True)),
                ('markup_percentage', models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ('expense_date', models.DateField(default=timezone.now)),
                ('vendor_name', models.CharField(blank=True, max_length=200)),
                ('receipt_number', models.CharField(blank=True, max_length=100)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('added_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ('job', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='expenses', to='jobs.job')),
            ],
            options={
                'indexes': [
                    models.Index(fields=['tenant_id', 'job'], name='jobs_jobexp_tenant__0b86fc_idx'),
                    models.Index(fields=['tenant_id', 'expense_type'], name='jobs_jobexp_tenant__cc7b91_idx'),
                ],
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='JobInvoice',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tenant_id', models.UUIDField(db_index=True)),
                ('includes_materials', models.BooleanField(default=True)),
                ('includes_labor', models.BooleanField(default=True)),
                ('includes_expenses', models.BooleanField(default=True)),
                ('materials_percentage', models.DecimalField(decimal_places=2, default=100, help_text='Percentage of materials to bill', max_digits=5)),
                ('labor_percentage', models.DecimalField(decimal_places=2, default=100, help_text='Percentage of labor to bill', max_digits=5)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('invoice', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='job_links', to='sales.invoice')),
                ('job', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='job_invoices', to='jobs.job')),
            ],
            options={
                'indexes': [
                    models.Index(fields=['tenant_id', 'job'], name='jobs_jobinv_tenant__2a8749_idx'),
                    models.Index(fields=['tenant_id', 'invoice'], name='jobs_jobinv_tenant__df8d66_idx'),
                ],
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='JobLabor',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tenant_id', models.UUIDField(db_index=True)),
                ('work_date', models.DateField(default=timezone.now)),
                ('hours', models.DecimalField(decimal_places=2, max_digits=5, validators=[django.core.validators.MinValueValidator(Decimal('0.25'))])),
                ('hourly_rate', models.DecimalField(decimal_places=2, help_text='Hourly rate for this work', max_digits=8)),
                ('work_description', models.TextField(help_text='Description of work performed')),
                ('is_billable', models.BooleanField(default=True)),
                ('is_overtime', models.BooleanField(default=False)),
                ('overtime_multiplier', models.DecimalField(decimal_places=2, default=Decimal('1.5'), max_digits=3)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('employee', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='hr.employee')),
                ('job', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='labor_entries', to='jobs.job')),
            ],
            options={
                'indexes': [
                    models.Index(fields=['tenant_id', 'job'], name='jobs_joblab_tenant__5df7e1_idx'),
                    models.Index(fields=['tenant_id', 'employee'], name='jobs_joblab_tenant__f8c622_idx'),
                    models.Index(fields=['tenant_id', 'work_date'], name='jobs_joblab_tenant__7b4c29_idx'),
                ],
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='JobMaterial',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tenant_id', models.UUIDField(db_index=True)),
                ('quantity', models.DecimalField(decimal_places=2, max_digits=10, validators=[django.core.validators.MinValueValidator(Decimal('0.01'))])),
                ('unit_cost', models.DecimalField(decimal_places=2, help_text='Cost per unit from supplier', max_digits=10)),
                ('unit_price', models.DecimalField(decimal_places=2, help_text='Price per unit to charge customer', max_digits=10)),
                ('markup_percentage', models.DecimalField(decimal_places=2, default=0, help_text='Markup % applied to this material', max_digits=5)),
                ('is_billable', models.BooleanField(default=True)),
                ('notes', models.TextField(blank=True)),
                ('used_date', models.DateField(default=timezone.now)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('added_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ('job', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='materials', to='jobs.job')),
                ('supply', models.ForeignKey(limit_choices_to={'inventory_type': 'supply'}, on_delete=django.db.models.deletion.PROTECT, to='inventory.product')),
            ],
            options={
                'indexes': [
                    models.Index(fields=['tenant_id', 'job'], name='jobs_jobmat_tenant__84bc7c_idx'),
                    models.Index(fields=['tenant_id', 'supply'], name='jobs_jobmat_tenant__9e8543_idx'),
                ],
                'abstract': False,
            },
        ),
        migrations.AlterUniqueTogether(
            name='jobinvoice',
            unique_together={('tenant_id', 'job', 'invoice')},
        ),
    ]