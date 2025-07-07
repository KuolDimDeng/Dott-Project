# Generated manually for adding multi-provider payment support

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('payroll', '0007_add_stripe_payroll_models'),
        ('hr', '0001_initial'),
    ]

    operations = [
        # Add payment provider field to EmployeePayoutRecord
        migrations.AddField(
            model_name='employeepayoutrecord',
            name='payment_provider',
            field=models.CharField(
                blank=True,
                choices=[
                    ('stripe', 'Stripe'),
                    ('wise', 'Wise'),
                    ('mobile_money', 'Mobile Money'),
                    ('paystack', 'Paystack'),
                ],
                default='stripe',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='employeepayoutrecord',
            name='wise_batch_id',
            field=models.CharField(blank=True, help_text='Wise batch ID if using Wise', max_length=100),
        ),
        migrations.AddField(
            model_name='employeepayoutrecord',
            name='mobile_money_reference',
            field=models.CharField(blank=True, help_text='Mobile money transaction reference', max_length=100),
        ),
        
        # Create EmployeePaymentSetup model
        migrations.CreateModel(
            name='EmployeePaymentSetup',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tenant_id', models.UUIDField(blank=True, db_column='tenant_id', null=True)),
                ('payment_provider', models.CharField(
                    choices=[
                        ('stripe', 'Stripe Connect'),
                        ('wise', 'Wise Transfer'),
                        ('mobile_money', 'Mobile Money'),
                    ],
                    max_length=20
                )),
                ('setup_status', models.CharField(
                    choices=[
                        ('pending', 'Pending Setup'),
                        ('invitation_sent', 'Invitation Sent'),
                        ('active', 'Active'),
                        ('failed', 'Failed'),
                        ('suspended', 'Suspended'),
                    ],
                    default='pending',
                    max_length=20
                )),
                ('provider_reference_id', models.CharField(blank=True, help_text="Provider's reference ID", max_length=100)),
                ('mobile_money_provider', models.CharField(blank=True, help_text='Specific mobile money provider (mpesa, mtn_momo, etc)', max_length=50)),
                ('mobile_money_number', models.CharField(blank=True, help_text='Mobile money phone number', max_length=20)),
                ('wise_recipient_id', models.CharField(blank=True, max_length=100)),
                ('invitation_sent_at', models.DateTimeField(blank=True, null=True)),
                ('setup_completed_at', models.DateTimeField(blank=True, null=True)),
                ('last_used_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('employee', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='payment_setups', to='hr.employee')),
            ],
            options={
                'verbose_name': 'Employee Payment Setup',
                'verbose_name_plural': 'Employee Payment Setups',
            },
        ),
        migrations.AddConstraint(
            model_name='employeepaymentsetup',
            constraint=models.UniqueConstraint(fields=('employee', 'payment_provider'), name='unique_employee_provider'),
        ),
    ]