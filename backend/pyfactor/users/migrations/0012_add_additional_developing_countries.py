"""
Add additional developing countries for comprehensive global coverage
"""
from django.db import migrations
import uuid


def add_additional_countries(apps, schema_editor):
    """Add 84 additional developing countries"""
    DevelopingCountry = apps.get_model('users', 'DevelopingCountry')
    
    # Check existing countries to avoid duplicates
    existing_codes = set(
        DevelopingCountry.objects.values_list('country_code', flat=True)
    )
    
    additional_countries = [
        # Additional African Countries
        {'code': 'AO', 'name': 'Angola', 'income': 'lower_middle'},
        {'code': 'BJ', 'name': 'Benin', 'income': 'lower_middle'},
        {'code': 'BW', 'name': 'Botswana', 'income': 'upper_middle'},
        {'code': 'BF', 'name': 'Burkina Faso', 'income': 'low'},
        {'code': 'BI', 'name': 'Burundi', 'income': 'low'},
        {'code': 'CV', 'name': 'Cape Verde', 'income': 'lower_middle'},
        {'code': 'CF', 'name': 'Central African Republic', 'income': 'low'},
        {'code': 'TD', 'name': 'Chad', 'income': 'low'},
        {'code': 'KM', 'name': 'Comoros', 'income': 'lower_middle'},
        {'code': 'CG', 'name': 'Congo', 'income': 'lower_middle'},
        {'code': 'CD', 'name': 'DR Congo', 'income': 'low'},
        {'code': 'DJ', 'name': 'Djibouti', 'income': 'lower_middle'},
        {'code': 'GQ', 'name': 'Equatorial Guinea', 'income': 'upper_middle'},
        {'code': 'ER', 'name': 'Eritrea', 'income': 'low'},
        {'code': 'SZ', 'name': 'Eswatini', 'income': 'lower_middle'},
        {'code': 'GA', 'name': 'Gabon', 'income': 'upper_middle'},
        {'code': 'GM', 'name': 'Gambia', 'income': 'low'},
        {'code': 'GN', 'name': 'Guinea', 'income': 'low'},
        {'code': 'GW', 'name': 'Guinea-Bissau', 'income': 'low'},
        {'code': 'LS', 'name': 'Lesotho', 'income': 'lower_middle'},
        {'code': 'LR', 'name': 'Liberia', 'income': 'low'},
        {'code': 'LY', 'name': 'Libya', 'income': 'upper_middle'},
        {'code': 'MG', 'name': 'Madagascar', 'income': 'low'},
        {'code': 'MW', 'name': 'Malawi', 'income': 'low'},
        {'code': 'ML', 'name': 'Mali', 'income': 'low'},
        {'code': 'MR', 'name': 'Mauritania', 'income': 'lower_middle'},
        {'code': 'MU', 'name': 'Mauritius', 'income': 'upper_middle'},
        {'code': 'MZ', 'name': 'Mozambique', 'income': 'low'},
        {'code': 'NA', 'name': 'Namibia', 'income': 'upper_middle'},
        {'code': 'NE', 'name': 'Niger', 'income': 'low'},
        {'code': 'ST', 'name': 'São Tomé and Príncipe', 'income': 'lower_middle'},
        {'code': 'SC', 'name': 'Seychelles', 'income': 'upper_middle'},
        {'code': 'SL', 'name': 'Sierra Leone', 'income': 'low'},
        {'code': 'SO', 'name': 'Somalia', 'income': 'low'},
        {'code': 'SS', 'name': 'South Sudan', 'income': 'low'},
        {'code': 'SD', 'name': 'Sudan', 'income': 'low'},
        {'code': 'TG', 'name': 'Togo', 'income': 'low'},
        
        # Additional Asian Countries
        {'code': 'AF', 'name': 'Afghanistan', 'income': 'low'},
        {'code': 'BT', 'name': 'Bhutan', 'income': 'lower_middle'},
        {'code': 'LA', 'name': 'Laos', 'income': 'lower_middle'},
        {'code': 'MV', 'name': 'Maldives', 'income': 'upper_middle'},
        {'code': 'MN', 'name': 'Mongolia', 'income': 'lower_middle'},
        {'code': 'TL', 'name': 'Timor-Leste', 'income': 'lower_middle'},
        {'code': 'YE', 'name': 'Yemen', 'income': 'low'},
        
        # Pacific Island Countries
        {'code': 'FJ', 'name': 'Fiji', 'income': 'upper_middle'},
        {'code': 'KI', 'name': 'Kiribati', 'income': 'lower_middle'},
        {'code': 'MH', 'name': 'Marshall Islands', 'income': 'upper_middle'},
        {'code': 'FM', 'name': 'Micronesia', 'income': 'lower_middle'},
        {'code': 'NR', 'name': 'Nauru', 'income': 'upper_middle'},
        {'code': 'PW', 'name': 'Palau', 'income': 'upper_middle'},
        {'code': 'PG', 'name': 'Papua New Guinea', 'income': 'lower_middle'},
        {'code': 'WS', 'name': 'Samoa', 'income': 'lower_middle'},
        {'code': 'SB', 'name': 'Solomon Islands', 'income': 'lower_middle'},
        {'code': 'TO', 'name': 'Tonga', 'income': 'upper_middle'},
        {'code': 'TV', 'name': 'Tuvalu', 'income': 'upper_middle'},
        {'code': 'VU', 'name': 'Vanuatu', 'income': 'lower_middle'},
        
        # Caribbean Countries
        {'code': 'BB', 'name': 'Barbados', 'income': 'upper_middle'},
        {'code': 'DO', 'name': 'Dominican Republic', 'income': 'upper_middle'},
        {'code': 'GY', 'name': 'Guyana', 'income': 'upper_middle'},
        {'code': 'HT', 'name': 'Haiti', 'income': 'lower_middle'},
        {'code': 'JM', 'name': 'Jamaica', 'income': 'upper_middle'},
        {'code': 'SR', 'name': 'Suriname', 'income': 'upper_middle'},
        {'code': 'TT', 'name': 'Trinidad and Tobago', 'income': 'upper_middle'},
        
        # Additional Latin American Countries
        {'code': 'AR', 'name': 'Argentina', 'income': 'upper_middle'},
        {'code': 'BZ', 'name': 'Belize', 'income': 'lower_middle'},
        {'code': 'CL', 'name': 'Chile', 'income': 'upper_middle'},
        {'code': 'CR', 'name': 'Costa Rica', 'income': 'upper_middle'},
        {'code': 'PA', 'name': 'Panama', 'income': 'upper_middle'},
        {'code': 'PY', 'name': 'Paraguay', 'income': 'upper_middle'},
        {'code': 'UY', 'name': 'Uruguay', 'income': 'upper_middle'},
        
        # Additional Middle East Countries
        {'code': 'IQ', 'name': 'Iraq', 'income': 'upper_middle'},
        {'code': 'PS', 'name': 'Palestine', 'income': 'lower_middle'},
        {'code': 'SY', 'name': 'Syria', 'income': 'low'},
        
        # Additional Eastern European Countries
        {'code': 'AM', 'name': 'Armenia', 'income': 'upper_middle'},
        {'code': 'AZ', 'name': 'Azerbaijan', 'income': 'upper_middle'},
        {'code': 'GE', 'name': 'Georgia', 'income': 'upper_middle'},
        {'code': 'XK', 'name': 'Kosovo', 'income': 'upper_middle'},
        {'code': 'MK', 'name': 'North Macedonia', 'income': 'upper_middle'},
        {'code': 'RS', 'name': 'Serbia', 'income': 'upper_middle'},
    ]
    
    # Create countries that don't already exist
    countries_to_create = []
    for country_data in additional_countries:
        if country_data['code'] not in existing_codes:
            countries_to_create.append(
                DevelopingCountry(
                    id=uuid.uuid4(),
                    country_code=country_data['code'],
                    country_name=country_data['name'],
                    income_level=country_data['income'],
                    discount_percentage=50,
                    is_active=True,
                    notes='Added in comprehensive expansion'
                )
            )
    
    if countries_to_create:
        DevelopingCountry.objects.bulk_create(countries_to_create)
        print(f"Added {len(countries_to_create)} new developing countries")
    else:
        print("No new countries to add - all already exist")


