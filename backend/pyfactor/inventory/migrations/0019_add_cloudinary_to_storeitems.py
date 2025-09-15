from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0018_add_storeitems_models'),
    ]

    operations = [
        migrations.AddField(
            model_name='storeitem',
            name='image_public_id',
            field=models.CharField(blank=True, help_text='Cloudinary public ID', max_length=255),
        ),
        migrations.AddField(
            model_name='storeitem',
            name='thumbnail_url',
            field=models.URLField(blank=True, help_text='Thumbnail image URL from Cloudinary'),
        ),
    ]