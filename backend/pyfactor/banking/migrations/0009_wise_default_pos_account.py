# Generated migration for default POS bank account selection

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('banking', '0008_wise_integration'),
    ]

    operations = [
        migrations.AddField(
            model_name='wiseitem',
            name='is_default_for_pos',
            field=models.BooleanField(default=False, help_text='Use this account for POS settlements'),
        ),
        migrations.AddField(
            model_name='wiseitem',
            name='is_active',
            field=models.BooleanField(default=True, help_text='Whether this bank account is active'),
        ),
    ]