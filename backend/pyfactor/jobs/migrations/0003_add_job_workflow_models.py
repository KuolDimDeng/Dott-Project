# Generated manually for job workflow functionality

from django.db import migrations, models
import django.core.validators
import django.db.models.deletion
import django.utils.timezone
import uuid
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0002_add_recurring_job_fields'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Add new fields to Job model
        migrations.AddField(
            model_name='job',
            name='deposit_amount',
            field=models.DecimalField(decimal_places=2, default=0, help_text='Deposit amount required', max_digits=10),
        ),
        migrations.AddField(
            model_name='job',
            name='deposit_paid',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='job',
            name='final_amount',
            field=models.DecimalField(decimal_places=2, default=0, help_text='Final invoiced amount (may differ from quote)', max_digits=10),
        ),
        migrations.AddField(
            model_name='job',
            name='quote_valid_until',
            field=models.DateField(blank=True, help_text='Quote expiration date', null=True),
        ),
        migrations.AddField(
            model_name='job',
            name='quote_sent_date',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='job',
            name='quote_sent_via',
            field=models.CharField(blank=True, help_text='How quote was sent (email, whatsapp, etc)', max_length=50),
        ),
        migrations.AddField(
            model_name='job',
            name='quote_version',
            field=models.IntegerField(default=1, help_text='Quote revision number'),
        ),
        migrations.AddField(
            model_name='job',
            name='terms_conditions',
            field=models.TextField(blank=True, help_text='Job-specific terms and conditions'),
        ),
        migrations.AddField(
            model_name='job',
            name='customer_signature',
            field=models.TextField(blank=True, help_text='Base64 encoded customer signature'),
        ),
        migrations.AddField(
            model_name='job',
            name='customer_signed_date',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='job',
            name='customer_signed_name',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='job',
            name='supervisor_signature',
            field=models.TextField(blank=True, help_text='Base64 encoded supervisor signature'),
        ),
        migrations.AddField(
            model_name='job',
            name='supervisor_signed_date',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='job',
            name='supervisor_signed_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='supervised_jobs', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='job',
            name='last_customer_contact',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='job',
            name='internal_notes',
            field=models.TextField(blank=True, help_text='Internal notes not visible to customer'),
        ),
        migrations.AddField(
            model_name='job',
            name='invoice_id',
            field=models.CharField(blank=True, help_text='Reference to invoice if created', max_length=50),
        ),
        migrations.AddField(
            model_name='job',
            name='invoice_sent_date',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='job',
            name='payment_received_date',
            field=models.DateTimeField(blank=True, null=True),
        ),
        # Update status choices
        migrations.AlterField(
            model_name='job',
            name='status',
            field=models.CharField(
                choices=[
                    ('quote', 'Quote'),
                    ('approved', 'Approved'),
                    ('scheduled', 'Scheduled'),
                    ('in_transit', 'In Transit'),
                    ('in_progress', 'In Progress'),
                    ('pending_review', 'Pending Review'),
                    ('completed', 'Completed'),
                    ('invoiced', 'Invoiced'),
                    ('paid', 'Paid'),
                    ('closed', 'Closed'),
                    ('cancelled', 'Cancelled'),
                    ('on_hold', 'On Hold'),
                    ('requires_parts', 'Requires Parts'),
                    ('callback_needed', 'Callback Needed'),
                ],
                default='quote',
                max_length=20,
            ),
        ),
        # Create JobDocument model
        migrations.CreateModel(
            name='JobDocument',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tenant_id', models.CharField(blank=True, db_index=True, max_length=64, null=True)),
                ('document_type', models.CharField(
                    choices=[
                        ('contract', 'Contract'),
                        ('receipt', 'Receipt'),
                        ('invoice', 'Vendor Invoice'),
                        ('photo_before', 'Before Photo'),
                        ('photo_progress', 'Progress Photo'),
                        ('photo_after', 'After Photo'),
                        ('permit', 'Permit/License'),
                        ('equipment_rental', 'Equipment Rental'),
                        ('completion_cert', 'Completion Certificate'),
                        ('signature', 'Signature Document'),
                        ('quote', 'Quote Document'),
                        ('change_order', 'Change Order'),
                        ('other', 'Other'),
                    ],
                    max_length=20,
                )),
                ('title', models.CharField(max_length=200)),
                ('description', models.TextField(blank=True)),
                ('file_url', models.URLField(help_text='URL to document in cloud storage')),
                ('file_name', models.CharField(max_length=255)),
                ('file_size', models.IntegerField(help_text='File size in bytes')),
                ('file_type', models.CharField(help_text='MIME type', max_length=50)),
                ('amount', models.DecimalField(blank=True, decimal_places=2, help_text='Amount for receipts/invoices', max_digits=10, null=True)),
                ('vendor_name', models.CharField(blank=True, max_length=200)),
                ('expense_date', models.DateField(blank=True, null=True)),
                ('is_billable', models.BooleanField(default=True, help_text='Can this expense be billed to customer')),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('ocr_extracted_text', models.TextField(blank=True, help_text='Text extracted via OCR')),
                ('ocr_confidence', models.FloatField(blank=True, help_text='OCR confidence score', null=True)),
                ('job', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='documents', to='jobs.job')),
                ('uploaded_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-uploaded_at'],
                'indexes': [
                    models.Index(fields=['tenant_id', 'job'], name='jobs_jobdoc_tenant__5e2b3c_idx'),
                    models.Index(fields=['tenant_id', 'document_type'], name='jobs_jobdoc_tenant__44e73a_idx'),
                    models.Index(fields=['tenant_id', 'uploaded_at'], name='jobs_jobdoc_tenant__2e1f2d_idx'),
                ],
            },
        ),
        # Create JobStatusHistory model
        migrations.CreateModel(
            name='JobStatusHistory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tenant_id', models.CharField(blank=True, db_index=True, max_length=64, null=True)),
                ('from_status', models.CharField(
                    blank=True,
                    choices=[
                        ('quote', 'Quote'),
                        ('approved', 'Approved'),
                        ('scheduled', 'Scheduled'),
                        ('in_transit', 'In Transit'),
                        ('in_progress', 'In Progress'),
                        ('pending_review', 'Pending Review'),
                        ('completed', 'Completed'),
                        ('invoiced', 'Invoiced'),
                        ('paid', 'Paid'),
                        ('closed', 'Closed'),
                        ('cancelled', 'Cancelled'),
                        ('on_hold', 'On Hold'),
                        ('requires_parts', 'Requires Parts'),
                        ('callback_needed', 'Callback Needed'),
                    ],
                    max_length=20,
                )),
                ('to_status', models.CharField(
                    choices=[
                        ('quote', 'Quote'),
                        ('approved', 'Approved'),
                        ('scheduled', 'Scheduled'),
                        ('in_transit', 'In Transit'),
                        ('in_progress', 'In Progress'),
                        ('pending_review', 'Pending Review'),
                        ('completed', 'Completed'),
                        ('invoiced', 'Invoiced'),
                        ('paid', 'Paid'),
                        ('closed', 'Closed'),
                        ('cancelled', 'Cancelled'),
                        ('on_hold', 'On Hold'),
                        ('requires_parts', 'Requires Parts'),
                        ('callback_needed', 'Callback Needed'),
                    ],
                    max_length=20,
                )),
                ('changed_at', models.DateTimeField(auto_now_add=True)),
                ('reason', models.TextField(blank=True, help_text='Reason for status change')),
                ('latitude', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('longitude', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('changed_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ('job', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='status_history', to='jobs.job')),
            ],
            options={
                'ordering': ['-changed_at'],
                'indexes': [
                    models.Index(fields=['tenant_id', 'job'], name='jobs_jobsta_tenant__a4f12b_idx'),
                    models.Index(fields=['tenant_id', 'changed_at'], name='jobs_jobsta_tenant__91e4cd_idx'),
                ],
            },
        ),
        # Create JobCommunication model
        migrations.CreateModel(
            name='JobCommunication',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tenant_id', models.CharField(blank=True, db_index=True, max_length=64, null=True)),
                ('communication_type', models.CharField(
                    choices=[
                        ('email', 'Email'),
                        ('whatsapp', 'WhatsApp'),
                        ('sms', 'SMS'),
                        ('phone', 'Phone Call'),
                        ('in_person', 'In Person'),
                        ('internal', 'Internal Note'),
                    ],
                    max_length=20,
                )),
                ('direction', models.CharField(
                    choices=[
                        ('outbound', 'Sent to Customer'),
                        ('inbound', 'Received from Customer'),
                        ('internal', 'Internal'),
                    ],
                    max_length=20,
                )),
                ('subject', models.CharField(blank=True, max_length=200)),
                ('content', models.TextField()),
                ('contact_name', models.CharField(blank=True, max_length=200)),
                ('contact_email', models.EmailField(blank=True, max_length=254)),
                ('contact_phone', models.CharField(blank=True, max_length=20)),
                ('sent_at', models.DateTimeField(auto_now_add=True)),
                ('is_delivered', models.BooleanField(default=False)),
                ('delivered_at', models.DateTimeField(blank=True, null=True)),
                ('is_read', models.BooleanField(default=False)),
                ('read_at', models.DateTimeField(blank=True, null=True)),
                ('has_attachments', models.BooleanField(default=False)),
                ('attachment_urls', models.JSONField(blank=True, default=list)),
                ('job', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='communications', to='jobs.job')),
                ('sent_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='job_communications_sent', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-sent_at'],
                'indexes': [
                    models.Index(fields=['tenant_id', 'job'], name='jobs_jobcom_tenant__3c5d89_idx'),
                    models.Index(fields=['tenant_id', 'sent_at'], name='jobs_jobcom_tenant__f826a1_idx'),
                ],
            },
        ),
    ]