# Generated manually for recurring job functionality

from django.db import migrations, models
import django.core.validators
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='job',
            name='is_recurring',
            field=models.BooleanField(default=False, help_text='Is this a recurring job?'),
        ),
        migrations.AddField(
            model_name='job',
            name='recurrence_pattern',
            field=models.CharField(blank=True, choices=[('daily', 'Daily'), ('weekly', 'Weekly'), ('biweekly', 'Bi-weekly'), ('monthly', 'Monthly'), ('quarterly', 'Quarterly'), ('semiannually', 'Semi-annually'), ('annually', 'Annually')], help_text='How often the job recurs', max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='job',
            name='recurrence_end_date',
            field=models.DateField(blank=True, help_text='Optional end date for recurring series', null=True),
        ),
        migrations.AddField(
            model_name='job',
            name='recurrence_day_of_week',
            field=models.IntegerField(blank=True, choices=[(0, 'Monday'), (1, 'Tuesday'), (2, 'Wednesday'), (3, 'Thursday'), (4, 'Friday'), (5, 'Saturday'), (6, 'Sunday')], help_text='For weekly jobs: which day of the week', null=True),
        ),
        migrations.AddField(
            model_name='job',
            name='recurrence_day_of_month',
            field=models.IntegerField(blank=True, help_text='For monthly jobs: which day of the month (1-31)', null=True, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(31)]),
        ),
        migrations.AddField(
            model_name='job',
            name='recurrence_skip_holidays',
            field=models.BooleanField(default=False, help_text='Skip scheduled jobs on holidays'),
        ),
        migrations.AddField(
            model_name='job',
            name='parent_job',
            field=models.ForeignKey(blank=True, help_text='Original job this was created from', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='recurring_instances', to='jobs.job'),
        ),
        migrations.AddField(
            model_name='job',
            name='job_series_id',
            field=models.UUIDField(blank=True, db_index=True, help_text='Groups all jobs in a recurring series', null=True),
        ),
        migrations.AddField(
            model_name='job',
            name='is_exception',
            field=models.BooleanField(default=False, help_text='This instance has been modified from the series'),
        ),
    ]