# Generated migration for BusinessSettings model

from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0018_add_display_legal_structure'),
    ]

    operations = [
        # Create BusinessSettings model
        migrations.CreateModel(
            name='BusinessSettings',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ('tenant_id', models.UUIDField(unique=True)),
                ('default_pricing_model', models.CharField(
                    choices=[
                        ('direct', 'Direct (One-time price)'),
                        ('time_weight', 'Time & Weight (Price × Days × Weight)'),
                        ('time_only', 'Time Only (Price × Days)'),
                        ('weight_only', 'Weight Only (Price × Weight)'),
                    ],
                    default='direct',
                    help_text='Default pricing model for new products',
                    max_length=20
                )),
                ('default_daily_rate', models.DecimalField(
                    decimal_places=2,
                    default=0,
                    help_text='Default rate per day for time-based pricing',
                    max_digits=10
                )),
                ('default_weight_unit', models.CharField(
                    default='kg',
                    help_text='Default weight unit (kg, lbs, etc.)',
                    max_length=10
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'users_business_settings',
                'indexes': [
                    models.Index(fields=['tenant_id'], name='users_busin_tenant__e8d9f7_idx'),
                ],
            },
        ),
    ]