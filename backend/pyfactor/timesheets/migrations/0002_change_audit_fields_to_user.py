# Generated manually to change audit fields from Employee to User

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('custom_auth', '0001_initial'),
        ('timesheets', '0001_initial'),  # Replace with your actual previous migration
    ]

    operations = [
        migrations.AlterField(
            model_name='timesheet',
            name='approved_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='approved_timesheet_records',
                to='custom_auth.User'
            ),
        ),
        migrations.AlterField(
            model_name='clockentry',
            name='adjusted_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='adjusted_clock_entries',
                to='custom_auth.User'
            ),
        ),
        migrations.AlterField(
            model_name='timeoffrequest',
            name='reviewed_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='reviewed_timeoff_requests',
                to='custom_auth.User'
            ),
        ),
    ]