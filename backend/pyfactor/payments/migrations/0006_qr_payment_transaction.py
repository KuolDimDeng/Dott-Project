# Generated migration for QRPaymentTransaction model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('payments', '0005_add_default_providers'),
    ]

    operations = [
        migrations.CreateModel(
            name='QRPaymentTransaction',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('tenant_id', models.CharField(db_index=True, max_length=50)),
                ('transaction_id', models.CharField(db_index=True, max_length=100, unique=True)),
                ('business_id', models.UUIDField(db_index=True)),
                ('business_name', models.CharField(max_length=255)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=15)),
                ('currency', models.CharField(default='USD', max_length=3)),
                ('tax', models.DecimalField(decimal_places=2, default=0, max_digits=15)),
                ('subtotal', models.DecimalField(decimal_places=2, max_digits=15)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('completed', 'Completed'), ('failed', 'Failed'), ('expired', 'Expired'), ('cancelled', 'Cancelled')], default='pending', max_length=20)),
                ('items', models.JSONField(default=list, help_text='List of items with name, quantity, price')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('expires_at', models.DateTimeField(help_text='Transaction expiry time (5 minutes from creation)')),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('stripe_payment_intent_id', models.CharField(blank=True, max_length=255, null=True)),
                ('gateway_transaction_id', models.CharField(blank=True, max_length=255, null=True)),
                ('gateway_response', models.JSONField(blank=True, default=dict)),
                ('customer_name', models.CharField(blank=True, max_length=255, null=True)),
                ('customer_email', models.EmailField(blank=True, null=True)),
                ('customer_phone', models.CharField(blank=True, max_length=20, null=True)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='qr_payment_transactions', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'payments_qr_transaction',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='qrpaymenttransaction',
            index=models.Index(fields=['tenant_id', 'user'], name='payments_qr_tenant__c9f8a1_idx'),
        ),
        migrations.AddIndex(
            model_name='qrpaymenttransaction',
            index=models.Index(fields=['transaction_id'], name='payments_qr_transac_4d7b2e_idx'),
        ),
        migrations.AddIndex(
            model_name='qrpaymenttransaction',
            index=models.Index(fields=['business_id', 'status'], name='payments_qr_busines_8a3f5c_idx'),
        ),
        migrations.AddIndex(
            model_name='qrpaymenttransaction',
            index=models.Index(fields=['status', 'expires_at'], name='payments_qr_status__6e9b4d_idx'),
        ),
    ]