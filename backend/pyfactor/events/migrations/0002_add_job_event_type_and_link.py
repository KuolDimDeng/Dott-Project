# Generated manually for job calendar integration

from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        ('events', '0001_initial'),
        ('jobs', '0001_initial'),
    ]

    operations = [
        # Update EVENT_TYPE_CHOICES to include 'job'
        migrations.AlterField(
            model_name='event',
            name='event_type',
            field=models.CharField(
                choices=[
                    ('meeting', 'Meeting'),
                    ('appointment', 'Appointment'),
                    ('job', 'Job/Project'),
                    ('task', 'Task'),
                    ('reminder', 'Reminder'),
                    ('deadline', 'Deadline'),
                    ('personal', 'Personal'),
                    ('business', 'Business'),
                    ('other', 'Other'),
                ],
                default='other',
                max_length=20
            ),
        ),
        # Add job foreign key field
        migrations.AddField(
            model_name='event',
            name='job',
            field=models.ForeignKey(
                blank=True,
                help_text='Link to job if this is a job-scheduled event',
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='calendar_events',
                to='jobs.job'
            ),
        ),
    ]