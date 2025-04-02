from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_auto_20250330_1558'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='occupation',
            field=models.CharField(blank=True, max_length=200, null=True),
        ),
    ] 