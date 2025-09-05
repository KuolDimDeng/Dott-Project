# Generated manually for progressive business registration

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0127_business_interaction_config'),
    ]

    operations = [
        migrations.AddField(
            model_name='business',
            name='entity_type',
            field=models.CharField(
                choices=[
                    ('INDIVIDUAL', 'Individual Service Provider'),
                    ('SMALL_BUSINESS', 'Small Business (1-10 employees)'),
                    ('MEDIUM_BUSINESS', 'Medium Business (11-50 employees)'),
                    ('LARGE_COMPANY', 'Large Company (50+ employees)'),
                    ('NON_PROFIT', 'Non-Profit Organization'),
                ],
                default='INDIVIDUAL',
                help_text='Type of business entity',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='business',
            name='registration_status',
            field=models.CharField(
                choices=[
                    ('REGISTERED', 'Yes, fully registered'),
                    ('INFORMAL', 'No, operating informally'),
                    ('IN_PROCESS', 'Registration in process'),
                ],
                default='INFORMAL',
                help_text='Business registration status',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='business',
            name='registration_number',
            field=models.CharField(
                blank=True,
                help_text='Business registration or license number',
                max_length=100,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='business',
            name='phone',
            field=models.CharField(
                blank=True,
                help_text='Primary business phone number',
                max_length=20,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='business',
            name='email',
            field=models.EmailField(
                blank=True,
                help_text='Primary business email',
                max_length=254,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='business',
            name='address',
            field=models.TextField(
                blank=True,
                help_text='Business street address',
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='business',
            name='city',
            field=models.CharField(
                blank=True,
                help_text='City where business is located',
                max_length=100,
                null=True,
            ),
        ),
    ]