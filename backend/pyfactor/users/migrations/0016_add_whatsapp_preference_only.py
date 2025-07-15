from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0015_add_whatsapp_commerce_preference'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='show_whatsapp_commerce',
            field=models.BooleanField(blank=True, help_text='Whether to show WhatsApp Commerce in menu (null = use country default)', null=True),
        ),
    ]