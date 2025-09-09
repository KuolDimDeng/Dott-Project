# Generated manually to add image field support

from django.db import migrations, models
import menu.models


class Migration(migrations.Migration):

    dependencies = [
        ('menu', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='menuitem',
            name='image',
            field=models.ImageField(blank=True, help_text='Primary image file', null=True, upload_to=menu.models.menu_item_image_path),
        ),
    ]