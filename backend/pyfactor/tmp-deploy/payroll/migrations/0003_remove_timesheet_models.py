# Generated manually for timesheet model consolidation
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payroll', '0002_add_timesheet_to_payrolltransaction'),
    ]

    operations = [
        migrations.AlterField(
            model_name='payrolltransaction',
            name='timesheet',
            field=models.ForeignKey(
                null=True,
                on_delete=models.SET_NULL,
                related_name='payroll_transactions',
                to='hr.timesheet',
                help_text='Link to the HR timesheet that this transaction is based on'
            ),
        ),
        migrations.DeleteModel(
            name='TimesheetEntry',
        ),
        migrations.DeleteModel(
            name='Timesheet',
        ),
    ] 