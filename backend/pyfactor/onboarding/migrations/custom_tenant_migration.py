import uuid
from django.db import migrations, models

def set_tenant_ids(apps, schema_editor):
    """Set tenant_id from user_id for existing records"""
    OnboardingProgress = apps.get_model('onboarding', 'OnboardingProgress')
    for progress in OnboardingProgress.objects.all():
        progress.tenant_id = progress.user_id if progress.user_id else uuid.uuid4()
        progress.save()

class Migration(migrations.Migration):
    dependencies = [
        ('onboarding', '0001_initial'),  # Replace with your last migration
    ]

    operations = [
        migrations.AddField(
            model_name='onboardingprogress',
            name='tenant_id',
            field=models.UUIDField(default=uuid.uuid4, db_index=True),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='onboardingprogress',
            name='session_id',
            field=models.UUIDField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='onboardingprogress',
            name='last_session_activity',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddIndex(
            model_name='onboardingprogress',
            index=models.Index(fields=['tenant_id'], name='onboard_tenant_idx'),
        ),
        migrations.AddIndex(
            model_name='onboardingprogress',
            index=models.Index(fields=['session_id'], name='onboard_session_idx'),
        ),
        migrations.RunPython(set_tenant_ids),
    ] 