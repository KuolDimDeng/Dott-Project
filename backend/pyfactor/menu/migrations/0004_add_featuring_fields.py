# Generated migration for featuring fields in MenuItem model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('menu', '0003_add_cloudinary_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='menuitem',
            name='featured_until',
            field=models.DateTimeField(blank=True, help_text='When featured status expires', null=True),
        ),
        migrations.AddField(
            model_name='menuitem',
            name='featured_priority',
            field=models.IntegerField(default=0, help_text='Higher priority items show first'),
        ),
        migrations.AddField(
            model_name='menuitem',
            name='featured_score',
            field=models.DecimalField(decimal_places=2, default=0, help_text='Calculated score for automatic featuring', max_digits=5),
        ),
        migrations.AddField(
            model_name='menuitem',
            name='view_count',
            field=models.IntegerField(default=0, help_text='Number of times viewed in marketplace'),
        ),
    ]