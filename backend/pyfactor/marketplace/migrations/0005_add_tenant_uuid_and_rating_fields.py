"""
Migration to add tenant_uuid field for better mapping and rating fields
"""
from django.db import migrations, models
import uuid


def populate_tenant_uuids(apps, schema_editor):
    """
    Populate tenant_uuid from User.tenant_id
    """
    BusinessListing = apps.get_model('marketplace', 'BusinessListing')
    User = apps.get_model('custom_auth', 'User')

    for listing in BusinessListing.objects.all():
        try:
            user = User.objects.get(id=listing.business_id)
            if user.tenant_id:
                listing.tenant_uuid = user.tenant_id
                listing.save()
        except User.DoesNotExist:
            continue


def reverse_tenant_uuids(apps, schema_editor):
    """
    Clear tenant_uuid field (reverse migration)
    """
    BusinessListing = apps.get_model('marketplace', 'BusinessListing')
    BusinessListing.objects.update(tenant_uuid=None)


class Migration(migrations.Migration):

    dependencies = [
        ('marketplace', '0004_add_featuring_fields'),  # Adjust to your last migration
    ]

    operations = [
        # Add tenant_uuid field for better mapping
        migrations.AddField(
            model_name='businesslisting',
            name='tenant_uuid',
            field=models.UUIDField(null=True, blank=True, db_index=True,
                                  help_text='Direct tenant UUID for faster queries'),
        ),

        # Add real rating tracking fields
        migrations.AddField(
            model_name='businesslisting',
            name='rating_count_1star',
            field=models.IntegerField(default=0, help_text='Number of 1-star ratings'),
        ),
        migrations.AddField(
            model_name='businesslisting',
            name='rating_count_2star',
            field=models.IntegerField(default=0, help_text='Number of 2-star ratings'),
        ),
        migrations.AddField(
            model_name='businesslisting',
            name='rating_count_3star',
            field=models.IntegerField(default=0, help_text='Number of 3-star ratings'),
        ),
        migrations.AddField(
            model_name='businesslisting',
            name='rating_count_4star',
            field=models.IntegerField(default=0, help_text='Number of 4-star ratings'),
        ),
        migrations.AddField(
            model_name='businesslisting',
            name='rating_count_5star',
            field=models.IntegerField(default=0, help_text='Number of 5-star ratings'),
        ),
        migrations.AddField(
            model_name='businesslisting',
            name='last_review_date',
            field=models.DateTimeField(null=True, blank=True, help_text='Date of last review'),
        ),

        # Trust and quality metrics
        migrations.AddField(
            model_name='businesslisting',
            name='trust_score',
            field=models.IntegerField(default=0, help_text='Calculated trust score (0-100)'),
        ),
        migrations.AddField(
            model_name='businesslisting',
            name='completion_rate',
            field=models.DecimalField(max_digits=5, decimal_places=2, default=0,
                                     help_text='Order completion rate percentage'),
        ),
        migrations.AddField(
            model_name='businesslisting',
            name='repeat_customer_rate',
            field=models.DecimalField(max_digits=5, decimal_places=2, default=0,
                                     help_text='Percentage of repeat customers'),
        ),

        # Performance metrics for featuring
        migrations.AddField(
            model_name='businesslisting',
            name='weekly_order_count',
            field=models.IntegerField(default=0, help_text='Orders in last 7 days'),
        ),
        migrations.AddField(
            model_name='businesslisting',
            name='monthly_order_count',
            field=models.IntegerField(default=0, help_text='Orders in last 30 days'),
        ),
        migrations.AddField(
            model_name='businesslisting',
            name='featuring_score',
            field=models.DecimalField(max_digits=5, decimal_places=2, default=0,
                                     help_text='Calculated score for automatic featuring'),
        ),

        # Run data migration to populate tenant_uuid
        migrations.RunPython(populate_tenant_uuids, reverse_tenant_uuids),

        # Add composite index for better query performance
        migrations.AddIndex(
            model_name='businesslisting',
            index=models.Index(fields=['tenant_uuid', 'is_visible_in_marketplace']),
        ),
        migrations.AddIndex(
            model_name='businesslisting',
            index=models.Index(fields=['city', 'is_featured', 'featuring_score']),
        ),
        migrations.AddIndex(
            model_name='businesslisting',
            index=models.Index(fields=['trust_score', 'average_rating']),
        ),
    ]