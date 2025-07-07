# Generated manually for regional discount system

from django.db import migrations, models
import django.db.models.deletion
import uuid
from django.conf import settings


def populate_developing_countries(apps, schema_editor):
    """Populate initial developing countries data"""
    DevelopingCountry = apps.get_model('users', 'DevelopingCountry')
    
    countries_data = [
        # Africa
        {'country_code': 'KE', 'country_name': 'Kenya', 'income_level': 'lower_middle'},
        {'country_code': 'NG', 'country_name': 'Nigeria', 'income_level': 'lower_middle'},
        {'country_code': 'GH', 'country_name': 'Ghana', 'income_level': 'lower_middle'},
        {'country_code': 'ZA', 'country_name': 'South Africa', 'income_level': 'upper_middle'},
        {'country_code': 'EG', 'country_name': 'Egypt', 'income_level': 'lower_middle'},
        {'country_code': 'MA', 'country_name': 'Morocco', 'income_level': 'lower_middle'},
        {'country_code': 'TZ', 'country_name': 'Tanzania', 'income_level': 'lower_middle'},
        {'country_code': 'UG', 'country_name': 'Uganda', 'income_level': 'low'},
        {'country_code': 'ET', 'country_name': 'Ethiopia', 'income_level': 'low'},
        {'country_code': 'RW', 'country_name': 'Rwanda', 'income_level': 'low'},
        {'country_code': 'SN', 'country_name': 'Senegal', 'income_level': 'lower_middle'},
        {'country_code': 'CI', 'country_name': 'Ivory Coast', 'income_level': 'lower_middle'},
        {'country_code': 'CM', 'country_name': 'Cameroon', 'income_level': 'lower_middle'},
        {'country_code': 'ZM', 'country_name': 'Zambia', 'income_level': 'lower_middle'},
        {'country_code': 'ZW', 'country_name': 'Zimbabwe', 'income_level': 'lower_middle'},
        
        # Asia
        {'country_code': 'IN', 'country_name': 'India', 'income_level': 'lower_middle'},
        {'country_code': 'BD', 'country_name': 'Bangladesh', 'income_level': 'lower_middle'},
        {'country_code': 'PK', 'country_name': 'Pakistan', 'income_level': 'lower_middle'},
        {'country_code': 'ID', 'country_name': 'Indonesia', 'income_level': 'upper_middle'},
        {'country_code': 'PH', 'country_name': 'Philippines', 'income_level': 'lower_middle'},
        {'country_code': 'VN', 'country_name': 'Vietnam', 'income_level': 'lower_middle'},
        {'country_code': 'LK', 'country_name': 'Sri Lanka', 'income_level': 'lower_middle'},
        {'country_code': 'NP', 'country_name': 'Nepal', 'income_level': 'lower_middle'},
        {'country_code': 'MM', 'country_name': 'Myanmar', 'income_level': 'lower_middle'},
        {'country_code': 'KH', 'country_name': 'Cambodia', 'income_level': 'lower_middle'},
        
        # Latin America
        {'country_code': 'MX', 'country_name': 'Mexico', 'income_level': 'upper_middle'},
        {'country_code': 'BR', 'country_name': 'Brazil', 'income_level': 'upper_middle'},
        {'country_code': 'CO', 'country_name': 'Colombia', 'income_level': 'upper_middle'},
        {'country_code': 'PE', 'country_name': 'Peru', 'income_level': 'upper_middle'},
        {'country_code': 'EC', 'country_name': 'Ecuador', 'income_level': 'upper_middle'},
        {'country_code': 'BO', 'country_name': 'Bolivia', 'income_level': 'lower_middle'},
        {'country_code': 'GT', 'country_name': 'Guatemala', 'income_level': 'upper_middle'},
        {'country_code': 'HN', 'country_name': 'Honduras', 'income_level': 'lower_middle'},
        {'country_code': 'NI', 'country_name': 'Nicaragua', 'income_level': 'lower_middle'},
        {'country_code': 'SV', 'country_name': 'El Salvador', 'income_level': 'lower_middle'},
        
        # Middle East & North Africa
        {'country_code': 'JO', 'country_name': 'Jordan', 'income_level': 'upper_middle'},
        {'country_code': 'LB', 'country_name': 'Lebanon', 'income_level': 'upper_middle'},
        {'country_code': 'TN', 'country_name': 'Tunisia', 'income_level': 'lower_middle'},
        {'country_code': 'DZ', 'country_name': 'Algeria', 'income_level': 'lower_middle'},
        
        # Eastern Europe
        {'country_code': 'UA', 'country_name': 'Ukraine', 'income_level': 'lower_middle'},
        {'country_code': 'MD', 'country_name': 'Moldova', 'income_level': 'upper_middle'},
        {'country_code': 'AL', 'country_name': 'Albania', 'income_level': 'upper_middle'},
        {'country_code': 'BA', 'country_name': 'Bosnia and Herzegovina', 'income_level': 'upper_middle'},
    ]
    
    for country_data in countries_data:
        DevelopingCountry.objects.create(
            country_code=country_data['country_code'],
            country_name=country_data['country_name'],
            income_level=country_data['income_level'],
            discount_percentage=50,
            is_active=True
        )


