# Generated migration for adding purpose field to BankAccount

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('banking', '0003_country_paymentgateway_countrypaymentgateway'),
    ]

    operations = [
        migrations.AddField(
            model_name='bankaccount',
            name='purpose',
            field=models.CharField(
                blank=True,
                choices=[
                    ('payroll', 'Payroll'),
                    ('payments', 'Customer Payments'),
                    ('transfers', 'Vendor Transfers'),
                    ('sales', 'Sales Revenue'),
                    ('general', 'General Purpose'),
                ],
                help_text='The business purpose of this bank account',
                max_length=20,
                null=True
            ),
        ),
    ]