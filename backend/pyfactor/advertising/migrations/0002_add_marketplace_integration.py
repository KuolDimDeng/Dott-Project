# Generated manually 2025-09-13
from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('advertising', '0001_initial'),
    ]

    operations = [
        # Add image fields
        migrations.AddField(
            model_name='advertisingcampaign',
            name='logo_url',
            field=models.URLField(blank=True, max_length=500, null=True),
        ),
        migrations.AddField(
            model_name='advertisingcampaign',
            name='logo_public_id',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='advertisingcampaign',
            name='cover_image_url',
            field=models.URLField(blank=True, max_length=500, null=True),
        ),
        migrations.AddField(
            model_name='advertisingcampaign',
            name='cover_image_public_id',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='advertisingcampaign',
            name='gallery_images',
            field=models.JSONField(blank=True, default=list, help_text='List of gallery image URLs and public IDs'),
        ),

        # Add marketplace integration fields
        migrations.AddField(
            model_name='advertisingcampaign',
            name='marketplace_listing_id',
            field=models.UUIDField(blank=True, help_text='Related BusinessListing ID', null=True),
        ),
        migrations.AddField(
            model_name='advertisingcampaign',
            name='auto_publish_to_marketplace',
            field=models.BooleanField(default=True, help_text='Automatically publish to marketplace when active'),
        ),
        migrations.AddField(
            model_name='advertisingcampaign',
            name='marketplace_visibility_boost',
            field=models.IntegerField(default=0, help_text='Boost factor for marketplace ranking (0-100)'),
        ),
    ]