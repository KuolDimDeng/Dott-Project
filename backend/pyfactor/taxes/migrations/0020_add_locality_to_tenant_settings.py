# Generated manually
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('taxes', '0019_add_global_payroll_tax'),
    ]

    operations = [
        migrations.AddField(
            model_name='tenanttaxsettings',
            name='locality',
            field=models.CharField(blank=True, default='', max_length=100, help_text='County or local jurisdiction code'),
        ),
        migrations.AddField(
            model_name='tenanttaxsettings',
            name='locality_name',
            field=models.CharField(blank=True, default='', max_length=200, help_text='County or local jurisdiction name'),
        ),
    ]