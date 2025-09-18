# Generated manually for tip_amount field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('marketplace', '0011_add_manual_override_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='consumerorder',
            name='tip_amount',
            field=models.DecimalField(
                max_digits=10,
                decimal_places=2,
                default=0,
                help_text="Tip amount for courier (100% goes to courier)"
            ),
        ),
    ]