# Generated manually
from django.db import migrations
from django.contrib.postgres.fields import ArrayField
import django.db.models


class Migration(migrations.Migration):

    dependencies = [
        ('marketplace', '0003_businessinteraction'),
    ]

    operations = [
        migrations.AddField(
            model_name='businesslisting',
            name='manual_subcategories',
            field=ArrayField(
                base_field=django.db.models.CharField(max_length=50),
                blank=True,
                default=list,
                help_text='Subcategories manually selected by business owner',
                size=None
            ),
        ),
        migrations.AddField(
            model_name='businesslisting',
            name='auto_subcategories',
            field=ArrayField(
                base_field=django.db.models.CharField(max_length=50),
                blank=True,
                default=list,
                help_text='Auto-detected subcategories based on business type and keywords',
                size=None
            ),
        ),
    ]