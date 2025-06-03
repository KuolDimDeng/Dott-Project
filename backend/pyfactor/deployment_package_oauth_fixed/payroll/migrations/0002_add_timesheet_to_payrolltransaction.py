# Generated manually for timesheet model consolidation
import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('hr', '0008_timesheet_timesheet_number'),
        ('payroll', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='payrolltransaction',
            name='timesheet',
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='payroll_transactions',
                to='hr.timesheet'
            ),
        ),
        migrations.RunPython(
            code=lambda apps, schema_editor: None,  # Forward operation - migration will be done manually
            reverse_code=lambda apps, schema_editor: None,  # Reverse operation - data migration cannot be reversed
        ),
    ] 