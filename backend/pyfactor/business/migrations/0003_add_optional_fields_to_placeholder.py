# Generated manually to add optional fields to PlaceholderBusiness

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('business', '0002_auto_20240101_0000'),  # Replace with your latest migration
    ]

    operations = [
        migrations.AddField(
            model_name='placeholderbusiness',
            name='email',
            field=models.EmailField(max_length=254, blank=True, null=True, help_text='Business email address if available'),
        ),
        migrations.AddField(
            model_name='placeholderbusiness',
            name='description',
            field=models.TextField(blank=True, null=True, help_text='Business description or tagline'),
        ),
        migrations.AddField(
            model_name='placeholderbusiness',
            name='image_url',
            field=models.URLField(max_length=500, blank=True, null=True, help_text='Main business image URL'),
        ),
        migrations.AddField(
            model_name='placeholderbusiness',
            name='logo_url',
            field=models.URLField(max_length=500, blank=True, null=True, help_text='Business logo URL if available'),
        ),
        migrations.AddField(
            model_name='placeholderbusiness',
            name='website',
            field=models.URLField(max_length=255, blank=True, null=True, help_text='Business website URL'),
        ),
        migrations.AddField(
            model_name='placeholderbusiness',
            name='opening_hours',
            field=models.JSONField(blank=True, null=True, help_text='Business opening hours as JSON'),
        ),
        migrations.AddField(
            model_name='placeholderbusiness',
            name='rating',
            field=models.DecimalField(max_digits=3, decimal_places=2, blank=True, null=True, help_text='Average rating (1.00 to 5.00)'),
        ),
        migrations.AddField(
            model_name='placeholderbusiness',
            name='social_media',
            field=models.JSONField(blank=True, null=True, help_text='Social media links (facebook, instagram, twitter, etc.)'),
        ),
    ]