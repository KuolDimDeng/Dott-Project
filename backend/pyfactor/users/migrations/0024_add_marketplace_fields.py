# Generated manually - Add marketplace fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0023_userprofile_is_consumer_only'),
    ]

    operations = [
        migrations.AddField(
            model_name='business',
            name='marketplace_category',
            field=models.CharField(blank=True, help_text='Category for marketplace search visibility', max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='business',
            name='delivery_scope',
            field=models.CharField(choices=[('local', 'Local Delivery Only'), ('national', 'Nationwide Delivery'), ('international', 'International Shipping'), ('digital', 'Digital/Online Service')], default='local', help_text='How far the business can deliver', max_length=20),
        ),
    ]