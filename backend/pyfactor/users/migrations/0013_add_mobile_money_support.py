"""
Add mobile money payment support for select countries
"""
from django.db import migrations, models
import django.db.models.deletion
import uuid


def populate_mobile_money_data(apps, schema_editor):
    """Populate initial mobile money configuration"""
    MobileMoneyCountry = apps.get_model('users', 'MobileMoneyCountry')
    MobileMoneyProvider = apps.get_model('users', 'MobileMoneyProvider')
    
    # Create Kenya with M-Pesa
    kenya = MobileMoneyCountry.objects.create(
        id=uuid.uuid4(),
        country_code='KE',
        country_name='Kenya',
        currency_code='KES',
        paystack_enabled=True,
        paystack_country_code='KE',
        providers=['M-Pesa'],
        display_name='Mobile Money (M-Pesa)',
        display_order=1,
        is_active=True,
        is_beta=False,
        notes='M-Pesa is the most popular payment method in Kenya'
    )
    
    # Create M-Pesa provider
    mpesa = MobileMoneyProvider.objects.create(
        id=uuid.uuid4(),
        code='mpesa',
        name='M-Pesa',
        display_name='M-Pesa',
        requires_phone_number=True,
        phone_number_regex=r'^(?:\+254|0)?[71]\d{8}$',
        phone_number_example='+254712345678',
        api_identifier='mpesa',
        color_hex='#00B251',
        is_active=True
    )
    
    # Link provider to country
    mpesa.countries.add(kenya)
    
    print("Added Kenya with M-Pesa mobile money support")


def remove_mobile_money_data(apps, schema_editor):
    """Remove mobile money data"""
    MobileMoneyCountry = apps.get_model('users', 'MobileMoneyCountry')
    MobileMoneyProvider = apps.get_model('users', 'MobileMoneyProvider')
    
    MobileMoneyCountry.objects.all().delete()
    MobileMoneyProvider.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0012_add_additional_developing_countries'),
    ]

    operations = [
        migrations.CreateModel(
            name='MobileMoneyCountry',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ('country_code', models.CharField(help_text='ISO 3166-1 alpha-2 country code', max_length=2, unique=True)),
                ('country_name', models.CharField(max_length=100)),
                ('currency_code', models.CharField(help_text='ISO 4217 currency code (e.g., KES, NGN)', max_length=3)),
                ('paystack_enabled', models.BooleanField(default=True)),
                ('paystack_country_code', models.CharField(help_text="Paystack's country identifier", max_length=10)),
                ('providers', models.JSONField(default=list, help_text='List of available mobile money providers')),
                ('display_name', models.CharField(help_text='User-friendly name for payment method', max_length=100)),
                ('display_order', models.IntegerField(default=0)),
                ('is_active', models.BooleanField(default=True)),
                ('is_beta', models.BooleanField(default=False, help_text='Show beta tag for new integrations')),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Mobile Money Country',
                'verbose_name_plural': 'Mobile Money Countries',
                'db_table': 'mobile_money_countries',
                'ordering': ['display_order', 'country_name'],
            },
        ),
        migrations.CreateModel(
            name='MobileMoneyProvider',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ('code', models.CharField(max_length=50, unique=True)),
                ('name', models.CharField(max_length=100)),
                ('display_name', models.CharField(max_length=100)),
                ('requires_phone_number', models.BooleanField(default=True)),
                ('phone_number_regex', models.CharField(blank=True, help_text='Regex pattern for validating phone numbers', max_length=200)),
                ('phone_number_example', models.CharField(blank=True, help_text='Example phone number format', max_length=50)),
                ('api_identifier', models.CharField(help_text='Provider ID used in Paystack API', max_length=50)),
                ('icon_url', models.URLField(blank=True)),
                ('color_hex', models.CharField(blank=True, help_text='Brand color for UI', max_length=7)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('countries', models.ManyToManyField(related_name='available_providers', to='users.mobilemoneycountry')),
            ],
            options={
                'verbose_name': 'Mobile Money Provider',
                'verbose_name_plural': 'Mobile Money Providers',
                'db_table': 'mobile_money_providers',
                'ordering': ['name'],
            },
        ),
        migrations.RunPython(
            populate_mobile_money_data,
            remove_mobile_money_data
        ),
    ]