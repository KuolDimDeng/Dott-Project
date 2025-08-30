from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):
    
    dependencies = [
        ('chat', '0001_initial'),
        ('marketplace', '0002_consumerorder_orderreview'),
    ]
    
    operations = [
        migrations.AddField(
            model_name='chatconversation',
            name='related_order',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='chat_conversations', to='marketplace.consumerorder'),
        ),
        migrations.AddIndex(
            model_name='chatconversation',
            index=models.Index(fields=['consumer', 'is_active'], name='chat_conver_consume_idx'),
        ),
        migrations.AddIndex(
            model_name='chatconversation',
            index=models.Index(fields=['business', 'is_active'], name='chat_conver_busines_idx'),
        ),
        migrations.AddIndex(
            model_name='chatconversation',
            index=models.Index(fields=['-last_message_at'], name='chat_conver_last_me_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='chatconversation',
            unique_together={('consumer', 'business')},
        ),
    ]