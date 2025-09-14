# Generated migration for adding Cloudinary fields to MenuItem

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('menu', '0002_add_image_field'),
    ]

    operations = [
        migrations.AddField(
            model_name='menuitem',
            name='image_public_id',
            field=models.CharField(blank=True, help_text='Cloudinary public ID', max_length=255),
        ),
        migrations.AlterField(
            model_name='menuitem',
            name='image',
            field=models.ImageField(blank=True, help_text='Primary image file (for backward compatibility)', null=True, upload_to='menu_items'),
        ),
        migrations.AlterField(
            model_name='menuitem',
            name='image_url',
            field=models.URLField(blank=True, help_text='Primary image URL from Cloudinary'),
        ),
        migrations.AlterField(
            model_name='menuitem',
            name='thumbnail_url',
            field=models.URLField(blank=True, help_text='Thumbnail image URL from Cloudinary'),
        ),
    ]