def remove_additional_countries(apps, schema_editor):
    """Remove the additional countries (rollback)"""
    DevelopingCountry = apps.get_model('users', 'DevelopingCountry')
    
    # List of country codes added in this migration
    codes_to_remove = [
        'AO', 'BJ', 'BW', 'BF', 'BI', 'CV', 'CF', 'TD', 'KM', 'CG', 'CD', 'DJ',
        'GQ', 'ER', 'SZ', 'GA', 'GM', 'GN', 'GW', 'LS', 'LR', 'LY', 'MG', 'MW',
        'ML', 'MR', 'MU', 'MZ', 'NA', 'NE', 'ST', 'SC', 'SL', 'SO', 'SS', 'SD',
        'TG', 'AF', 'BT', 'LA', 'MV', 'MN', 'TL', 'YE', 'FJ', 'KI', 'MH', 'FM',
        'NR', 'PW', 'PG', 'WS', 'SB', 'TO', 'TV', 'VU', 'BB', 'DO', 'GY', 'HT',
        'JM', 'SR', 'TT', 'AR', 'BZ', 'CL', 'CR', 'PA', 'PY', 'UY', 'IQ', 'PS',
        'SY', 'AM', 'AZ', 'GE', 'XK', 'MK', 'RS'
    ]
    
    DevelopingCountry.objects.filter(country_code__in=codes_to_remove).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0011_add_regional_discount_fields'),
    ]

    operations = [
        migrations.RunPython(
            add_additional_countries,
            remove_additional_countries
        ),
    ]