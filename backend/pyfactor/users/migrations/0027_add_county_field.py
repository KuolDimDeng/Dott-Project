# Generated manually
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0026_auto_20250801_0724'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='county',
            field=models.CharField(blank=True, max_length=100, null=True, help_text='County for business location'),
        ),
    ]