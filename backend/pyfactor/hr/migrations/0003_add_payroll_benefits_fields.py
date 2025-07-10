# Generated manually for adding payroll and benefits fields

from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ('hr', '0002_employee_compensation_type_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='employee',
            name='direct_deposit',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='employee',
            name='vacation_time',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='employee',
            name='vacation_days_per_year',
            field=models.PositiveIntegerField(
                default=0,
                validators=[
                    django.core.validators.MinValueValidator(0),
                    django.core.validators.MaxValueValidator(365)
                ],
                help_text='Number of vacation days per year'
            ),
        ),
    ]