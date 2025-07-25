# Generated manually to change Geofence.created_by from Employee to User

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('custom_auth', '0001_initial'),
        ('hr', '0016_merge'),
    ]

    operations = [
        migrations.AlterField(
            model_name='geofence',
            name='created_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='created_geofences',
                to='custom_auth.User'
            ),
        ),
    ]