# Generated migration for tax validation models

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('taxes', '0017_add_deadline_fields_to_globalsalestaxrate'),
    ]

    operations = [
        migrations.CreateModel(
            name='TaxRateValidationBatch',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('batch_id', models.CharField(max_length=50, unique=True)),
                ('created_date', models.DateTimeField(default=django.utils.timezone.now)),
                ('total_changes', models.IntegerField(default=0)),
                ('countries_affected', models.IntegerField(default=0)),
                ('critical_changes', models.IntegerField(default=0)),
                ('warning_changes', models.IntegerField(default=0)),
                ('status', models.CharField(choices=[('pending', 'Pending Review'), ('approved', 'Approved'), ('rejected', 'Rejected'), ('applied', 'Applied to Production')], default='pending', max_length=20)),
                ('reviewed_date', models.DateTimeField(blank=True, null=True)),
                ('review_notes', models.TextField(blank=True)),
                ('applied_date', models.DateTimeField(blank=True, null=True)),
                ('rollback_available', models.BooleanField(default=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_batches', to=settings.AUTH_USER_MODEL)),
                ('reviewed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reviewed_batches', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_date'],
            },
        ),
        migrations.CreateModel(
            name='TaxRateChangeLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('country', models.CharField(max_length=2)),
                ('country_name', models.CharField(max_length=100)),
                ('region_name', models.CharField(blank=True, max_length=100)),
                ('change_type', models.CharField(choices=[('rate_change', 'Tax Rate Changed'), ('authority_change', 'Tax Authority Updated'), ('filing_change', 'Filing Info Updated'), ('new_rate', 'New Tax Rate Added'), ('bulk_update', 'Bulk Update Applied')], max_length=20)),
                ('severity', models.CharField(choices=[('info', 'Information'), ('warning', 'Warning'), ('critical', 'Critical')], default='info', max_length=10)),
                ('field_name', models.CharField(max_length=50)),
                ('old_value', models.TextField(blank=True, null=True)),
                ('new_value', models.TextField(blank=True, null=True)),
                ('change_percentage', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('change_date', models.DateTimeField(default=django.utils.timezone.now)),
                ('change_source', models.CharField(default='manual', max_length=50)),
                ('batch_id', models.CharField(blank=True, max_length=50)),
                ('requires_approval', models.BooleanField(default=False)),
                ('approved', models.BooleanField(default=False)),
                ('approved_date', models.DateTimeField(blank=True, null=True)),
                ('approval_notes', models.TextField(blank=True)),
                ('approved_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='tax_approvals', to=settings.AUTH_USER_MODEL)),
                ('changed_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='tax_changes', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-change_date'],
            },
        ),
        migrations.CreateModel(
            name='GlobalSalesTaxRateStaging',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('country', models.CharField(max_length=2)),
                ('country_name', models.CharField(max_length=100)),
                ('region_code', models.CharField(blank=True, max_length=10)),
                ('region_name', models.CharField(blank=True, max_length=100)),
                ('locality', models.CharField(blank=True, max_length=100)),
                ('tax_type', models.CharField(max_length=20)),
                ('rate', models.DecimalField(decimal_places=4, max_digits=6)),
                ('tax_authority_name', models.CharField(blank=True, max_length=200)),
                ('filing_frequency', models.CharField(blank=True, max_length=20)),
                ('filing_day_of_month', models.IntegerField(blank=True, null=True)),
                ('online_filing_available', models.BooleanField(default=False)),
                ('online_portal_name', models.CharField(blank=True, max_length=100)),
                ('online_portal_url', models.URLField(blank=True, max_length=500)),
                ('main_form_name', models.CharField(blank=True, max_length=100)),
                ('filing_instructions', models.TextField(blank=True)),
                ('manual_filing_fee', models.DecimalField(decimal_places=2, default=35.0, max_digits=6)),
                ('online_filing_fee', models.DecimalField(decimal_places=2, default=65.0, max_digits=6)),
                ('filing_deadline_days', models.IntegerField(blank=True, null=True)),
                ('filing_deadline_description', models.TextField(blank=True)),
                ('grace_period_days', models.IntegerField(blank=True, default=0)),
                ('penalty_rate', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('deadline_notes', models.TextField(blank=True)),
                ('effective_date', models.DateField()),
                ('is_current', models.BooleanField(default=True)),
                ('batch_id', models.CharField(max_length=50)),
                ('staging_date', models.DateTimeField(default=django.utils.timezone.now)),
                ('validation_status', models.CharField(default='pending', max_length=20)),
                ('validation_notes', models.TextField(blank=True)),
            ],
        ),
        migrations.AddIndex(
            model_name='taxratechangelog',
            index=models.Index(fields=['country', 'change_date'], name='taxes_taxra_country_4e7a9f_idx'),
        ),
        migrations.AddIndex(
            model_name='taxratechangelog',
            index=models.Index(fields=['batch_id', 'approved'], name='taxes_taxra_batch_i_f5c5d7_idx'),
        ),
        migrations.AddIndex(
            model_name='taxratechangelog',
            index=models.Index(fields=['severity', 'requires_approval'], name='taxes_taxra_severit_8e9b57_idx'),
        ),
        migrations.AddIndex(
            model_name='globalsalestaxratestaging',
            index=models.Index(fields=['country', 'batch_id'], name='taxes_globa_country_a8c7e3_idx'),
        ),
        migrations.AddIndex(
            model_name='globalsalestaxratestaging',
            index=models.Index(fields=['batch_id', 'validation_status'], name='taxes_globa_batch_i_4b5c4f_idx'),
        ),
    ]