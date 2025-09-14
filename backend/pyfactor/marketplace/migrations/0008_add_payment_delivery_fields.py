# Generated migration to add payment and delivery fields

from django.db import migrations, models
from django.contrib.postgres.fields import ArrayField

class Migration(migrations.Migration):

    dependencies = [
        ('marketplace', '0007_add_is_open_now_field'),  # Latest migration in the marketplace app
    ]

    operations = [
        migrations.AddField(
            model_name='businesslisting',
            name='payment_methods',
            field=ArrayField(
                models.CharField(max_length=50),
                blank=True,
                default=list,
                help_text='Accepted payment methods (cash, card, mobile_money, etc.)'
            ),
        ),
        migrations.AddField(
            model_name='businesslisting',
            name='delivery_options',
            field=models.JSONField(
                default=dict,
                blank=True,
                help_text='Delivery options configuration (delivery, pickup, shipping)'
            ),
        ),
        migrations.AddField(
            model_name='businesslisting',
            name='social_media',
            field=models.JSONField(
                default=dict,
                blank=True,
                help_text='Social media links (facebook, instagram, twitter, etc.)'
            ),
        ),
        migrations.AddField(
            model_name='businesslisting',
            name='website',
            field=models.URLField(
                max_length=255,
                blank=True,
                null=True,
                help_text='Business website URL'
            ),
        ),
        migrations.AddField(
            model_name='businesslisting',
            name='business_email',
            field=models.EmailField(
                max_length=255,
                blank=True,
                null=True,
                help_text='Business contact email'
            ),
        ),
        migrations.AddField(
            model_name='businesslisting',
            name='phone',
            field=models.CharField(
                max_length=20,
                blank=True,
                null=True,
                help_text='Business phone number'
            ),
        ),
        migrations.AddField(
            model_name='businesslisting',
            name='address',
            field=models.TextField(
                blank=True,
                null=True,
                help_text='Full business address'
            ),
        ),
        migrations.AddField(
            model_name='businesslisting',
            name='postal_code',
            field=models.CharField(
                max_length=20,
                blank=True,
                null=True,
                help_text='Postal/ZIP code'
            ),
        ),
        migrations.AddField(
            model_name='businesslisting',
            name='state',
            field=models.CharField(
                max_length=100,
                blank=True,
                null=True,
                help_text='State/Province'
            ),
        ),
    ]