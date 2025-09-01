# Generated migration to fix UUID/integer foreign key mismatch

from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('transport', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # First, drop the foreign key constraints that are causing issues
        migrations.RunSQL(
            "ALTER TABLE transport_driver DROP CONSTRAINT IF EXISTS transport_driver_user_id_fkey CASCADE;",
            reverse_sql="-- No reverse needed"
        ),
        
        migrations.RunSQL(
            "ALTER TABLE transport_trip DROP CONSTRAINT IF EXISTS transport_trip_created_by_id_fkey CASCADE;",
            reverse_sql="-- No reverse needed"
        ),
        
        migrations.RunSQL(
            "ALTER TABLE transport_expense DROP CONSTRAINT IF EXISTS transport_expense_created_by_id_fkey CASCADE;",
            reverse_sql="-- No reverse needed"
        ),
        
        # Recreate the foreign key fields with proper types
        migrations.AlterField(
            model_name='driver',
            name='user',
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='driver_profile',
                to=settings.AUTH_USER_MODEL
            ),
        ),
        
        migrations.AlterField(
            model_name='trip',
            name='created_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='trips_created',
                to=settings.AUTH_USER_MODEL
            ),
        ),
        
        migrations.AlterField(
            model_name='expense',
            name='created_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to=settings.AUTH_USER_MODEL
            ),
        ),
    ]