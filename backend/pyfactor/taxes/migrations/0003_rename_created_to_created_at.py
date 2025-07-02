# Generated manually to rename created/updated fields to created_at/updated_at

from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        ('taxes', '0002_initial_data'),
    ]

    operations = [
        # TaxSettings
        migrations.RenameField(
            model_name='taxsettings',
            old_name='created',
            new_name='created_at',
        ),
        migrations.RenameField(
            model_name='taxsettings',
            old_name='updated',
            new_name='updated_at',
        ),
        
        # TaxApiUsage
        migrations.RenameField(
            model_name='taxapiusage',
            old_name='created',
            new_name='created_at',
        ),
        migrations.RenameField(
            model_name='taxapiusage',
            old_name='updated',
            new_name='updated_at',
        ),
        
        # TaxFiling
        migrations.RenameField(
            model_name='taxfiling',
            old_name='created',
            new_name='created_at',
        ),
        migrations.RenameField(
            model_name='taxfiling',
            old_name='updated',
            new_name='updated_at',
        ),
        
        # TaxDataEntryControl
        migrations.RenameField(
            model_name='taxdataentrycontrol',
            old_name='created',
            new_name='created_at',
        ),
        
        # TaxDataEntryLog
        migrations.RenameField(
            model_name='taxdataentrylog',
            old_name='created',
            new_name='created_at',
        ),
        
        # TaxDataAbuseReport
        migrations.RenameField(
            model_name='taxdataabusereport',
            old_name='created',
            new_name='created_at',
        ),
        migrations.RenameField(
            model_name='taxdataabusereport',
            old_name='updated',
            new_name='updated_at',
        ),
        
        # TaxDataBlacklist
        migrations.RenameField(
            model_name='taxdatablacklist',
            old_name='created',
            new_name='created_at',
        ),
        migrations.RenameField(
            model_name='taxdatablacklist',
            old_name='updated',
            new_name='updated_at',
        ),
        
        # TaxRateCache
        migrations.RenameField(
            model_name='taxratecache',
            old_name='created',
            new_name='created_at',
        ),
        migrations.RenameField(
            model_name='taxratecache',
            old_name='updated',
            new_name='updated_at',
        ),
        
        # TaxFilingLocation
        migrations.RenameField(
            model_name='taxfilinglocation',
            old_name='created',
            new_name='created_at',
        ),
        migrations.RenameField(
            model_name='taxfilinglocation',
            old_name='updated',
            new_name='updated_at',
        ),
        
        # TaxReminder
        migrations.RenameField(
            model_name='taxreminder',
            old_name='created',
            new_name='created_at',
        ),
        migrations.RenameField(
            model_name='taxreminder',
            old_name='updated',
            new_name='updated_at',
        ),
        
        # TaxSignatureRequest
        migrations.RenameField(
            model_name='taxsignaturerequest',
            old_name='created',
            new_name='created_at',
        ),
        migrations.RenameField(
            model_name='taxsignaturerequest',
            old_name='updated',
            new_name='updated_at',
        ),
        
        # TaxSignatureSigner
        migrations.RenameField(
            model_name='taxsignaturesigner',
            old_name='created',
            new_name='created_at',
        ),
        migrations.RenameField(
            model_name='taxsignaturesigner',
            old_name='updated',
            new_name='updated_at',
        ),
        
        # FilingNotification
        migrations.RenameField(
            model_name='filingnotification',
            old_name='created',
            new_name='created_at',
        ),
        
        # Form941
        migrations.RenameField(
            model_name='form941',
            old_name='created',
            new_name='created_at',
        ),
        migrations.RenameField(
            model_name='form941',
            old_name='updated',
            new_name='updated_at',
        ),
        
        # Form941ScheduleB
        migrations.RenameField(
            model_name='form941scheduleb',
            old_name='created',
            new_name='created_at',
        ),
        migrations.RenameField(
            model_name='form941scheduleb',
            old_name='updated',
            new_name='updated_at',
        ),
        
        # PayrollTaxDeposit
        migrations.RenameField(
            model_name='payrolltaxdeposit',
            old_name='created',
            new_name='created_at',
        ),
        migrations.RenameField(
            model_name='payrolltaxdeposit',
            old_name='updated',
            new_name='updated_at',
        ),
        
        # PayrollTaxFilingSchedule
        migrations.RenameField(
            model_name='payrolltaxfilingschedule',
            old_name='created',
            new_name='created_at',
        ),
        migrations.RenameField(
            model_name='payrolltaxfilingschedule',
            old_name='updated',
            new_name='updated_at',
        ),
        
        # EmployerTaxAccount
        migrations.RenameField(
            model_name='employertaxaccount',
            old_name='created',
            new_name='created_at',
        ),
        migrations.RenameField(
            model_name='employertaxaccount',
            old_name='updated',
            new_name='updated_at',
        ),
        
        # Form940
        migrations.RenameField(
            model_name='form940',
            old_name='created',
            new_name='created_at',
        ),
        migrations.RenameField(
            model_name='form940',
            old_name='updated',
            new_name='updated_at',
        ),
        
        # Form940ScheduleA
        migrations.RenameField(
            model_name='form940schedulea',
            old_name='created',
            new_name='created_at',
        ),
        migrations.RenameField(
            model_name='form940schedulea',
            old_name='updated',
            new_name='updated_at',
        ),
        
        # StatePayrollConfiguration
        migrations.RenameField(
            model_name='statepayrollconfiguration',
            old_name='created',
            new_name='created_at',
        ),
        migrations.RenameField(
            model_name='statepayrollconfiguration',
            old_name='updated',
            new_name='updated_at',
        ),
        
        # StateTaxAccount
        migrations.RenameField(
            model_name='statetaxaccount',
            old_name='created',
            new_name='created_at',
        ),
        migrations.RenameField(
            model_name='statetaxaccount',
            old_name='updated',
            new_name='updated_at',
        ),
        
        # W2Form
        migrations.RenameField(
            model_name='w2form',
            old_name='created',
            new_name='created_at',
        ),
        migrations.RenameField(
            model_name='w2form',
            old_name='updated',
            new_name='updated_at',
        ),
        
        # W3Form
        migrations.RenameField(
            model_name='w3form',
            old_name='created',
            new_name='created_at',
        ),
        migrations.RenameField(
            model_name='w3form',
            old_name='updated',
            new_name='updated_at',
        ),
        
        # Form1099
        migrations.RenameField(
            model_name='form1099',
            old_name='created',
            new_name='created_at',
        ),
        migrations.RenameField(
            model_name='form1099',
            old_name='updated',
            new_name='updated_at',
        ),
        
        # Form1096
        migrations.RenameField(
            model_name='form1096',
            old_name='created',
            new_name='created_at',
        ),
        migrations.RenameField(
            model_name='form1096',
            old_name='updated',
            new_name='updated_at',
        ),
        
        # YearEndTaxGeneration
        migrations.RenameField(
            model_name='yearendtaxgeneration',
            old_name='created',
            new_name='created_at',
        ),
        migrations.RenameField(
            model_name='yearendtaxgeneration',
            old_name='updated',
            new_name='updated_at',
        ),
    ]