from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
import uuid

class Migration(migrations.Migration):
    initial = True
    
    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
    ]
    
    operations = [
        migrations.CreateModel(
            name='ChatConversation',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('consumer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='consumer_chats', to='auth.user')),
                ('business', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='business_chats', to='auth.user')),
                ('is_active', models.BooleanField(default=True)),
                ('last_message_at', models.DateTimeField(blank=True, null=True)),
                ('consumer_unread_count', models.IntegerField(default=0)),
                ('business_unread_count', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'chat_conversations',
                'ordering': ['-last_message_at'],
            },
        ),
        migrations.CreateModel(
            name='ChatMessage',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('conversation', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='messages', to='chat.chatconversation')),
                ('sender', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sent_messages', to='auth.user')),
                ('message_type', models.CharField(choices=[('text', 'Text Message'), ('image', 'Image'), ('product', 'Product Link'), ('order', 'Order Link'), ('location', 'Location'), ('voice', 'Voice Message'), ('system', 'System Message')], default='text', max_length=20)),
                ('text', models.TextField(blank=True)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('is_read', models.BooleanField(default=False)),
                ('read_at', models.DateTimeField(blank=True, null=True)),
                ('is_deleted', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'chat_messages',
                'ordering': ['created_at'],
            },
        ),
        migrations.CreateModel(
            name='ChatTemplate',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('business', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='chat_templates', to='auth.user')),
                ('name', models.CharField(max_length=100)),
                ('text', models.TextField()),
                ('category', models.CharField(blank=True, max_length=50)),
                ('is_active', models.BooleanField(default=True)),
                ('usage_count', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'chat_templates',
                'ordering': ['-usage_count', 'name'],
            },
        ),
        migrations.CreateModel(
            name='ChatNotificationSettings',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='chat_settings', to='auth.user')),
                ('push_enabled', models.BooleanField(default=True)),
                ('email_enabled', models.BooleanField(default=False)),
                ('sms_enabled', models.BooleanField(default=False)),
                ('sound_enabled', models.BooleanField(default=True)),
                ('quiet_hours_start', models.TimeField(blank=True, null=True)),
                ('quiet_hours_end', models.TimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'chat_notification_settings',
            },
        ),
    ]