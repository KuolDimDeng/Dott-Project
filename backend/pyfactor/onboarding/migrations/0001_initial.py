
from django.db import migrations, models
import uuid

class Migration(migrations.Migration):
    initial = True
    dependencies = [
        ('contenttypes', '0002_remove_content_type_name'),
    ]
    operations = [
        migrations.CreateModel(
            name='OnboardingProgress',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('onboarding_status', models.CharField(max_length=256)),
                ('account_status', models.CharField(max_length=9)),
                ('user_role', models.CharField(max_length=10)),
                ('subscription_plan', models.CharField(max_length=12)),
                ('current_step', models.CharField(max_length=256)),
                ('next_step', models.CharField(max_length=256, null=True)),
                ('completed_steps', models.JSONField(default=list)),
                ('last_active_step', models.CharField(max_length=256, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('last_login', models.DateTimeField(null=True)),
                ('access_token_expiration', models.DateTimeField(null=True)),
                ('completed_at', models.DateTimeField(null=True)),
                ('attribute_version', models.CharField(max_length=10)),
                ('preferences', models.JSONField(default=dict)),
                ('setup_error', models.TextField(null=True)),
                ('selected_plan', models.CharField(max_length=12)),
                ('business_id', models.UUIDField(null=True)),
                ('user_id', models.UUIDField(unique=True)),
            ],
            options={
                'db_table': 'onboarding_onboardingprogress',
            },
        ),
    ]
