# Generated manually 2025-07-05
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('taxes', '0010_add_tax_cache_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='TaxSuggestionFeedback',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('tenant_id', models.UUIDField(db_index=True)),
                ('user_email', models.EmailField(db_index=True, max_length=254)),
                ('country_code', models.CharField(db_index=True, max_length=2)),
                ('country_name', models.CharField(max_length=100)),
                ('business_type', models.CharField(db_index=True, max_length=100)),
                ('tax_type', models.CharField(choices=[('sales', 'Sales Tax'), ('income', 'Income Tax'), ('payroll', 'Payroll Tax'), ('property', 'Property Tax'), ('excise', 'Excise Tax'), ('other', 'Other')], db_index=True, max_length=50)),
                ('original_suggestion', models.TextField(help_text='The original AI suggestion')),
                ('user_feedback', models.TextField(help_text="User's feedback about the suggestion")),
                ('correct_info', models.TextField(blank=True, help_text='Correct information provided by user')),
                ('confidence_score', models.DecimalField(blank=True, decimal_places=2, help_text='AI confidence score (0-1)', max_digits=3, null=True)),
                ('status', models.CharField(choices=[('pending', 'Pending Review'), ('reviewed', 'Reviewed'), ('resolved', 'Resolved')], db_index=True, default='pending', max_length=20)),
                ('resolution_notes', models.TextField(blank=True)),
                ('reviewed_by', models.CharField(blank=True, max_length=200)),
                ('reviewed_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['-created_at'],
                'app_label': 'taxes',
            },
        ),
        migrations.AddIndex(
            model_name='taxsuggestionfeedback',
            index=models.Index(fields=['status', 'created_at'], name='taxes_taxsu_status_f0d8a5_idx'),
        ),
        migrations.AddIndex(
            model_name='taxsuggestionfeedback',
            index=models.Index(fields=['country_code', 'business_type'], name='taxes_taxsu_country_c60e8e_idx'),
        ),
        migrations.AddIndex(
            model_name='taxsuggestionfeedback',
            index=models.Index(fields=['tax_type', 'status'], name='taxes_taxsu_tax_typ_3e5c7b_idx'),
        ),
    ]