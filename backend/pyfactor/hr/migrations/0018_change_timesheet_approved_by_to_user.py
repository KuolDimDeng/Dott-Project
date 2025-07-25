# Generated manually to change Timesheet.approved_by from Employee to User

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('custom_auth', '0001_initial'),
        ('hr', '0017_change_geofence_created_by_to_user'),
    ]

    operations = [
        migrations.AlterField(
            model_name='timesheet',
            name='approved_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='approved_timesheets',
                to='custom_auth.User'
            ),
        ),
    ]