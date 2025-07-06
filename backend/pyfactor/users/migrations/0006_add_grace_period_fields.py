# Generated manually for grace period implementation

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0005_add_stripe_subscription_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='subscription',
            name='status',
            field=models.CharField(
                choices=[
                    ('active', 'Active'),
                    ('past_due', 'Past Due'), 
                    ('grace_period', 'Grace Period'),
                    ('suspended', 'Suspended'),
                    ('canceled', 'Canceled')
                ],
                default='active',
                max_length=20
            ),
        ),
        migrations.AddField(
            model_name='subscription',
            name='grace_period_ends',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='subscription',
            name='failed_payment_count',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='subscription',
            name='last_payment_attempt',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]