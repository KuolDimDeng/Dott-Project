# Fixed migration - combined TaxFiling creation and field additions to resolve KeyError
# This migration was causing KeyError: ('taxes', 'taxfiling') because the TaxFiling model
# was never properly created through migrations.

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid
from django_countries.fields import CountryField


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('taxes', '0014_add_tenant_tax_settings'),
    ]

    operations = [
        # First create the TaxFiling model that was missing
        migrations.CreateModel(
            name='TaxFiling',
            fields=[
                ('filing_id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('tenant_id', models.CharField(db_index=True, max_length=255)),
                ('tax_type', models.CharField(choices=[('sales', 'Sales Tax'), ('payroll', 'Payroll Tax'), ('income', 'Income Tax'), ('franchise', 'Franchise Tax'), ('w2', 'W-2 Forms'), ('1099', '1099 Forms')], max_length=20)),
                ('service_type', models.CharField(choices=[('full', 'Full Service'), ('self', 'Self Service')], max_length=10)),
                ('filing_period', models.CharField(max_length=50)),
                ('filing_year', models.IntegerField()),
                ('period_start', models.DateField()),
                ('period_end', models.DateField()),
                ('jurisdiction', models.CharField(max_length=255)),
                ('status', models.CharField(choices=[('draft', 'Draft'), ('pending_review', 'Pending Review'), ('ready_to_file', 'Ready to File'), ('filing', 'Filing in Progress'), ('filed', 'Filed'), ('accepted', 'Accepted'), ('rejected', 'Rejected'), ('amended', 'Amended')], default='draft', max_length=20)),
                ('gross_receipts', models.DecimalField(decimal_places=2, default=0, max_digits=15)),
                ('taxable_amount', models.DecimalField(decimal_places=2, default=0, max_digits=15)),
                ('tax_amount', models.DecimalField(decimal_places=2, default=0, max_digits=15)),
                ('due_date', models.DateField()),
                ('filed_date', models.DateField(blank=True, null=True)),
                ('confirmation_number', models.CharField(blank=True, max_length=100)),
                ('payment_method', models.CharField(blank=True, max_length=50)),
                ('payment_date', models.DateField(blank=True, null=True)),
                ('payment_confirmation', models.CharField(blank=True, max_length=100)),
                ('preparer_notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('price', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('country', CountryField(blank=True)),
                ('filing_type_service', models.CharField(blank=True, choices=[('manual', 'Manual Filing'), ('online', 'Online Filing')], max_length=20)),
                ('period_type', models.CharField(blank=True, choices=[('monthly', 'Monthly'), ('quarterly', 'Quarterly'), ('annual', 'Annual')], max_length=20)),
                ('period_month', models.IntegerField(blank=True, null=True)),
                ('period_quarter', models.IntegerField(blank=True, choices=[(1, 'Q1'), (2, 'Q2'), (3, 'Q3'), (4, 'Q4')], null=True)),
                ('stripe_payment_intent_id', models.CharField(blank=True, max_length=255)),
                ('tax_report_url', models.URLField(blank=True, max_length=500)),
                ('payment_status', models.CharField(choices=[('pending', 'Pending'), ('paid', 'Paid'), ('failed', 'Failed'), ('refunded', 'Refunded')], default='pending', max_length=20)),
                # Add the filing service fields directly during creation
                ('region_code', models.CharField(blank=True, help_text='Region/State code for sub-national filings (e.g., CA for California)', max_length=10)),
                ('filing_fee', models.DecimalField(decimal_places=2, default=0, help_text='Filing service fee charged', max_digits=10)),
                ('special_instructions', models.TextField(blank=True, help_text='Special instructions from the user')),
                ('total_sales', models.DecimalField(decimal_places=2, default=0, help_text='Total sales for the period', max_digits=15)),
                ('taxable_sales', models.DecimalField(decimal_places=2, default=0, help_text='Taxable sales for the period', max_digits=15)),
                ('tax_collected', models.DecimalField(decimal_places=2, default=0, help_text='Tax collected for the period', max_digits=15)),
                ('tax_rate', models.DecimalField(decimal_places=4, default=0, help_text='Applied tax rate', max_digits=5)),
                # Foreign key relationships
                ('assigned_preparer', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='prepared_filings', to=settings.AUTH_USER_MODEL)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_filings', to=settings.AUTH_USER_MODEL)),
                ('state', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='taxes.state')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='tax_filings', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-filing_year', '-period_end'],
                'indexes': [
                    models.Index(fields=['tenant_id', 'tax_type', 'status'], name='taxes_taxfiling_tenant_tax_status_idx'),
                    models.Index(fields=['due_date', 'status'], name='taxes_taxfiling_due_status_idx'),
                ],
            },
        ),
    ]