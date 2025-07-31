# Generated migration for accounting standard field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_auto_20250731_0537'),  # Replace with your last migration
    ]

    operations = [
        migrations.AddField(
            model_name='businessdetails',
            name='accounting_standard',
            field=models.CharField(
                max_length=10,
                choices=[
                    ('IFRS', 'IFRS (International)'),
                    ('GAAP', 'US GAAP'),
                ],
                default='IFRS',
                help_text='Accounting standard used for financial reporting'
            ),
        ),
        migrations.AddField(
            model_name='businessdetails',
            name='accounting_standard_updated_at',
            field=models.DateTimeField(
                null=True,
                blank=True,
                help_text='Last time accounting standard was changed'
            ),
        ),
    ]