# Generated manually 2025-09-13
from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_remove_admin_role'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='preferred_currency_code',
            field=models.CharField(default='USD', help_text='3-letter ISO currency code', max_length=3),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='preferred_currency_name',
            field=models.CharField(default='US Dollar', help_text='Full currency name', max_length=50),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='preferred_currency_symbol',
            field=models.CharField(default='$', help_text='Currency symbol for display', max_length=5),
        ),
    ]