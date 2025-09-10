# Generated manually to fix missing is_open_now field
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('marketplace', '0006_merge_20250909_1710'),
    ]

    operations = [
        migrations.AddField(
            model_name='businesslisting',
            name='is_open_now',
            field=models.BooleanField(default=True),
        ),
    ]