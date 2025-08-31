"""
Add BusinessInteraction model for unified marketplace interactions
"""
from django.db import migrations, models
import django.db.models.deletion
from django.contrib.postgres.fields import JSONField
from django.utils import timezone
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('marketplace', '0002_consumerorder_orderreview'),
        ('users', '0127_business_interaction_config'),
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.CreateModel(
            name='BusinessInteraction',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('reference_number', models.CharField(db_index=True, max_length=20, unique=True)),
                ('interaction_type', models.CharField(
                    choices=[
                        ('order', 'ORDER'),
                        ('booking', 'BOOKING'),
                        ('rental', 'RENTAL'),
                        ('service', 'SERVICE'),
                        ('quote', 'QUOTE'),
                        ('subscription', 'SUBSCRIPTION'),
                        ('application', 'APPLICATION'),
                        ('registration', 'REGISTRATION'),
                        ('consultation', 'CONSULTATION')
                    ],
                    db_index=True,
                    max_length=20
                )),
                ('status', models.CharField(db_index=True, default='pending', max_length=30)),
                ('created_at', models.DateTimeField(db_index=True, default=timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('start_datetime', models.DateTimeField(blank=True, db_index=True, null=True)),
                ('end_datetime', models.DateTimeField(blank=True, null=True)),
                ('duration_minutes', models.IntegerField(blank=True, null=True)),
                ('location_type', models.CharField(
                    choices=[
                        ('online', 'Online'),
                        ('business', 'At Business Location'),
                        ('customer', 'At Customer Location'),
                        ('other', 'Other Location')
                    ],
                    default='business',
                    max_length=20
                )),
                ('location_address', models.TextField(blank=True)),
                ('location_coordinates', JSONField(blank=True, default=dict)),
                ('currency', models.CharField(default='USD', max_length=3)),
                ('subtotal', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('tax_amount', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('service_fee', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('delivery_fee', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('discount_amount', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('total_amount', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('payment_status', models.CharField(
                    choices=[
                        ('pending', 'Pending'),
                        ('partial', 'Partially Paid'),
                        ('paid', 'Paid'),
                        ('failed', 'Failed'),
                        ('refunded', 'Refunded')
                    ],
                    db_index=True,
                    default='pending',
                    max_length=20
                )),
                ('payment_method', models.CharField(blank=True, max_length=30)),
                ('payment_intent_id', models.CharField(blank=True, max_length=200)),
                ('paid_at', models.DateTimeField(blank=True, null=True)),
                ('items', JSONField(default=list)),
                ('metadata', JSONField(default=dict)),
                ('customer_name', models.CharField(blank=True, max_length=100)),
                ('customer_email', models.EmailField(blank=True, max_length=254)),
                ('customer_phone', models.CharField(blank=True, max_length=20)),
                ('customer_notes', models.TextField(blank=True)),
                ('service_address', models.TextField(blank=True)),
                ('service_coordinates', JSONField(blank=True, default=dict)),
                ('consumer_rating', models.IntegerField(blank=True, null=True)),
                ('consumer_review', models.TextField(blank=True)),
                ('business_rating', models.IntegerField(blank=True, null=True)),
                ('business_notes', models.TextField(blank=True)),
                ('cancelled_at', models.DateTimeField(blank=True, null=True)),
                ('cancellation_reason', models.TextField(blank=True)),
                ('cancellation_fee', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('refunded_at', models.DateTimeField(blank=True, null=True)),
                ('refund_amount', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('refund_reason', models.TextField(blank=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('chat_conversation_id', models.UUIDField(blank=True, null=True)),
                ('created_from_chat', models.BooleanField(default=False)),
                ('is_recurring', models.BooleanField(default=False)),
                ('recurrence_pattern', models.CharField(
                    blank=True,
                    choices=[
                        ('daily', 'Daily'),
                        ('weekly', 'Weekly'),
                        ('biweekly', 'Bi-weekly'),
                        ('monthly', 'Monthly'),
                        ('quarterly', 'Quarterly'),
                        ('annual', 'Annual')
                    ],
                    max_length=20
                )),
                ('platform_fee', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('business', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='business_interactions', to='users.business')),
                ('cancelled_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='cancelled_interactions', to='auth.user')),
                ('consumer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='consumer_interactions', to='auth.user')),
                ('parent_interaction', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='child_interactions', to='marketplace.businessinteraction')),
                ('staff_member', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='staff_interactions', to='auth.user')),
            ],
            options={
                'db_table': 'marketplace_business_interactions',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='InteractionStatusHistory',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('from_status', models.CharField(max_length=30)),
                ('to_status', models.CharField(max_length=30)),
                ('changed_at', models.DateTimeField(default=timezone.now)),
                ('notes', models.TextField(blank=True)),
                ('changed_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='auth.user')),
                ('interaction', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='status_history', to='marketplace.businessinteraction')),
            ],
            options={
                'db_table': 'marketplace_interaction_status_history',
                'ordering': ['-changed_at'],
            },
        ),
        migrations.CreateModel(
            name='InteractionDocument',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('document_type', models.CharField(
                    choices=[
                        ('contract', 'Contract'),
                        ('invoice', 'Invoice'),
                        ('receipt', 'Receipt'),
                        ('photo', 'Photo'),
                        ('id', 'ID Document'),
                        ('insurance', 'Insurance'),
                        ('other', 'Other')
                    ],
                    max_length=20
                )),
                ('file_url', models.URLField()),
                ('file_name', models.CharField(max_length=255)),
                ('file_size', models.IntegerField()),
                ('uploaded_at', models.DateTimeField(default=timezone.now)),
                ('interaction', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='documents', to='marketplace.businessinteraction')),
                ('uploaded_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='auth.user')),
            ],
            options={
                'db_table': 'marketplace_interaction_documents',
                'ordering': ['-uploaded_at'],
            },
        ),
        migrations.AddIndex(
            model_name='businessinteraction',
            index=models.Index(fields=['consumer', '-created_at'], name='marketplace_consume_b92d7b_idx'),
        ),
        migrations.AddIndex(
            model_name='businessinteraction',
            index=models.Index(fields=['business', '-created_at'], name='marketplace_busines_f62d68_idx'),
        ),
        migrations.AddIndex(
            model_name='businessinteraction',
            index=models.Index(fields=['interaction_type', 'status'], name='marketplace_interac_8e4d5a_idx'),
        ),
        migrations.AddIndex(
            model_name='businessinteraction',
            index=models.Index(fields=['reference_number'], name='marketplace_referen_c4a9d2_idx'),
        ),
        migrations.AddIndex(
            model_name='businessinteraction',
            index=models.Index(fields=['start_datetime', 'end_datetime'], name='marketplace_start_d_e8b3f1_idx'),
        ),
        migrations.AddIndex(
            model_name='businessinteraction',
            index=models.Index(fields=['payment_status'], name='marketplace_payment_7c2e5d_idx'),
        ),
    ]