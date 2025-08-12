# Generated migration for audit model updates

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('audit', '0002_rename_audit_log_timesta_1b0f0f_idx_audit_log_timesta_be67a1_idx_and_more'),
    ]

    operations = [
        # Change action field to be more flexible (no choices)
        migrations.AlterField(
            model_name='auditlog',
            name='action',
            field=models.CharField(max_length=50, db_index=True),
        ),
    ]