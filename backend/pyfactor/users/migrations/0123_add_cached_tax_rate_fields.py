# Generated to add cached tax rate fields for faster POS access
from django.db import migrations, models

class Migration(migrations.Migration):
    
    dependencies = [
        ('users', '0122_merge_20250818_0358'),
    ]
    
    operations = [
        # Add cached tax rate fields to UserProfile
        migrations.AddField(
            model_name='userprofile',
            name='cached_tax_rate',
            field=models.DecimalField(
                max_digits=5, 
                decimal_places=4, 
                null=True, 
                blank=True,
                help_text='Cached tax rate as decimal (0.18 = 18%)'
            ),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='cached_tax_rate_percentage',
            field=models.DecimalField(
                max_digits=5, 
                decimal_places=2, 
                null=True, 
                blank=True,
                help_text='Cached tax rate as percentage (18.00 = 18%)'
            ),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='cached_tax_jurisdiction',
            field=models.CharField(
                max_length=100, 
                null=True, 
                blank=True,
                help_text='e.g., "US, CA" or "Kenya"'
            ),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='cached_tax_updated_at',
            field=models.DateTimeField(
                null=True, 
                blank=True,
                help_text='When tax rate was last cached'
            ),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='cached_tax_source',
            field=models.CharField(
                max_length=20,
                null=True,
                blank=True,
                choices=[
                    ('tenant', 'Custom Tenant Rate'),
                    ('global', 'Global Default Rate'),
                    ('manual', 'Manually Set'),
                ],
                help_text='Source of the cached tax rate'
            ),
        ),
    ]