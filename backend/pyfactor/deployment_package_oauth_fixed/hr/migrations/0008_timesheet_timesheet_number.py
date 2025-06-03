# Generated manually for timesheet model consolidation
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('hr', '0007_timesheetsetting_companyholiday_timeoffrequest_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='timesheet',
            name='timesheet_number',
            field=models.CharField(
                max_length=20, 
                unique=True, 
                editable=False, 
                null=True
            ),
        ),
        migrations.RunPython(
            code=lambda apps, schema_editor: None,  # Forward operation - migration will be done manually
            reverse_code=lambda apps, schema_editor: None,  # Reverse operation - data migration cannot be reversed
        ),
    ] 