# Generated migration for audit model updates

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('audit', '0002_auto_20250131_0000'),  # Replace with actual last migration
    ]

    operations = [
        # Change action field to be more flexible (no choices)
        migrations.AlterField(
            model_name='auditlog',
            name='action',
            field=models.CharField(max_length=50, db_index=True),
        ),
        
        # Add resource field for better categorization
        migrations.AddField(
            model_name='auditlog',
            name='resource',
            field=models.CharField(max_length=100, null=True, blank=True, db_index=True),
        ),
    ]