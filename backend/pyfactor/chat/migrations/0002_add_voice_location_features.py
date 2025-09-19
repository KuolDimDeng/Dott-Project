# Generated migration for voice notes and location sharing features

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='chatmessage',
            name='message_type',
            field=models.CharField(choices=[('text', 'Text Message'), ('image', 'Image'), ('voice', 'Voice Note'), ('location', 'Location Share'), ('voice_call', 'Voice Call'), ('video_call', 'Video Call'), ('order_request', 'Order Request'), ('order_confirmation', 'Order Confirmation'), ('system', 'System Message')], default='text', max_length=20),
        ),
        migrations.AddField(
            model_name='chatmessage',
            name='voice_duration',
            field=models.IntegerField(blank=True, help_text='Voice note duration in seconds', null=True),
        ),
        migrations.AddField(
            model_name='chatmessage',
            name='location_latitude',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='chatmessage',
            name='location_longitude',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='chatmessage',
            name='location_address',
            field=models.TextField(blank=True, help_text='Human-readable address'),
        ),
        migrations.AddField(
            model_name='chatmessage',
            name='location_name',
            field=models.CharField(blank=True, help_text='Place name or landmark', max_length=255),
        ),
        migrations.AddField(
            model_name='chatmessage',
            name='location_type',
            field=models.CharField(blank=True, choices=[('current', 'Current Location'), ('live', 'Live Location'), ('pin', 'Custom Pin')], max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='chatmessage',
            name='location_expires_at',
            field=models.DateTimeField(blank=True, help_text='For live location sharing', null=True),
        ),
    ]