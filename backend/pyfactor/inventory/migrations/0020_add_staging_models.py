# Generated migration for staging models
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
import uuid


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('inventory', '0019_add_cloudinary_to_storeitems'),
    ]

    operations = [
        migrations.CreateModel(
            name='StoreItemStaging',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('barcode', models.CharField(db_index=True, max_length=100, unique=True)),
                ('name', models.CharField(max_length=255)),
                ('brand', models.CharField(blank=True, max_length=255, null=True)),
                ('category', models.CharField(blank=True, max_length=100, null=True)),
                ('size', models.CharField(blank=True, max_length=100, null=True)),
                ('unit', models.CharField(blank=True, max_length=50, null=True)),
                ('description', models.TextField(blank=True, null=True)),
                ('image_url', models.URLField(blank=True, max_length=500, null=True)),
                ('image_public_id', models.CharField(blank=True, max_length=255, null=True)),
                ('thumbnail_url', models.URLField(blank=True, max_length=500, null=True)),
                ('submitted_by_business_name', models.CharField(max_length=255)),
                ('submission_date', models.DateTimeField(default=django.utils.timezone.now)),
                ('submission_count', models.IntegerField(default=1)),
                ('status', models.CharField(choices=[('pending', 'Pending Review'), ('approved', 'Approved'), ('rejected', 'Rejected'), ('duplicate', 'Duplicate'), ('flagged', 'Flagged for Manual Review'), ('auto_approved', 'Auto-Approved')], db_index=True, default='pending', max_length=20)),
                ('review_date', models.DateTimeField(blank=True, null=True)),
                ('review_notes', models.TextField(blank=True, null=True)),
                ('rejection_reason', models.TextField(blank=True, null=True)),
                ('confidence_score', models.DecimalField(decimal_places=2, default=0.00, max_digits=3)),
                ('data_consistency_score', models.DecimalField(decimal_places=2, default=0.00, max_digits=3)),
                ('image_moderation_scores', models.JSONField(blank=True, default=dict, null=True)),
                ('image_is_safe', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('approved_store_item', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='staging_origin', to='inventory.storeitem')),
                ('reviewed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reviewed_staging_items', to=settings.AUTH_USER_MODEL)),
                ('submitted_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='staging_submissions', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Store Item (Staging)',
                'verbose_name_plural': 'Store Items (Staging)',
                'ordering': ['-confidence_score', '-submission_count', '-submission_date'],
            },
        ),
        migrations.CreateModel(
            name='StageSubmission',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('business_name', models.CharField(max_length=255)),
                ('tenant_id', models.CharField(blank=True, max_length=50, null=True)),
                ('submitted_data', models.JSONField()),
                ('submitted_name', models.CharField(max_length=255)),
                ('submitted_brand', models.CharField(blank=True, max_length=255, null=True)),
                ('submitted_price', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('submitted_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.TextField(blank=True, null=True)),
                ('staging_item', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='submissions', to='inventory.storeitemstaging')),
                ('user', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Stage Submission',
                'verbose_name_plural': 'Stage Submissions',
                'ordering': ['-submitted_at'],
            },
        ),
        migrations.CreateModel(
            name='ModeratorAction',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('action', models.CharField(choices=[('approve', 'Approved Item'), ('reject', 'Rejected Item'), ('flag', 'Flagged Item'), ('unflag', 'Unflagged Item'), ('ban_user', 'Banned User'), ('unban_user', 'Unbanned User'), ('delete', 'Deleted Item'), ('edit', 'Edited Item')], max_length=20)),
                ('reason', models.TextField(blank=True, null=True)),
                ('metadata', models.JSONField(blank=True, default=dict, null=True)),
                ('timestamp', models.DateTimeField(default=django.utils.timezone.now)),
                ('moderator', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ('staging_item', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='inventory.storeitemstaging')),
                ('target_user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='moderation_targets', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Moderator Action',
                'verbose_name_plural': 'Moderator Actions',
                'ordering': ['-timestamp'],
            },
        ),
        migrations.CreateModel(
            name='FlaggedImage',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('image_url', models.URLField(max_length=500)),
                ('image_hash', models.CharField(db_index=True, max_length=64, unique=True)),
                ('product_barcode', models.CharField(blank=True, max_length=100, null=True)),
                ('reason', models.CharField(choices=[('adult', 'Adult Content'), ('violence', 'Violence'), ('medical', 'Medical/Graphic'), ('spam', 'Spam/Irrelevant'), ('copyright', 'Copyright Violation'), ('other', 'Other')], max_length=20)),
                ('ai_moderation_scores', models.JSONField(blank=True, null=True)),
                ('flagged_by_ai', models.BooleanField(default=True)),
                ('uploaded_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('reviewed', models.BooleanField(default=False)),
                ('review_date', models.DateTimeField(blank=True, null=True)),
                ('review_action', models.CharField(blank=True, max_length=50, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('reviewed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reviewed_flagged_images', to=settings.AUTH_USER_MODEL)),
                ('staging_item', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='inventory.storeitemstaging')),
                ('uploaded_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Flagged Image',
                'verbose_name_plural': 'Flagged Images',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='storeitemstaging',
            index=models.Index(fields=['status', 'confidence_score'], name='inventory_s_status_e96e7f_idx'),
        ),
        migrations.AddIndex(
            model_name='storeitemstaging',
            index=models.Index(fields=['barcode'], name='inventory_s_barcode_e10b72_idx'),
        ),
        migrations.AddIndex(
            model_name='storeitemstaging',
            index=models.Index(fields=['submission_date'], name='inventory_s_submiss_b23a67_idx'),
        ),
    ]