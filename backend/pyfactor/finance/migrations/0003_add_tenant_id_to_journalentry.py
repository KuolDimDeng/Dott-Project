# Generated migration to add tenant_id to JournalEntry model

from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='journalentry',
            name='tenant_id',
            field=models.UUIDField(null=True, blank=True, db_index=True),
        ),
    ]