# Generated manually

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('hr', '0004_alter_employee_date_joined_alter_employee_role'),
    ]

    operations = [
        migrations.AddField(
            model_name='employee',
            name='ID_verified',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='employee',
            name='areManager',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='employee',
            name='supervising',
            field=models.ManyToManyField(blank=True, related_name='supervised_by', symmetrical=False, to='hr.employee'),
        ),
    ]
