# Generated manually to add missing fields

from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('banking', '0001_initial'),
        ('payroll', '0004_paysetting_bonuspayment_incomewithholding_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='payrollrun',
            name='run_date',
            field=models.DateField(default=django.utils.timezone.now),
        ),
        migrations.AddField(
            model_name='payrollrun',
            name='accounting_period',
            field=models.CharField(blank=True, max_length=7, null=True),
        ),
        migrations.AddField(
            model_name='payrollrun',
            name='bank_account',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='banking.bankaccount'),
        ),
        migrations.AddField(
            model_name='payrollrun',
            name='filing_frequency',
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
    ]