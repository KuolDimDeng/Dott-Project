from django.db import migrations, models
from django.contrib.postgres.fields import ArrayField

class Migration(migrations.Migration):
    dependencies = [
        ('marketplace', '0004_add_subcategory_fields'),
    ]
    
    operations = [
        # Add business_type field
        migrations.AddField(
            model_name='businesslisting',
            name='business_type',
            field=models.CharField(
                max_length=50,
                choices=[
                    ('RESTAURANT_CAFE', 'Restaurant & Cafe'),
                    ('RETAIL_SHOP', 'Retail Shop'),
                    ('GROCERY_STORE', 'Grocery Store'),
                    ('PHARMACY', 'Pharmacy'),
                    ('BEAUTY_SALON', 'Beauty Salon'),
                    ('BARBER_SHOP', 'Barber Shop'),
                    ('FITNESS_CENTER', 'Fitness Center'),
                    ('MEDICAL_CLINIC', 'Medical Clinic'),
                    ('DENTAL_CLINIC', 'Dental Clinic'),
                    ('VETERINARY', 'Veterinary Clinic'),
                    ('AUTO_SERVICE', 'Auto Service'),
                    ('LAUNDRY', 'Laundry Service'),
                    ('HOTEL', 'Hotel'),
                    ('EDUCATION', 'Education'),
                    ('PROFESSIONAL_SERVICE', 'Professional Service'),
                    ('OTHER', 'Other'),
                ],
                default='OTHER',
            ),
        ),
        # Migrate data from primary_category to business_type
        migrations.RunSQL(
            sql="""
            UPDATE marketplace_business_listing
            SET business_type = CASE
                WHEN primary_category IN ('food', 'restaurant', 'cafe') THEN 'RESTAURANT_CAFE'
                WHEN primary_category IN ('shop', 'retail', 'shopping') THEN 'RETAIL_SHOP'
                WHEN primary_category IN ('grocery', 'supermarket') THEN 'GROCERY_STORE'
                WHEN primary_category = 'pharmacy' THEN 'PHARMACY'
                WHEN primary_category IN ('beauty', 'salon') THEN 'BEAUTY_SALON'
                WHEN primary_category = 'barber' THEN 'BARBER_SHOP'
                WHEN primary_category IN ('gym', 'fitness') THEN 'FITNESS_CENTER'
                WHEN primary_category IN ('medical', 'clinic', 'hospital') THEN 'MEDICAL_CLINIC'
                WHEN primary_category = 'dental' THEN 'DENTAL_CLINIC'
                WHEN primary_category IN ('vet', 'veterinary') THEN 'VETERINARY'
                WHEN primary_category IN ('auto', 'mechanic', 'car') THEN 'AUTO_SERVICE'
                WHEN primary_category = 'laundry' THEN 'LAUNDRY'
                WHEN primary_category = 'hotel' THEN 'HOTEL'
                WHEN primary_category IN ('school', 'education') THEN 'EDUCATION'
                WHEN primary_category IN ('professional', 'service') THEN 'PROFESSIONAL_SERVICE'
                ELSE 'OTHER'
            END
            WHERE business_type IS NULL OR business_type = 'OTHER'
            """,
            reverse_sql="UPDATE marketplace_business_listing SET business_type = 'OTHER'",
        ),
    ]