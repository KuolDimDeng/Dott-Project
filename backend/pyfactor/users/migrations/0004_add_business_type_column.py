# Generated migration to add business_type column

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_remove_admin_role'),
    ]

    operations = [
        migrations.AddField(
            model_name='business',
            name='business_type',
            field=models.CharField(max_length=100, blank=True, null=True),
        ),
    ]