# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0022_add_currency_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='businessdetails',
            name='logo_data',
            field=models.TextField(
                blank=True,
                help_text='Business logo stored as base64 data URL (e.g., data:image/png;base64,...)',
                null=True,
            ),
        ),
    ]