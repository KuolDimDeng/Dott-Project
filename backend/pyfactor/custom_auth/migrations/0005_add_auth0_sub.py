# Generated manually for Auth0 migration
from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('custom_auth', '0004_alter_user_role'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='auth0_sub',
            field=models.CharField(blank=True, max_length=255, null=True, help_text='Auth0 subject identifier'),
        ),
    ] 