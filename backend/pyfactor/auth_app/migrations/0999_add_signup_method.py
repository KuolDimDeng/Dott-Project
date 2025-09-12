from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('auth_app', '0001_initial'),  # Update this to your latest migration
    ]

    operations = [
        migrations.AddField(
            model_name='customauthuser',
            name='signup_method',
            field=models.CharField(
                max_length=50,
                default='email',
                choices=[
                    ('email', 'Email'),
                    ('google', 'Google OAuth'),
                    ('phone', 'Phone Number'),
                ],
                help_text='Method used for signup'
            ),
        ),
    ]