def reverse_populate_countries(apps, schema_editor):
    """Remove all developing countries data"""
    DevelopingCountry = apps.get_model('users', 'DevelopingCountry')
    DevelopingCountry.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0010_merge_migrations'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Create DevelopingCountry model
        migrations.CreateModel(
            name='DevelopingCountry',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('country_code', models.CharField(help_text='ISO 3166-1 alpha-2 country code', max_length=2, unique=True)),
                ('country_name', models.CharField(max_length=100)),
                ('income_level', models.CharField(choices=[('low', 'Low income'), ('lower_middle', 'Lower middle income'), ('upper_middle', 'Upper middle income')], default='lower_middle', max_length=50)),
                ('discount_percentage', models.IntegerField(default=50)),
                ('is_active', models.BooleanField(default=True)),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Developing Country',
                'verbose_name_plural': 'Developing Countries',
                'db_table': 'developing_countries',
                'ordering': ['country_name'],
            },
        ),
        
        # Create DiscountVerification model
        migrations.CreateModel(
            name='DiscountVerification',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('claimed_country', models.CharField(max_length=2)),
                ('detected_country', models.CharField(blank=True, max_length=2)),
                ('ip_address', models.GenericIPAddressField()),
                ('verification_status', models.CharField(choices=[('pending', 'Pending'), ('verified', 'Verified'), ('flagged', 'Flagged for Review'), ('rejected', 'Rejected')], default='pending', max_length=20)),
                ('ip_country_match', models.BooleanField(default=True)),
                ('payment_country_match', models.BooleanField(default=True)),
                ('employee_location_match', models.BooleanField(default=True)),
                ('risk_score', models.IntegerField(default=0)),
                ('grace_period_ends', models.DateTimeField()),
                ('verified_at', models.DateTimeField(blank=True, null=True)),
                ('review_notes', models.TextField(blank=True)),
                ('login_countries', models.JSONField(default=dict)),
                ('payment_methods', models.JSONField(default=list)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('business', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='discount_verification', to='users.business')),
                ('reviewed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='discount_reviews', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Discount Verification',
                'verbose_name_plural': 'Discount Verifications',
                'db_table': 'discount_verifications',
            },
        ),
        
        # Add discount fields to Business model
        migrations.AddField(
            model_name='business',
            name='regional_discount_eligible',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='business',
            name='regional_discount_percentage',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='business',
            name='discount_verified',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='business',
            name='discount_verification_date',
            field=models.DateTimeField(blank=True, null=True),
        ),
        
        # Populate initial data
        migrations.RunPython(populate_developing_countries, reverse_populate_countries),
    ]