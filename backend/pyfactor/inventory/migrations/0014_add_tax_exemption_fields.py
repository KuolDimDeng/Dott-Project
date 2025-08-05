# Generated manually
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0013_add_material_model'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='is_tax_exempt',
            field=models.BooleanField(default=False, help_text='Product is tax exempt'),
        ),
        migrations.AddField(
            model_name='product',
            name='tax_category',
            field=models.CharField(
                blank=True,
                max_length=50,
                null=True,
                choices=[
                    ('standard', 'Standard Rate'),
                    ('reduced', 'Reduced Rate'),
                    ('zero', 'Zero Rate'),
                    ('exempt', 'Tax Exempt'),
                ],
                default='standard',
                help_text='Tax category for this product'
            ),
        ),
    ]