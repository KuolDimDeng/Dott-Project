# Generated migration for user mode fields
from django.db import migrations, models

class Migration(migrations.Migration):
    
    dependencies = [
        ('users', '0124_add_payroll_bank_account'),
    ]
    
    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='user_mode',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('business', 'Business Mode'),
                    ('consumer', 'Consumer Mode'),
                ],
                default='business',
                help_text='Current active mode for the user'
            ),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='default_mode',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('business', 'Business Mode'),
                    ('consumer', 'Consumer Mode'),
                ],
                default='business',
                help_text='Default mode on login'
            ),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='has_consumer_access',
            field=models.BooleanField(
                default=True,
                help_text='Whether user can access consumer mode'
            ),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='has_business_access',
            field=models.BooleanField(
                default=False,
                help_text='Whether user can access business mode'
            ),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='last_mode_switch',
            field=models.DateTimeField(
                null=True,
                blank=True,
                help_text='Last time user switched modes'
            ),
        ),
    ]