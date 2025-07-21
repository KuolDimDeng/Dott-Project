# Generated manually for leads app

from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        # Remove hard dependency on custom_auth to avoid circular issues
    ]

    operations = [
        migrations.CreateModel(
            name='Lead',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('email', models.EmailField(help_text='Email address of the lead', max_length=254)),
                ('first_name', models.CharField(blank=True, help_text='First name of the lead', max_length=100, null=True)),
                ('last_name', models.CharField(blank=True, help_text='Last name of the lead', max_length=100, null=True)),
                ('company_name', models.CharField(blank=True, help_text='Company name if available', max_length=200, null=True)),
                ('phone_number', models.CharField(blank=True, help_text='Phone number if provided', max_length=20, null=True)),
                ('source', models.CharField(choices=[('contact_form', 'Contact Form'), ('invite_business_owner', 'Invite a Business Owner'), ('crisp_chat', 'Crisp Chat'), ('referral', 'Referral'), ('social_media', 'Social Media'), ('search_engine', 'Search Engine'), ('direct_visit', 'Direct Website Visit'), ('email_campaign', 'Email Campaign'), ('other', 'Other')], help_text='Source of the lead', max_length=25)),
                ('message', models.TextField(blank=True, help_text='Message or inquiry from the lead', null=True)),
                ('status', models.CharField(choices=[('new', 'New'), ('contacted', 'Contacted'), ('qualified', 'Qualified'), ('converted', 'Converted'), ('unqualified', 'Unqualified'), ('closed', 'Closed')], default='new', help_text='Current status of the lead', max_length=15)),
                ('priority', models.CharField(choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High'), ('urgent', 'Urgent')], default='medium', help_text='Priority level for follow-up', max_length=10)),
                ('ip_address', models.GenericIPAddressField(blank=True, help_text='IP address when lead was created', null=True)),
                ('user_agent', models.TextField(blank=True, help_text='Browser user agent string', null=True)),
                ('referrer', models.URLField(blank=True, help_text='Referring website URL', max_length=500, null=True)),
                ('utm_source', models.CharField(blank=True, help_text='UTM source parameter', max_length=100, null=True)),
                ('utm_medium', models.CharField(blank=True, help_text='UTM medium parameter', max_length=100, null=True)),
                ('utm_campaign', models.CharField(blank=True, help_text='UTM campaign parameter', max_length=100, null=True)),
                ('utm_term', models.CharField(blank=True, help_text='UTM term parameter', max_length=100, null=True)),
                ('utm_content', models.CharField(blank=True, help_text='UTM content parameter', max_length=100, null=True)),
                ('additional_data', models.JSONField(blank=True, default=dict, help_text='Additional metadata and tracking data', null=True)),
                ('tags', models.CharField(blank=True, help_text='Comma-separated tags for categorization', max_length=500, null=True)),
                ('notes', models.TextField(blank=True, help_text='Internal notes about this lead', null=True)),
                ('contacted_at', models.DateTimeField(blank=True, help_text='When the lead was first contacted', null=True)),
                ('converted_at', models.DateTimeField(blank=True, help_text='When the lead converted to customer', null=True)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now, help_text='When the lead was created')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='When the lead was last updated')),
                ('assigned_to', models.ForeignKey(blank=True, help_text='Staff member assigned to this lead', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='assigned_leads', to='custom_auth.User')),
                ('created_by', models.ForeignKey(blank=True, help_text='Staff member who created this lead', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_leads', to='custom_auth.User')),
            ],
            options={
                'verbose_name': 'Lead',
                'verbose_name_plural': 'Leads',
                'ordering': ['-created_at'],
                'indexes': [models.Index(fields=['email'], name='leads_lead_email_idx'), models.Index(fields=['source'], name='leads_lead_source_idx'), models.Index(fields=['status'], name='leads_lead_status_idx'), models.Index(fields=['created_at'], name='leads_lead_created_idx'), models.Index(fields=['assigned_to'], name='leads_lead_assigned_idx')],
            },
        ),
        migrations.CreateModel(
            name='LeadActivity',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('activity_type', models.CharField(choices=[('created', 'Lead Created'), ('contacted', 'Contacted'), ('email_sent', 'Email Sent'), ('phone_call', 'Phone Call'), ('meeting_scheduled', 'Meeting Scheduled'), ('status_changed', 'Status Changed'), ('note_added', 'Note Added'), ('converted', 'Converted'), ('closed', 'Closed'), ('other', 'Other Activity')], help_text='Type of activity performed', max_length=20)),
                ('description', models.TextField(help_text='Description of the activity')),
                ('metadata', models.JSONField(blank=True, default=dict, help_text='Additional activity metadata', null=True)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now, help_text='When the activity occurred')),
                ('created_by', models.ForeignKey(blank=True, help_text='Staff member who performed the activity', null=True, on_delete=django.db.models.deletion.SET_NULL, to='custom_auth.User')),
                ('lead', models.ForeignKey(help_text='Lead this activity is associated with', on_delete=django.db.models.deletion.CASCADE, related_name='activities', to='leads.lead')),
            ],
            options={
                'verbose_name': 'Lead Activity',
                'verbose_name_plural': 'Lead Activities',
                'ordering': ['-created_at'],
                'indexes': [models.Index(fields=['lead'], name='leads_leadact_lead_idx'), models.Index(fields=['activity_type'], name='leads_leadact_type_idx'), models.Index(fields=['created_at'], name='leads_leadact_created_idx')],
            },
        ),
        migrations.AddConstraint(
            model_name='lead',
            constraint=models.UniqueConstraint(fields=('email', 'source'), name='unique_lead_email_source'),
        ),
    ]