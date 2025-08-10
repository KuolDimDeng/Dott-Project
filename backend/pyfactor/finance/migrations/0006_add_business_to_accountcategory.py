# Generated manually to add business field to AccountCategory

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
        ('finance', '0005_add_tenant_to_accountcategory'),
    ]

    operations = [
        # Add business field to AccountCategory
        migrations.AddField(
            model_name='accountcategory',
            name='business',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, to='users.business'),
            preserve_default=False,
        ),
    ]