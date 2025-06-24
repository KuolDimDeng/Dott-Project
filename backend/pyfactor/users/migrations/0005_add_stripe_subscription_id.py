# Generated manually to add stripe_subscription_id field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_add_business_type_column'),
    ]

    operations = [
        migrations.AddField(
            model_name='subscription',
            name='stripe_subscription_id',
            field=models.CharField(blank=True, max_length=255, null=True, unique=True),
        ),
    ]