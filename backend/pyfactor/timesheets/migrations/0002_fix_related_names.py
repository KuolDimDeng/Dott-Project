# Generated manually to fix related name conflicts

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('timesheets', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='timesheet',
            name='employee',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='timesheet_records', to='hr.employee'),
        ),
        migrations.AlterField(
            model_name='timesheet',
            name='supervisor',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='supervised_timesheet_records', to='hr.employee'),
        ),
        migrations.AlterField(
            model_name='timesheet',
            name='approved_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='approved_timesheet_records', to='hr.employee'),
        ),
        migrations.AlterField(
            model_name='timeoffrequest',
            name='employee',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='timeoff_requests', to='hr.employee'),
        ),
        migrations.AlterField(
            model_name='timeoffrequest',
            name='reviewed_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reviewed_timeoff_requests', to='hr.employee'),
        ),
    ]