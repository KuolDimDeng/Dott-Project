# Generated migration for POS models

import uuid
from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0007_salesorder_discount_percentage_and_more'),
        ('inventory', '0001_initial'),
        ('crm', '0001_initial'),
        ('finance', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='POSTransaction',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('tenant_id', models.UUIDField(db_index=True, null=True)),
                ('transaction_number', models.CharField(editable=False, max_length=50, unique=True)),
                ('subtotal', models.DecimalField(decimal_places=4, default=0, max_digits=15)),
                ('discount_amount', models.DecimalField(decimal_places=4, default=0, max_digits=15)),
                ('discount_percentage', models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ('tax_total', models.DecimalField(decimal_places=4, default=0, max_digits=15)),
                ('total_amount', models.DecimalField(decimal_places=4, max_digits=15)),
                ('payment_method', models.CharField(choices=[('cash', 'Cash'), ('card', 'Credit/Debit Card'), ('mobile_money', 'Mobile Money'), ('bank_transfer', 'Bank Transfer'), ('check', 'Check'), ('store_credit', 'Store Credit')], max_length=20)),
                ('amount_tendered', models.DecimalField(blank=True, decimal_places=4, max_digits=15, null=True)),
                ('change_due', models.DecimalField(decimal_places=4, default=0, max_digits=15)),
                ('status', models.CharField(choices=[('completed', 'Completed'), ('voided', 'Voided'), ('refunded', 'Refunded'), ('partial_refund', 'Partially Refunded')], default='completed', max_length=20)),
                ('notes', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('voided_at', models.DateTimeField(blank=True, null=True)),
                ('void_reason', models.TextField(blank=True, null=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='pos_transactions_created', to=settings.AUTH_USER_MODEL)),
                ('customer', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='pos_transactions', to='crm.customer')),
                ('invoice', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='pos_transaction', to='sales.invoice')),
                ('journal_entry', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='finance.journalentry')),
                ('voided_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='pos_transactions_voided', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'sales_pos_transaction',
            },
        ),
        migrations.CreateModel(
            name='POSTransactionItem',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('tenant_id', models.UUIDField(db_index=True, null=True)),
                ('item_name', models.CharField(max_length=255)),
                ('item_sku', models.CharField(blank=True, max_length=100, null=True)),
                ('quantity', models.DecimalField(decimal_places=3, max_digits=10)),
                ('unit_price', models.DecimalField(decimal_places=4, max_digits=15)),
                ('line_discount', models.DecimalField(decimal_places=4, default=0, max_digits=15)),
                ('line_discount_percentage', models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ('tax_rate', models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ('tax_amount', models.DecimalField(decimal_places=4, default=0, max_digits=15)),
                ('tax_inclusive', models.BooleanField(default=False)),
                ('line_total', models.DecimalField(decimal_places=4, default=0, max_digits=15)),
                ('cost_price', models.DecimalField(blank=True, decimal_places=4, max_digits=15, null=True)),
                ('product', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to='inventory.product')),
                ('service', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to='inventory.service')),
                ('transaction', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='sales.postransaction')),
            ],
            options={
                'db_table': 'sales_pos_transaction_item',
            },
        ),
        migrations.CreateModel(
            name='POSRefund',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('tenant_id', models.UUIDField(db_index=True, null=True)),
                ('refund_number', models.CharField(editable=False, max_length=50)),
                ('refund_type', models.CharField(choices=[('full', 'Full Refund'), ('partial', 'Partial Refund'), ('exchange', 'Exchange')], max_length=10)),
                ('total_amount', models.DecimalField(decimal_places=4, max_digits=15)),
                ('tax_amount', models.DecimalField(decimal_places=4, default=0, max_digits=15)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('approved', 'Approved'), ('processed', 'Processed'), ('cancelled', 'Cancelled')], default='pending', max_length=20)),
                ('reason', models.TextField()),
                ('notes', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('approved_at', models.DateTimeField(blank=True, null=True)),
                ('processed_at', models.DateTimeField(blank=True, null=True)),
                ('approved_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='pos_refunds_approved', to=settings.AUTH_USER_MODEL)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='pos_refunds_created', to=settings.AUTH_USER_MODEL)),
                ('journal_entry', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='finance.journalentry')),
                ('original_transaction', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='refunds', to='sales.postransaction')),
            ],
            options={
                'db_table': 'sales_pos_refund',
            },
        ),
        migrations.CreateModel(
            name='POSRefundItem',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('tenant_id', models.UUIDField(db_index=True, null=True)),
                ('quantity_returned', models.DecimalField(decimal_places=3, max_digits=10)),
                ('unit_refund_amount', models.DecimalField(decimal_places=4, max_digits=15)),
                ('total_refund_amount', models.DecimalField(decimal_places=4, max_digits=15)),
                ('condition', models.CharField(blank=True, max_length=50, null=True)),
                ('original_item', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='sales.postransactionitem')),
                ('refund', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='sales.posrefund')),
            ],
            options={
                'db_table': 'sales_pos_refund_item',
            },
        ),
        migrations.AddIndex(
            model_name='postransaction',
            index=models.Index(fields=['tenant_id', 'transaction_number'], name='sales_pos_t_tenant__59d8dd_idx'),
        ),
        migrations.AddIndex(
            model_name='postransaction',
            index=models.Index(fields=['tenant_id', 'customer'], name='sales_pos_t_tenant__b6be75_idx'),
        ),
        migrations.AddIndex(
            model_name='postransaction',
            index=models.Index(fields=['tenant_id', 'payment_method'], name='sales_pos_t_tenant__f11b09_idx'),
        ),
        migrations.AddIndex(
            model_name='postransaction',
            index=models.Index(fields=['tenant_id', 'status'], name='sales_pos_t_tenant__ca6af0_idx'),
        ),
        migrations.AddIndex(
            model_name='postransaction',
            index=models.Index(fields=['tenant_id', 'created_at'], name='sales_pos_t_tenant__9e1925_idx'),
        ),
        migrations.AddConstraint(
            model_name='postransaction',
            constraint=models.UniqueConstraint(fields=('tenant_id', 'transaction_number'), name='unique_pos_transaction_number_per_tenant'),
        ),
        migrations.AddIndex(
            model_name='postransactionitem',
            index=models.Index(fields=['tenant_id', 'transaction'], name='sales_pos_t_tenant__4a28f4_idx'),
        ),
        migrations.AddIndex(
            model_name='postransactionitem',
            index=models.Index(fields=['tenant_id', 'product'], name='sales_pos_t_tenant__1f3b8b_idx'),
        ),
        migrations.AddIndex(
            model_name='postransactionitem',
            index=models.Index(fields=['tenant_id', 'service'], name='sales_pos_t_tenant__9d1e47_idx'),
        ),
        migrations.AddIndex(
            model_name='posrefund',
            index=models.Index(fields=['tenant_id', 'refund_number'], name='sales_pos_r_tenant__2c8b91_idx'),
        ),
        migrations.AddIndex(
            model_name='posrefund',
            index=models.Index(fields=['tenant_id', 'original_transaction'], name='sales_pos_r_tenant__d5b392_idx'),
        ),
        migrations.AddIndex(
            model_name='posrefund',
            index=models.Index(fields=['tenant_id', 'status'], name='sales_pos_r_tenant__0fb4c3_idx'),
        ),
        migrations.AddIndex(
            model_name='posrefund',
            index=models.Index(fields=['tenant_id', 'created_at'], name='sales_pos_r_tenant__9a7b4f_idx'),
        ),
        migrations.AddConstraint(
            model_name='posrefund',
            constraint=models.UniqueConstraint(fields=('tenant_id', 'refund_number'), name='unique_pos_refund_number_per_tenant'),
        ),
        migrations.AddIndex(
            model_name='posrefunditem',
            index=models.Index(fields=['tenant_id', 'refund'], name='sales_pos_r_tenant__a7c8b5_idx'),
        ),
        migrations.AddIndex(
            model_name='posrefunditem',
            index=models.Index(fields=['tenant_id', 'original_item'], name='sales_pos_r_tenant__f2d8a1_idx'),
        ),
    ]