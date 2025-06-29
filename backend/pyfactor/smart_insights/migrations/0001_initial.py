# Generated manually for Smart Insights app
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='CreditPackage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('credits', models.IntegerField()),
                ('price', models.DecimalField(decimal_places=2, max_digits=10)),
                ('stripe_price_id', models.CharField(blank=True, max_length=255, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['price'],
            },
        ),
        migrations.CreateModel(
            name='UserCredit',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('balance', models.IntegerField(default=0)),
                ('total_purchased', models.IntegerField(default=0)),
                ('total_used', models.IntegerField(default=0)),
                ('monthly_spend_limit', models.DecimalField(decimal_places=2, default=500.00, max_digits=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='credits', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='QueryLog',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('query', models.TextField()),
                ('response', models.TextField()),
                ('model_used', models.CharField(default='claude-3-opus-20240229', max_length=100)),
                ('input_tokens', models.IntegerField(default=0)),
                ('output_tokens', models.IntegerField(default=0)),
                ('credits_used', models.IntegerField(default=1)),
                ('processing_time_ms', models.IntegerField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='query_logs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
                'indexes': [models.Index(fields=['user', '-created_at'], name='smart_insig_user_id_3e1234_idx')],
            },
        ),
        migrations.CreateModel(
            name='MonthlyUsage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('year', models.IntegerField()),
                ('month', models.IntegerField()),
                ('total_credits_used', models.IntegerField(default=0)),
                ('total_cost', models.DecimalField(decimal_places=2, default=0.00, max_digits=10)),
                ('query_count', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='monthly_usage', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'unique_together': {('user', 'year', 'month')},
                'indexes': [models.Index(fields=['user', 'year', 'month'], name='smart_insig_user_id_4e5678_idx')],
            },
        ),
        migrations.CreateModel(
            name='CreditTransaction',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('transaction_type', models.CharField(choices=[('PURCHASE', 'Purchase'), ('USAGE', 'Usage'), ('REFUND', 'Refund'), ('GRANT', 'Grant'), ('EXPIRE', 'Expire')], max_length=20)),
                ('amount', models.IntegerField()),
                ('balance_before', models.IntegerField()),
                ('balance_after', models.IntegerField()),
                ('description', models.TextField(blank=True)),
                ('stripe_payment_intent_id', models.CharField(blank=True, max_length=255, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('package', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='smart_insights.creditpackage')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='credit_transactions', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
                'indexes': [models.Index(fields=['user', '-created_at'], name='smart_insig_user_id_2a9876_idx')],
            },
        ),
    ]