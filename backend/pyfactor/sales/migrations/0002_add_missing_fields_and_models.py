# Generated manually to align Django models with RLS database schema

import django.core.validators
import django.db.models.deletion
import django.utils.timezone
import sales.models
import uuid
from decimal import Decimal
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0001_initial'),
        ('crm', '0003_rename_accountnumber_customer_account_number_and_more'),
    ]

    operations = [
        # Create SalesTax model to match sales_tax table
        migrations.CreateModel(
            name='SalesTax',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('tenant_id', models.UUIDField(db_index=True, help_text='The tenant ID this record belongs to. Used by Row Level Security.', null=True)),
                ('name', models.CharField(max_length=100)),
                ('rate', models.DecimalField(decimal_places=2, max_digits=5)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'sales_tax',
                'indexes': [
                    models.Index(fields=['tenant_id', 'name'], name='sales_tax_tenant_name_idx'),
                ],
            },
        ),

        # Create SalesProduct model to match sales_product table
        migrations.CreateModel(
            name='SalesProduct',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('tenant_id', models.UUIDField(db_index=True, help_text='The tenant ID this record belongs to. Used by Row Level Security.', null=True)),
                ('name', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True, null=True)),
                ('sku', models.CharField(max_length=100, blank=True, null=True)),
                ('unit_price', models.DecimalField(decimal_places=4, max_digits=19)),
                ('cost_price', models.DecimalField(decimal_places=4, max_digits=19, blank=True, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('tax', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='sales.salestax')),
            ],
            options={
                'db_table': 'sales_product',
                'indexes': [
                    models.Index(fields=['tenant_id', 'sku'], name='sales_product_tenant_sku_idx'),
                ],
            },
        ),

        # Add missing fields to Invoice model
        migrations.AddField(
            model_name='invoice',
            name='invoice_date',
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
        migrations.AddField(
            model_name='invoice',
            name='subtotal',
            field=models.DecimalField(decimal_places=4, max_digits=19, default=0),
        ),
        migrations.AddField(
            model_name='invoice',
            name='tax_total',
            field=models.DecimalField(decimal_places=4, max_digits=19, default=0),
        ),
        migrations.AddField(
            model_name='invoice',
            name='total',
            field=models.DecimalField(decimal_places=4, max_digits=19, default=0),
        ),
        migrations.AddField(
            model_name='invoice',
            name='amount_paid',
            field=models.DecimalField(decimal_places=4, max_digits=19, default=0),
        ),
        migrations.AddField(
            model_name='invoice',
            name='balance_due',
            field=models.DecimalField(decimal_places=4, max_digits=19, default=0),
        ),
        migrations.AddField(
            model_name='invoice',
            name='notes',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='invoice',
            name='terms',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='invoice',
            name='sales_order',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='sales.salesorder'),
        ),

        # Add tenant_id to InvoiceItem
        migrations.AddField(
            model_name='invoiceitem',
            name='tenant_id',
            field=models.UUIDField(db_index=True, help_text='The tenant ID this record belongs to. Used by Row Level Security.', null=True),
        ),

        # Add missing fields to InvoiceItem
        migrations.AddField(
            model_name='invoiceitem',
            name='tax_rate',
            field=models.DecimalField(decimal_places=2, max_digits=5, blank=True, null=True),
        ),
        migrations.AddField(
            model_name='invoiceitem',
            name='tax_amount',
            field=models.DecimalField(decimal_places=4, max_digits=19, blank=True, null=True),
        ),
        migrations.AddField(
            model_name='invoiceitem',
            name='total',
            field=models.DecimalField(decimal_places=4, max_digits=19, default=0),
        ),

        # Add tenant_id to Estimate
        migrations.AddField(
            model_name='estimate',
            name='tenant_id',
            field=models.UUIDField(db_index=True, help_text='The tenant ID this record belongs to. Used by Row Level Security.', null=True),
        ),

        # Add missing fields to Estimate
        migrations.AddField(
            model_name='estimate',
            name='estimate_date',
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
        migrations.AddField(
            model_name='estimate',
            name='expiry_date',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='estimate',
            name='status',
            field=models.CharField(max_length=50, default='draft'),
        ),
        migrations.AddField(
            model_name='estimate',
            name='subtotal',
            field=models.DecimalField(decimal_places=4, max_digits=19, default=0),
        ),
        migrations.AddField(
            model_name='estimate',
            name='tax_total',
            field=models.DecimalField(decimal_places=4, max_digits=19, default=0),
        ),
        migrations.AddField(
            model_name='estimate',
            name='total',
            field=models.DecimalField(decimal_places=4, max_digits=19, default=0),
        ),
        migrations.AddField(
            model_name='estimate',
            name='notes',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='estimate',
            name='terms',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='estimate',
            name='created_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL),
        ),

        # Add tenant_id to EstimateItem
        migrations.AddField(
            model_name='estimateitem',
            name='tenant_id',
            field=models.UUIDField(db_index=True, help_text='The tenant ID this record belongs to. Used by Row Level Security.', null=True),
        ),

        # Add missing fields to EstimateItem
        migrations.AddField(
            model_name='estimateitem',
            name='tax_rate',
            field=models.DecimalField(decimal_places=2, max_digits=5, blank=True, null=True),
        ),
        migrations.AddField(
            model_name='estimateitem',
            name='tax_amount',
            field=models.DecimalField(decimal_places=4, max_digits=19, blank=True, null=True),
        ),
        migrations.AddField(
            model_name='estimateitem',
            name='total',
            field=models.DecimalField(decimal_places=4, max_digits=19, default=0),
        ),

        # Add tenant_id to EstimateAttachment
        migrations.AddField(
            model_name='estimateattachment',
            name='tenant_id',
            field=models.UUIDField(db_index=True, help_text='The tenant ID this record belongs to. Used by Row Level Security.', null=True),
        ),

        # Add missing fields to SalesOrder
        migrations.AddField(
            model_name='salesorder',
            name='order_date',
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
        migrations.AddField(
            model_name='salesorder',
            name='status',
            field=models.CharField(max_length=50, default='pending'),
        ),
        migrations.AddField(
            model_name='salesorder',
            name='subtotal',
            field=models.DecimalField(decimal_places=4, max_digits=19, default=0),
        ),
        migrations.AddField(
            model_name='salesorder',
            name='tax_total',
            field=models.DecimalField(decimal_places=4, max_digits=19, default=0),
        ),
        migrations.AddField(
            model_name='salesorder',
            name='total',
            field=models.DecimalField(decimal_places=4, max_digits=19, default=0),
        ),
        migrations.AddField(
            model_name='salesorder',
            name='notes',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='salesorder',
            name='estimate',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='sales.estimate'),
        ),

        # Add missing fields to SalesOrderItem
        migrations.AddField(
            model_name='salesorderitem',
            name='tax_rate',
            field=models.DecimalField(decimal_places=2, max_digits=5, blank=True, null=True),
        ),
        migrations.AddField(
            model_name='salesorderitem',
            name='tax_amount',
            field=models.DecimalField(decimal_places=4, max_digits=19, blank=True, null=True),
        ),
        migrations.AddField(
            model_name='salesorderitem',
            name='total',
            field=models.DecimalField(decimal_places=4, max_digits=19, default=0),
        ),

        # Add tenant_id to Refund
        migrations.AddField(
            model_name='refund',
            name='tenant_id',
            field=models.UUIDField(db_index=True, help_text='The tenant ID this record belongs to. Used by Row Level Security.', null=True),
        ),

        # Add tenant_id to RefundItem
        migrations.AddField(
            model_name='refunditem',
            name='tenant_id',
            field=models.UUIDField(db_index=True, help_text='The tenant ID this record belongs to. Used by Row Level Security.', null=True),
        ),

        # Update db_table for models to match SQL schema
        migrations.AlterModelTable(
            name='invoice',
            table='sales_invoice',
        ),
        migrations.AlterModelTable(
            name='invoiceitem',
            table='sales_invoiceitem',
        ),
        migrations.AlterModelTable(
            name='estimate',
            table='sales_estimate',
        ),
        migrations.AlterModelTable(
            name='estimateitem',
            table='sales_estimateitem',
        ),
        migrations.AlterModelTable(
            name='salesorder',
            table='sales_salesorder',
        ),
        migrations.AlterModelTable(
            name='salesorderitem',
            table='sales_salesorderitem',
        ),

        # Add indexes for tenant_id on all models
        migrations.AddIndex(
            model_name='invoiceitem',
            index=models.Index(fields=['tenant_id', 'invoice'], name='sales_invoiceitem_tenant_idx'),
        ),
        migrations.AddIndex(
            model_name='estimate',
            index=models.Index(fields=['tenant_id', 'estimate_num'], name='sales_estimate_tenant_idx'),
        ),
        migrations.AddIndex(
            model_name='estimateitem',
            index=models.Index(fields=['tenant_id', 'estimate'], name='sales_estimateitem_tenant_idx'),
        ),
        migrations.AddIndex(
            model_name='estimateattachment',
            index=models.Index(fields=['tenant_id', 'estimate'], name='sales_estimateattach_tenant_idx'),
        ),
        migrations.AddIndex(
            model_name='refund',
            index=models.Index(fields=['tenant_id', 'sale'], name='sales_refund_tenant_idx'),
        ),
        migrations.AddIndex(
            model_name='refunditem',
            index=models.Index(fields=['tenant_id', 'refund'], name='sales_refunditem_tenant_idx'),
        ),
    ]