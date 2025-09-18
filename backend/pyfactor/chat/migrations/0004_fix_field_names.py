# Generated manually to fix field naming issues

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0003_add_calling_features'),
    ]

    operations = [
        # Rename text to text_content if it exists
        migrations.RenameField(
            model_name='chatmessage',
            old_name='text',
            new_name='text_content',
        ),
        # Add sender_type field with a default value
        migrations.AddField(
            model_name='chatmessage',
            name='sender_type',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('consumer', 'Consumer'),
                    ('business', 'Business'),
                    ('system', 'System'),
                ],
                default='consumer',  # Default value for existing records
            ),
            preserve_default=False,
        ),
        # Add missing fields from the model
        migrations.AddField(
            model_name='chatmessage',
            name='image_url',
            field=models.URLField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='chatmessage',
            name='voice_url',
            field=models.URLField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='chatmessage',
            name='order_data',
            field=models.JSONField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='chatmessage',
            name='call_session_id',
            field=models.CharField(
                blank=True,
                help_text='WebRTC session identifier',
                max_length=100,
                null=True
            ),
        ),
        migrations.AddField(
            model_name='chatmessage',
            name='call_started_at',
            field=models.DateTimeField(
                blank=True,
                help_text='When the call was started',
                null=True
            ),
        ),
        migrations.AddField(
            model_name='chatmessage',
            name='call_ended_at',
            field=models.DateTimeField(
                blank=True,
                help_text='When the call ended',
                null=True
            ),
        ),
        # Remove old fields that don't exist in the model anymore
        migrations.RemoveField(
            model_name='chatmessage',
            name='metadata',
        ),
        migrations.RemoveField(
            model_name='chatmessage',
            name='is_deleted',
        ),
    ]