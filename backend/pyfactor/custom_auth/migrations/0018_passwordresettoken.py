# Generated manually for PasswordResetToken model

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('custom_auth', '0017_merge'),
    ]

    operations = [
        migrations.CreateModel(
            name='PasswordResetToken',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('token', models.CharField(max_length=255, unique=True)),
                ('expires_at', models.DateTimeField()),
                ('used', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='password_reset_tokens', to='custom_auth.user')),
            ],
            options={
                'db_table': 'custom_auth_password_reset_token',
                'indexes': [
                    models.Index(fields=['token'], name='custom_auth_token_idx'),
                    models.Index(fields=['expires_at'], name='custom_auth_expires_idx'),
                ],
            },
        ),
    ]