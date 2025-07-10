# Generated manually for adding date_of_birth field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('hr', '0003_add_payroll_benefits_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='employee',
            name='date_of_birth',
            field=models.DateField(null=True, blank=True, help_text="Employee's date of birth"),
        ),
    ]