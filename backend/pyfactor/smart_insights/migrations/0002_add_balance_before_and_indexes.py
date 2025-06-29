# Generated manually for Smart Insights app
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('smart_insights', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='credittransaction',
            name='balance_before',
            field=models.IntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='credittransaction',
            name='transaction_type',
            field=models.CharField(choices=[('purchase', 'Purchase'), ('usage', 'Usage'), ('refund', 'Refund'), ('bonus', 'Bonus'), ('grant', 'Grant')], max_length=20),
        ),
        migrations.AddIndex(
            model_name='usercredit',
            index=models.Index(fields=['user'], name='smart_insig_user_id_credit_idx'),
        ),
    ]