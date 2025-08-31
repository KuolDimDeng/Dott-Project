"""
Add business interaction configuration fields
"""
from django.db import migrations, models
from django.contrib.postgres.fields import JSONField


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0126_add_marketplace_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='business',
            name='business_category',
            field=models.CharField(
                max_length=50,
                blank=True,
                null=True,
                help_text='Specific business category for marketplace configuration'
            ),
        ),
        migrations.AddField(
            model_name='business',
            name='primary_interaction_type',
            field=models.CharField(
                max_length=20,
                default='order',
                help_text='Primary way customers interact with this business'
            ),
        ),
        migrations.AddField(
            model_name='business',
            name='supported_interactions',
            field=JSONField(
                default=list,
                blank=True,
                help_text='All supported interaction types for this business'
            ),
        ),
        migrations.AddField(
            model_name='business',
            name='interaction_settings',
            field=JSONField(
                default=dict,
                blank=True,
                help_text='Detailed settings for each interaction type'
            ),
        ),
        migrations.AddField(
            model_name='business',
            name='auto_configured',
            field=models.BooleanField(
                default=False,
                help_text='Whether interaction settings were auto-configured based on business type'
            ),
        ),
    ]