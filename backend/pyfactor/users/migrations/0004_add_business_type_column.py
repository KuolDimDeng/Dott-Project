# Generated migration to add business_type column

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_auto_20250122_0000'),  # Replace with your last migration
    ]

    operations = [
        migrations.AddField(
            model_name='business',
            name='business_type',
            field=models.CharField(max_length=100, blank=True, null=True),
        ),
    ]