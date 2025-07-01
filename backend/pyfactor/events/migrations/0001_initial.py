# Generated manually for Calendar Events app

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.core.validators
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Event',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('tenant_id', models.UUIDField(db_index=True, help_text='The tenant ID this record belongs to. Used by Row Level Security.', null=True)),
                ('title', models.CharField(max_length=255)),
                ('start_datetime', models.DateTimeField()),
                ('end_datetime', models.DateTimeField()),
                ('all_day', models.BooleanField(default=False)),
                ('event_type', models.CharField(choices=[('meeting', 'Meeting'), ('appointment', 'Appointment'), ('task', 'Task'), ('reminder', 'Reminder'), ('deadline', 'Deadline'), ('personal', 'Personal'), ('business', 'Business'), ('other', 'Other')], default='other', max_length=20)),
                ('description', models.TextField(blank=True, null=True)),
                ('location', models.CharField(blank=True, max_length=255, null=True)),
                ('reminder_minutes', models.IntegerField(default=0, help_text='Number of minutes before the event to send a reminder (0 = no reminder)', validators=[django.core.validators.MinValueValidator(0)])),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='created_events', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'events_event',
                'ordering': ['start_datetime'],
            },
        ),
        migrations.AddIndex(
            model_name='event',
            index=models.Index(fields=['tenant_id', 'start_datetime'], name='events_even_tenant__3e0e8f_idx'),
        ),
        migrations.AddIndex(
            model_name='event',
            index=models.Index(fields=['tenant_id', 'event_type'], name='events_even_tenant__de5d5f_idx'),
        ),
    ]