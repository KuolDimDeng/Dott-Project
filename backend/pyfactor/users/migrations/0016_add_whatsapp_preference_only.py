from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0014_merge'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='show_whatsapp_commerce',
            field=models.BooleanField(blank=True, help_text='Whether to show WhatsApp Commerce in menu (null = use country default)', null=True),
        ),
    ]