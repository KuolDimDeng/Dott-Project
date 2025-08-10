# Generated manually to add business and tenant_id fields to ChartOfAccount

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),  # Ensure Business model exists
        ('finance', '0003_add_tenant_id_to_journalentry'),
    ]

    operations = [
        # Add tenant_id field if it doesn't exist
        migrations.AddField(
            model_name='chartofaccount',
            name='tenant_id',
            field=models.UUIDField(db_index=True, help_text='The tenant ID this record belongs to. Used by Row Level Security.', null=True),
            preserve_default=False,
        ),
        # Add business field
        migrations.AddField(
            model_name='chartofaccount',
            name='business',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, to='users.business'),
            preserve_default=False,
        ),
        # Add indexes for performance
        migrations.AddIndex(
            model_name='chartofaccount',
            index=models.Index(fields=['tenant_id', 'account_number'], name='finance_cha_tenant__f9a8d3_idx'),
        ),
        migrations.AddIndex(
            model_name='chartofaccount',
            index=models.Index(fields=['business'], name='finance_cha_busines_8e5f6a_idx'),
        ),
        # Add unique constraint
        migrations.AddConstraint(
            model_name='chartofaccount',
            constraint=models.UniqueConstraint(fields=['tenant_id', 'account_number'], name='unique_chart_account_per_tenant'),
        ),
    ]