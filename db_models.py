✅ Loaded environment variables from: /Users/kuoldeng/projectx/backend/pyfactor/.env
Warning: Using placeholder Stripe credentials. Payments will not work.
Warning: Using placeholder AWS credentials. Some AWS services may not work.
# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
from django.db import models


class AccountEmailaddress(models.Model):
    email = models.CharField(unique=True, max_length=254)
    verified = models.BooleanField()
    primary = models.BooleanField()
    user = models.ForeignKey('CustomAuthUser', models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'account_emailaddress'
        unique_together = (('user', 'email'),)


class AccountEmailconfirmation(models.Model):
    created = models.DateTimeField()
    sent = models.DateTimeField(blank=True, null=True)
    key = models.CharField(unique=True, max_length=64)
    email_address = models.ForeignKey(AccountEmailaddress, models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'account_emailconfirmation'


class AnalysisChartconfiguration(models.Model):
    id = models.UUIDField(primary_key=True)
    name = models.CharField(max_length=100)
    x_axis = models.CharField(max_length=50)
    y_axis = models.CharField(max_length=50)
    chart_type = models.CharField(max_length=50)
    time_granularity = models.CharField(max_length=20)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'analysis_chartconfiguration'


class AnalysisFinancialdata(models.Model):
    id = models.UUIDField(primary_key=True)
    date = models.DateField()
    sales = models.DecimalField(max_digits=10, decimal_places=2)
    expenses = models.DecimalField(max_digits=10, decimal_places=2)
    profit = models.DecimalField(max_digits=10, decimal_places=2)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'analysis_financialdata'


class AuthGroup(models.Model):
    name = models.CharField(unique=True, max_length=150)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'auth_group'


class AuthGroupPermissions(models.Model):
    id = models.BigAutoField(primary_key=True)
    group = models.ForeignKey(AuthGroup, models.DO_NOTHING)
    permission = models.ForeignKey('AuthPermission', models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'auth_group_permissions'
        unique_together = (('group', 'permission'),)


class AuthPermission(models.Model):
    name = models.CharField(max_length=255)
    content_type = models.ForeignKey('DjangoContentType', models.DO_NOTHING)
    codename = models.CharField(max_length=100)

    class Meta:
        managed = False
        db_table = 'auth_permission'
        unique_together = (('content_type', 'codename'),)


class AuthtokenToken(models.Model):
    key = models.CharField(primary_key=True, max_length=40)
    created = models.DateTimeField()
    user = models.OneToOneField('CustomAuthUser', models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'authtoken_token'


class BankingBankaccount(models.Model):
    id = models.BigAutoField(primary_key=True)
    employee_id = models.UUIDField(blank=True, null=True)
    bank_name = models.CharField(max_length=255)
    account_number = models.CharField(max_length=255)
    balance = models.DecimalField(max_digits=10, decimal_places=2)
    account_type = models.CharField(max_length=50, blank=True, null=True)
    last_synced = models.DateTimeField()
    integration_id = models.IntegerField()
    integration_type = models.ForeignKey('DjangoContentType', models.DO_NOTHING)
    user = models.ForeignKey('CustomAuthUser', models.DO_NOTHING, blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'banking_bankaccount'


class BankingBanktransaction(models.Model):
    id = models.BigAutoField(primary_key=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_type = models.CharField(max_length=6)
    description = models.CharField(max_length=255)
    date = models.DateTimeField()
    is_reconciled = models.BooleanField()
    reference_number = models.CharField(max_length=100, blank=True, null=True)
    merchant_name = models.CharField(max_length=255, blank=True, null=True)
    category = models.CharField(max_length=100, blank=True, null=True)
    account = models.ForeignKey(BankingBankaccount, models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'banking_banktransaction'


class BankingPlaiditem(models.Model):
    id = models.BigAutoField(primary_key=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    access_token = models.CharField(max_length=100)
    item_id = models.CharField(max_length=100)
    user = models.ForeignKey('CustomAuthUser', models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'banking_plaiditem'


class BankingTinkitem(models.Model):
    id = models.BigAutoField(primary_key=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    access_token = models.CharField(max_length=100)
    item_id = models.CharField(max_length=100)
    user = models.ForeignKey('CustomAuthUser', models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'banking_tinkitem'


class CrmActivity(models.Model):
    id = models.UUIDField(primary_key=True)
    type = models.CharField(max_length=50)
    subject = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    due_date = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=50)
    priority = models.CharField(max_length=20)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    assigned_to = models.ForeignKey('CustomAuthUser', models.DO_NOTHING, blank=True, null=True)
    customer = models.ForeignKey('CrmCustomer', models.DO_NOTHING, blank=True, null=True)
    deal = models.ForeignKey('CrmDeal', models.DO_NOTHING, blank=True, null=True)
    lead = models.ForeignKey('CrmLead', models.DO_NOTHING, blank=True, null=True)
    opportunity = models.ForeignKey('CrmOpportunity', models.DO_NOTHING, blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'crm_activity'


class CrmCampaign(models.Model):
    id = models.UUIDField(primary_key=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    type = models.CharField(max_length=50)
    status = models.CharField(max_length=50)
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)
    budget = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    expected_revenue = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    actual_cost = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'crm_campaign'


class CrmCampaignmember(models.Model):
    id = models.UUIDField(primary_key=True)
    status = models.CharField(max_length=50)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    campaign = models.ForeignKey(CrmCampaign, models.DO_NOTHING)
    customer = models.ForeignKey('CrmCustomer', models.DO_NOTHING, blank=True, null=True)
    lead = models.ForeignKey('CrmLead', models.DO_NOTHING, blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'crm_campaignmember'


class CrmContact(models.Model):
    id = models.UUIDField(primary_key=True)
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    email = models.CharField(max_length=254, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    job_title = models.CharField(max_length=100, blank=True, null=True)
    department = models.CharField(max_length=100, blank=True, null=True)
    is_primary = models.BooleanField()
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    customer = models.ForeignKey('CrmCustomer', models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'crm_contact'


class CrmCustomer(models.Model):
    id = models.UUIDField(primary_key=True)
    business_name = models.CharField(max_length=255, blank=True, null=True)
    first_name = models.CharField(max_length=255, blank=True, null=True)
    last_name = models.CharField(max_length=255, blank=True, null=True)
    email = models.CharField(max_length=254, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    account_number = models.CharField(unique=True, max_length=6)
    website = models.CharField(max_length=200, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    currency = models.CharField(max_length=3, blank=True, null=True)
    billing_country = models.CharField(max_length=100, blank=True, null=True)
    billing_state = models.CharField(max_length=100, blank=True, null=True)
    ship_to_name = models.CharField(max_length=255, blank=True, null=True)
    shipping_country = models.CharField(max_length=100, blank=True, null=True)
    shipping_state = models.CharField(max_length=100, blank=True, null=True)
    shipping_phone = models.CharField(max_length=20, blank=True, null=True)
    delivery_instructions = models.TextField(blank=True, null=True)
    street = models.CharField(max_length=255, blank=True, null=True)
    postcode = models.CharField(max_length=20, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'crm_customer'


class CrmDeal(models.Model):
    id = models.UUIDField(primary_key=True)
    name = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=50)
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    customer = models.ForeignKey(CrmCustomer, models.DO_NOTHING)
    opportunity = models.OneToOneField('CrmOpportunity', models.DO_NOTHING, blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'crm_deal'


class CrmLead(models.Model):
    id = models.UUIDField(primary_key=True)
    company_name = models.CharField(max_length=255, blank=True, null=True)
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    email = models.CharField(max_length=254, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    source = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=50)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    assigned_to = models.ForeignKey('CustomAuthUser', models.DO_NOTHING, blank=True, null=True)
    converted_to = models.ForeignKey(CrmCustomer, models.DO_NOTHING, blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'crm_lead'


class CrmOpportunity(models.Model):
    id = models.UUIDField(primary_key=True)
    name = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    stage = models.CharField(max_length=50)
    probability = models.IntegerField()
    expected_close_date = models.DateField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    assigned_to = models.ForeignKey('CustomAuthUser', models.DO_NOTHING, blank=True, null=True)
    customer = models.ForeignKey(CrmCustomer, models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'crm_opportunity'


class CustomAuthTenant(models.Model):
    id = models.UUIDField(primary_key=True)
    name = models.TextField()
    owner_id = models.TextField(blank=True, null=True)
    schema_name = models.TextField(unique=True, blank=True, null=True, db_comment='Deprecated: Only used for schema-per-tenant approach. RLS is now the preferred isolation method.')
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)
    rls_enabled = models.BooleanField(blank=True, null=True)
    rls_setup_date = models.DateTimeField(blank=True, null=True)
    is_active = models.BooleanField(blank=True, null=True)
    deactivated_at = models.DateTimeField(blank=True, null=True)
    is_recoverable = models.BooleanField(blank=True, null=True)
    setup_status = models.TextField(blank=True, null=True)
    last_health_check = models.DateTimeField(blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'custom_auth_tenant'


class CustomAuthUser(models.Model):
    id = models.BigAutoField(primary_key=True)
    password = models.CharField(max_length=128)
    last_login = models.DateTimeField(blank=True, null=True)
    is_superuser = models.BooleanField()
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    is_staff = models.BooleanField()
    date_joined = models.DateTimeField()
    email = models.CharField(unique=True, max_length=254)
    is_active = models.BooleanField()
    cognito_sub = models.CharField(max_length=255, blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    tenant = models.ForeignKey(CustomAuthTenant, models.DO_NOTHING, blank=True, null=True)
    role = models.CharField(max_length=50)
    business_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'custom_auth_user'


class CustomAuthUserGroups(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(CustomAuthUser, models.DO_NOTHING)
    group = models.ForeignKey(AuthGroup, models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'custom_auth_user_groups'
        unique_together = (('user', 'group'),)


class CustomAuthUserUserPermissions(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(CustomAuthUser, models.DO_NOTHING)
    permission = models.ForeignKey(AuthPermission, models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'custom_auth_user_user_permissions'
        unique_together = (('user', 'permission'),)


class DjangoAdminLog(models.Model):
    action_time = models.DateTimeField()
    object_id = models.TextField(blank=True, null=True)
    object_repr = models.CharField(max_length=200)
    action_flag = models.SmallIntegerField()
    change_message = models.TextField()
    content_type = models.ForeignKey('DjangoContentType', models.DO_NOTHING, blank=True, null=True)
    user = models.ForeignKey(CustomAuthUser, models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'django_admin_log'


class DjangoCeleryBeatClockedschedule(models.Model):
    clocked_time = models.DateTimeField()
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'django_celery_beat_clockedschedule'


class DjangoCeleryBeatCrontabschedule(models.Model):
    minute = models.CharField(max_length=240)
    hour = models.CharField(max_length=96)
    day_of_week = models.CharField(max_length=64)
    day_of_month = models.CharField(max_length=124)
    month_of_year = models.CharField(max_length=64)
    timezone = models.CharField(max_length=63)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'django_celery_beat_crontabschedule'


class DjangoCeleryBeatIntervalschedule(models.Model):
    every = models.IntegerField()
    period = models.CharField(max_length=24)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'django_celery_beat_intervalschedule'


class DjangoCeleryBeatPeriodictask(models.Model):
    name = models.CharField(unique=True, max_length=200)
    task = models.CharField(max_length=200)
    args = models.TextField()
    kwargs = models.TextField()
    queue = models.CharField(max_length=200, blank=True, null=True)
    exchange = models.CharField(max_length=200, blank=True, null=True)
    routing_key = models.CharField(max_length=200, blank=True, null=True)
    expires = models.DateTimeField(blank=True, null=True)
    enabled = models.BooleanField()
    last_run_at = models.DateTimeField(blank=True, null=True)
    total_run_count = models.IntegerField()
    date_changed = models.DateTimeField()
    description = models.TextField()
    crontab = models.ForeignKey(DjangoCeleryBeatCrontabschedule, models.DO_NOTHING, blank=True, null=True)
    interval = models.ForeignKey(DjangoCeleryBeatIntervalschedule, models.DO_NOTHING, blank=True, null=True)
    solar = models.ForeignKey('DjangoCeleryBeatSolarschedule', models.DO_NOTHING, blank=True, null=True)
    one_off = models.BooleanField()
    start_time = models.DateTimeField(blank=True, null=True)
    priority = models.IntegerField(blank=True, null=True)
    headers = models.TextField()
    clocked = models.ForeignKey(DjangoCeleryBeatClockedschedule, models.DO_NOTHING, blank=True, null=True)
    expire_seconds = models.IntegerField(blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'django_celery_beat_periodictask'


class DjangoCeleryBeatPeriodictasks(models.Model):
    ident = models.SmallIntegerField(primary_key=True)
    last_update = models.DateTimeField()
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'django_celery_beat_periodictasks'


class DjangoCeleryBeatSolarschedule(models.Model):
    event = models.CharField(max_length=24)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'django_celery_beat_solarschedule'
        unique_together = (('event', 'latitude', 'longitude'),)


class DjangoContentType(models.Model):
    app_label = models.CharField(max_length=100)
    model = models.CharField(max_length=100)

    class Meta:
        managed = False
        db_table = 'django_content_type'
        unique_together = (('app_label', 'model'),)


class DjangoMigrations(models.Model):
    id = models.BigAutoField(primary_key=True)
    app = models.CharField(max_length=255)
    name = models.CharField(max_length=255)
    applied = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'django_migrations'


class DjangoSession(models.Model):
    session_key = models.CharField(primary_key=True, max_length=40)
    session_data = models.TextField()
    expire_date = models.DateTimeField()
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'django_session'


class DjangoSite(models.Model):
    domain = models.CharField(unique=True, max_length=100)
    name = models.CharField(max_length=50)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'django_site'


class FinanceAccount(models.Model):
    id = models.BigAutoField(primary_key=True)
    tenant_id = models.UUIDField(blank=True, null=True)
    account_number = models.CharField(max_length=20, blank=True, null=True)
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    balance = models.DecimalField(max_digits=15, decimal_places=2)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=25)
    last_reconciled = models.DateTimeField(blank=True, null=True)
    business = models.ForeignKey('UsersBusiness', models.DO_NOTHING, blank=True, null=True)
    parent_account = models.ForeignKey('self', models.DO_NOTHING, blank=True, null=True)
    account_type = models.ForeignKey('FinanceAccounttype', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'finance_account'
        unique_together = (('tenant_id', 'account_number'),)


class FinanceAccountcategory(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=100)
    code = models.CharField(unique=True, max_length=10)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'finance_accountcategory'


class FinanceAccountreconciliation(models.Model):
    id = models.BigAutoField(primary_key=True)
    reconciliation_date = models.DateField()
    statement_balance = models.DecimalField(max_digits=15, decimal_places=2)
    book_balance = models.DecimalField(max_digits=15, decimal_places=2)
    adjusted_balance = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    status = models.CharField(max_length=20)
    started_at = models.DateTimeField()
    completed_at = models.DateTimeField(blank=True, null=True)
    notes = models.TextField()
    period_start = models.DateField()
    period_end = models.DateField()
    account = models.ForeignKey(FinanceAccount, models.DO_NOTHING, blank=True, null=True)
    approved_by = models.ForeignKey(CustomAuthUser, models.DO_NOTHING, blank=True, null=True)
    bank_account = models.ForeignKey(BankingBankaccount, models.DO_NOTHING)
    business = models.ForeignKey('UsersBusiness', models.DO_NOTHING)
    completed_by = models.ForeignKey(CustomAuthUser, models.DO_NOTHING, related_name='financeaccountreconciliation_completed_by_set', blank=True, null=True)
    reviewed_by = models.ForeignKey(CustomAuthUser, models.DO_NOTHING, related_name='financeaccountreconciliation_reviewed_by_set', blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'finance_accountreconciliation'


class FinanceAccounttype(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(unique=True, max_length=100)
    account_type_id = models.IntegerField(unique=True, blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'finance_accounttype'
        unique_together = (('name', 'account_type_id'),)


class FinanceAudittrail(models.Model):
    id = models.BigAutoField(primary_key=True)
    date_time = models.DateTimeField()
    action_type = models.CharField(max_length=10)
    transaction_id = models.CharField(max_length=50)
    transaction_type = models.CharField(max_length=50)
    affected_accounts = models.CharField(max_length=255)
    old_value = models.TextField(blank=True, null=True)
    new_value = models.TextField(blank=True, null=True)
    approval_status = models.CharField(max_length=20)
    notes = models.TextField()
    ip_address = models.GenericIPAddressField()
    module = models.CharField(max_length=50)
    metadata = models.JSONField()
    business = models.ForeignKey('UsersBusiness', models.DO_NOTHING, blank=True, null=True)
    user = models.ForeignKey(CustomAuthUser, models.DO_NOTHING, blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'finance_audittrail'


class FinanceBudget(models.Model):
    id = models.BigAutoField(primary_key=True)
    tenant_id = models.UUIDField(blank=True, null=True)
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=20)
    period = models.CharField(max_length=10)
    fiscal_year = models.IntegerField()
    start_date = models.DateField()
    end_date = models.DateField()
    department = models.CharField(max_length=100)
    status = models.CharField(max_length=20)
    total_budget = models.DecimalField(max_digits=15, decimal_places=2)
    total_actual = models.DecimalField(max_digits=15, decimal_places=2)
    total_committed = models.DecimalField(max_digits=15, decimal_places=2)
    total_available = models.DecimalField(max_digits=15, decimal_places=2)
    submitted_at = models.DateTimeField(blank=True, null=True)
    reviewed_at = models.DateTimeField(blank=True, null=True)
    approved_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    approved_by = models.ForeignKey(CustomAuthUser, models.DO_NOTHING, blank=True, null=True)
    business = models.ForeignKey('UsersBusiness', models.DO_NOTHING)
    reviewed_by = models.ForeignKey(CustomAuthUser, models.DO_NOTHING, related_name='financebudget_reviewed_by_set', blank=True, null=True)
    submitted_by = models.ForeignKey(CustomAuthUser, models.DO_NOTHING, related_name='financebudget_submitted_by_set', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'finance_budget'


class FinanceBudgetitem(models.Model):
    id = models.BigAutoField(primary_key=True)
    item_type = models.CharField(max_length=20)
    description = models.CharField(max_length=255)
    budgeted_amount = models.DecimalField(max_digits=15, decimal_places=2)
    actual_amount = models.DecimalField(max_digits=15, decimal_places=2)
    committed_amount = models.DecimalField(max_digits=15, decimal_places=2)
    forecast_amount = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    monthly_distribution = models.JSONField()
    cost_center = models.CharField(max_length=100)
    project_code = models.CharField(max_length=100)
    notes = models.TextField()
    metadata = models.JSONField()
    budget = models.ForeignKey(FinanceBudget, models.DO_NOTHING)
    account = models.ForeignKey('FinanceChartofaccount', models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'finance_budgetitem'


class FinanceCashaccount(models.Model):
    id = models.BigAutoField(primary_key=True)
    date = models.DateField()
    credit = models.DecimalField(max_digits=10, decimal_places=2)
    debit = models.DecimalField(max_digits=10, decimal_places=2)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.CharField(max_length=255)
    note = models.TextField()
    account = models.ForeignKey(FinanceAccount, models.DO_NOTHING)
    transaction = models.OneToOneField('FinanceFinancetransaction', models.DO_NOTHING, blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'finance_cashaccount'


class FinanceChartofaccount(models.Model):
    id = models.BigAutoField(primary_key=True)
    account_number = models.CharField(unique=True, max_length=20)
    name = models.CharField(max_length=100)
    description = models.TextField()
    balance = models.DecimalField(max_digits=15, decimal_places=2)
    is_active = models.BooleanField()
    category = models.ForeignKey(FinanceAccountcategory, models.DO_NOTHING)
    parent = models.ForeignKey('self', models.DO_NOTHING, blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'finance_chartofaccount'


class FinanceCostallocation(models.Model):
    id = models.BigAutoField(primary_key=True)
    department = models.CharField(max_length=100)
    cost_center = models.CharField(max_length=100)
    project = models.CharField(max_length=100)
    allocation_method = models.CharField(max_length=20)
    allocation_base = models.CharField(max_length=100)
    allocation_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    allocated_amount = models.DecimalField(max_digits=15, decimal_places=2)
    units = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    status = models.CharField(max_length=20)
    start_date = models.DateField()
    end_date = models.DateField(blank=True, null=True)
    description = models.TextField()
    notes = models.TextField()
    metadata = models.JSONField()
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    created_by = models.ForeignKey(CustomAuthUser, models.DO_NOTHING, blank=True, null=True)
    cost_entry = models.ForeignKey('FinanceCostentry', models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'finance_costallocation'


class FinanceCostcategory(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(unique=True, max_length=100)
    code = models.CharField(unique=True, max_length=20)
    description = models.TextField()
    is_active = models.BooleanField()
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    metadata = models.JSONField()
    business = models.ForeignKey('UsersBusiness', models.DO_NOTHING)
    parent = models.ForeignKey('self', models.DO_NOTHING, blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'finance_costcategory'
        unique_together = (('business', 'code'),)


class FinanceCostentry(models.Model):
    cost_id = models.AutoField(primary_key=True)
    description = models.CharField(max_length=255)
    cost_type = models.CharField(max_length=10)
    cost_nature = models.CharField(max_length=10)
    status = models.CharField(max_length=20)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=15, decimal_places=2)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2)
    budgeted_amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=3)
    date = models.DateField()
    due_date = models.DateField(blank=True, null=True)
    posting_date = models.DateField(blank=True, null=True)
    department = models.CharField(max_length=100)
    project = models.CharField(max_length=100)
    cost_center = models.CharField(max_length=100)
    cost_driver = models.CharField(max_length=100)
    job_process_id = models.CharField(max_length=50)
    invoice_number = models.CharField(max_length=100)
    purchase_order = models.CharField(max_length=100)
    vendor = models.CharField(max_length=255)
    attachments = models.JSONField()
    notes = models.TextField()
    metadata = models.JSONField()
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    approved_by = models.ForeignKey(CustomAuthUser, models.DO_NOTHING, blank=True, null=True)
    business = models.ForeignKey('UsersBusiness', models.DO_NOTHING)
    category = models.ForeignKey(FinanceCostcategory, models.DO_NOTHING)
    created_by = models.ForeignKey(CustomAuthUser, models.DO_NOTHING, related_name='financecostentry_created_by_set', blank=True, null=True)
    posted_by = models.ForeignKey(CustomAuthUser, models.DO_NOTHING, related_name='financecostentry_posted_by_set', blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'finance_costentry'


class FinanceFinancetransaction(models.Model):
    id = models.BigAutoField(primary_key=True)
    tenant_id = models.UUIDField(blank=True, null=True)
    transaction_id = models.CharField(max_length=50)
    date = models.DateField()
    description = models.CharField(max_length=255)
    type = models.CharField(max_length=20)
    category = models.CharField(max_length=20)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20)
    notes = models.TextField()
    receipt = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    posted_at = models.DateTimeField(blank=True, null=True)
    is_reconciled = models.BooleanField()
    metadata = models.JSONField()
    account = models.ForeignKey(FinanceAccount, models.DO_NOTHING)
    bill = models.ForeignKey('PurchasesBill', models.DO_NOTHING, blank=True, null=True)
    business = models.ForeignKey('UsersBusiness', models.DO_NOTHING, blank=True, null=True)
    created_by = models.ForeignKey(CustomAuthUser, models.DO_NOTHING, blank=True, null=True)
    invoice = models.OneToOneField('SalesInvoice', models.DO_NOTHING, blank=True, null=True)
    posted_by = models.ForeignKey(CustomAuthUser, models.DO_NOTHING, related_name='financefinancetransaction_posted_by_set', blank=True, null=True)
    reconciliation = models.ForeignKey(FinanceAccountreconciliation, models.DO_NOTHING, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'finance_financetransaction'
        unique_together = (('tenant_id', 'transaction_id'),)


class FinanceFinancialstatement(models.Model):
    id = models.BigAutoField(primary_key=True)
    statement_type = models.CharField(max_length=2)
    status = models.CharField(max_length=20)
    period_type = models.CharField(max_length=20)
    start_date = models.DateField()
    end_date = models.DateField()
    fiscal_year = models.IntegerField()
    data = models.JSONField()
    comparative_data = models.JSONField(blank=True, null=True)
    notes = models.JSONField()
    currency = models.CharField(max_length=3)
    display_options = models.JSONField()
    department = models.CharField(max_length=100)
    cost_center = models.CharField(max_length=100)
    segment = models.CharField(max_length=100)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    published_at = models.DateTimeField(blank=True, null=True)
    archived_at = models.DateTimeField(blank=True, null=True)
    version = models.IntegerField()
    is_revised = models.BooleanField()
    revision_reason = models.TextField()
    approved_by = models.ForeignKey(CustomAuthUser, models.DO_NOTHING, blank=True, null=True)
    business = models.ForeignKey('UsersBusiness', models.DO_NOTHING)
    generated_by = models.ForeignKey(CustomAuthUser, models.DO_NOTHING, related_name='financefinancialstatement_generated_by_set', blank=True, null=True)
    previous_version = models.ForeignKey('self', models.DO_NOTHING, blank=True, null=True)
    reviewed_by = models.ForeignKey(CustomAuthUser, models.DO_NOTHING, related_name='financefinancialstatement_reviewed_by_set', blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'finance_financialstatement'
        unique_together = (('business', 'statement_type', 'start_date', 'end_date', 'version'),)


class FinanceFixedasset(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=255)
    description = models.TextField()
    asset_type = models.CharField(max_length=20)
    status = models.CharField(max_length=20)
    department = models.CharField(max_length=100)
    acquisition_date = models.DateField()
    acquisition_cost = models.DecimalField(max_digits=15, decimal_places=2)
    vendor = models.CharField(max_length=255)
    invoice_number = models.CharField(max_length=100)
    purchase_order = models.CharField(max_length=100)
    depreciation_method = models.CharField(max_length=3)
    useful_life = models.IntegerField()
    salvage_value = models.DecimalField(max_digits=15, decimal_places=2)
    depreciation_start_date = models.DateField()
    last_depreciation_date = models.DateField(blank=True, null=True)
    accumulated_depreciation = models.DecimalField(max_digits=15, decimal_places=2)
    book_value = models.DecimalField(max_digits=15, decimal_places=2)
    location = models.CharField(max_length=255)
    asset_tag = models.CharField(unique=True, max_length=100)
    serial_number = models.CharField(max_length=100)
    barcode = models.CharField(max_length=100)
    warranty_expiry = models.DateField(blank=True, null=True)
    maintenance_schedule = models.JSONField()
    last_maintenance_date = models.DateField(blank=True, null=True)
    next_maintenance_date = models.DateField(blank=True, null=True)
    disposal_date = models.DateField(blank=True, null=True)
    disposal_price = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    disposal_method = models.CharField(max_length=100)
    disposal_reason = models.TextField()
    insured_value = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    insurance_policy = models.CharField(max_length=100)
    last_valuation_date = models.DateField(blank=True, null=True)
    current_market_value = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    metadata = models.JSONField()
    business = models.ForeignKey('UsersBusiness', models.DO_NOTHING)
    created_by = models.ForeignKey(CustomAuthUser, models.DO_NOTHING, blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'finance_fixedasset'


class FinanceGeneralledgerentry(models.Model):
    id = models.BigAutoField(primary_key=True)
    date = models.DateField()
    description = models.CharField(max_length=255)
    debit_amount = models.DecimalField(max_digits=15, decimal_places=2)
    credit_amount = models.DecimalField(max_digits=15, decimal_places=2)
    balance = models.DecimalField(max_digits=15, decimal_places=2)
    account = models.ForeignKey(FinanceChartofaccount, models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'finance_generalledgerentry'


class FinanceIncome(models.Model):
    id = models.BigAutoField(primary_key=True)
    transaction = models.OneToOneField(FinanceFinancetransaction, models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'finance_income'


class FinanceIntercompanyaccount(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=100)
    account_type = models.CharField(max_length=20)
    status = models.CharField(max_length=25)
    entity = models.CharField(max_length=100)
    department = models.CharField(max_length=100)
    cost_center = models.CharField(max_length=100)
    currency = models.CharField(max_length=3)
    balance = models.DecimalField(max_digits=15, decimal_places=2)
    credit_limit = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    payment_terms = models.CharField(max_length=100)
    last_reconciled = models.DateTimeField(blank=True, null=True)
    reconciliation_frequency = models.CharField(max_length=50)
    description = models.TextField()
    notes = models.TextField()
    metadata = models.JSONField()
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    business = models.ForeignKey('UsersBusiness', models.DO_NOTHING)
    created_by = models.ForeignKey(CustomAuthUser, models.DO_NOTHING, blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'finance_intercompanyaccount'
        unique_together = (('business', 'entity', 'account_type'),)


class FinanceIntercompanytransaction(models.Model):
    transaction_id = models.AutoField(primary_key=True)
    transaction_type = models.CharField(max_length=20)
    status = models.CharField(max_length=20)
    entity_from = models.CharField(max_length=100)
    entity_to = models.CharField(max_length=100)
    department_from = models.CharField(max_length=100)
    department_to = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=3)
    converted_amount = models.DecimalField(max_digits=15, decimal_places=2)
    exchange_rate = models.DecimalField(max_digits=10, decimal_places=6)
    tax_amount = models.DecimalField(max_digits=15, decimal_places=2)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2)
    date = models.DateField()
    due_date = models.DateField(blank=True, null=True)
    posting_date = models.DateField(blank=True, null=True)
    document_reference = models.CharField(max_length=50)
    invoice_number = models.CharField(max_length=100)
    purchase_order = models.CharField(max_length=100)
    contract_reference = models.CharField(max_length=100)
    reconciliation_status = models.CharField(max_length=20)
    matched_amount = models.DecimalField(max_digits=15, decimal_places=2)
    transfer_pricing_method = models.CharField(max_length=100)
    transfer_pricing_documentation = models.JSONField()
    description = models.TextField()
    notes = models.TextField()
    attachments = models.JSONField()
    metadata = models.JSONField()
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    approved_by = models.ForeignKey(CustomAuthUser, models.DO_NOTHING, blank=True, null=True)
    business = models.ForeignKey('UsersBusiness', models.DO_NOTHING)
    created_by = models.ForeignKey(CustomAuthUser, models.DO_NOTHING, related_name='financeintercompanytransaction_created_by_set', blank=True, null=True)
    posted_by = models.ForeignKey(CustomAuthUser, models.DO_NOTHING, related_name='financeintercompanytransaction_posted_by_set', blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'finance_intercompanytransaction'


class FinanceJournalentry(models.Model):
    id = models.BigAutoField(primary_key=True)
    date = models.DateField()
    description = models.CharField(max_length=255)
    status = models.CharField(max_length=10)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    posted_at = models.DateTimeField(blank=True, null=True)
    reference = models.CharField(max_length=50)
    business = models.ForeignKey('UsersBusiness', models.DO_NOTHING)
    created_by = models.ForeignKey(CustomAuthUser, models.DO_NOTHING, blank=True, null=True)
    posted_by = models.ForeignKey(CustomAuthUser, models.DO_NOTHING, related_name='financejournalentry_posted_by_set', blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'finance_journalentry'


class FinanceJournalentryline(models.Model):
    id = models.BigAutoField(primary_key=True)
    description = models.CharField(max_length=255)
    debit_amount = models.DecimalField(max_digits=15, decimal_places=2)
    credit_amount = models.DecimalField(max_digits=15, decimal_places=2)
    account = models.ForeignKey(FinanceChartofaccount, models.DO_NOTHING)
    journal_entry = models.ForeignKey(FinanceJournalentry, models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'finance_journalentryline'


class FinanceMonthendclosing(models.Model):
    id = models.BigAutoField(primary_key=True)
    month = models.IntegerField()
    year = models.IntegerField()
    status = models.CharField(max_length=20)
    started_at = models.DateTimeField()
    completed_at = models.DateTimeField(blank=True, null=True)
    notes = models.TextField()
    closing_date = models.DateField()
    total_revenue = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    total_expenses = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    net_income = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    metadata = models.JSONField()
    approved_by = models.ForeignKey(CustomAuthUser, models.DO_NOTHING, blank=True, null=True)
    business = models.ForeignKey('UsersBusiness', models.DO_NOTHING)
    completed_by = models.ForeignKey(CustomAuthUser, models.DO_NOTHING, related_name='financemonthendclosing_completed_by_set', blank=True, null=True)
    reviewed_by = models.ForeignKey(CustomAuthUser, models.DO_NOTHING, related_name='financemonthendclosing_reviewed_by_set', blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'finance_monthendclosing'
        unique_together = (('month', 'year', 'business'),)


class FinanceMonthendtask(models.Model):
    id = models.BigAutoField(primary_key=True)
    task_type = models.CharField(max_length=20)
    name = models.CharField(max_length=255)
    description = models.TextField()
    sequence = models.IntegerField()
    is_completed = models.BooleanField()
    completed_at = models.DateTimeField(blank=True, null=True)
    notes = models.TextField()
    metadata = models.JSONField()
    closing = models.ForeignKey(FinanceMonthendclosing, models.DO_NOTHING)
    completed_by = models.ForeignKey(CustomAuthUser, models.DO_NOTHING, blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'finance_monthendtask'


class FinanceReconciliationitem(models.Model):
    id = models.BigAutoField(primary_key=True)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    match_status = models.CharField(max_length=20)
    match_confidence = models.DecimalField(max_digits=5, decimal_places=2)
    match_criteria = models.JSONField()
    adjustment_amount = models.DecimalField(max_digits=15, decimal_places=2)
    adjustment_reason = models.CharField(max_length=255)
    notes = models.TextField()
    matched_at = models.DateTimeField(blank=True, null=True)
    reviewed_at = models.DateTimeField(blank=True, null=True)
    bank_transaction = models.ForeignKey(BankingBanktransaction, models.DO_NOTHING, blank=True, null=True)
    finance_transaction = models.ForeignKey(FinanceFinancetransaction, models.DO_NOTHING, blank=True, null=True)
    matched_by = models.ForeignKey(CustomAuthUser, models.DO_NOTHING, blank=True, null=True)
    reconciliation = models.ForeignKey(FinanceAccountreconciliation, models.DO_NOTHING)
    reviewed_by = models.ForeignKey(CustomAuthUser, models.DO_NOTHING, related_name='financereconciliationitem_reviewed_by_set', blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'finance_reconciliationitem'


class FinanceRevenueaccount(models.Model):
    id = models.BigAutoField(primary_key=True)
    date = models.DateField()
    credit = models.DecimalField(max_digits=10, decimal_places=2)
    debit = models.DecimalField(max_digits=10, decimal_places=2)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    type = models.CharField(max_length=20)
    description = models.CharField(max_length=255)
    note = models.TextField()
    account_type = models.ForeignKey(FinanceAccounttype, models.DO_NOTHING)
    transaction = models.OneToOneField(FinanceFinancetransaction, models.DO_NOTHING, blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'finance_revenueaccount'


class FinanceSalestaxaccount(models.Model):
    id = models.BigAutoField(primary_key=True)
    date = models.DateField()
    debit = models.DecimalField(max_digits=10, decimal_places=2)
    credit = models.DecimalField(max_digits=10, decimal_places=2)
    percentage = models.DecimalField(max_digits=5, decimal_places=2)
    description = models.CharField(max_length=255)
    note = models.TextField()
    transaction = models.OneToOneField(FinanceFinancetransaction, models.DO_NOTHING, blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'finance_salestaxaccount'


class HrAccesspermission(models.Model):
    id = models.BigAutoField(primary_key=True)
    module = models.CharField(max_length=100)
    can_view = models.BooleanField()
    can_edit = models.BooleanField()
    can_delete = models.BooleanField()
    role = models.ForeignKey('HrRole', models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'hr_accesspermission'


class HrCompanyholiday(models.Model):
    id = models.UUIDField(primary_key=True)
    business_id = models.UUIDField(blank=True, null=True)
    name = models.CharField(max_length=100)
    date = models.DateField()
    paid = models.BooleanField()
    recurring_yearly = models.BooleanField()
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'hr_companyholiday'
        unique_together = (('business_id', 'date', 'name'),)


class HrEmployee(models.Model):
    password = models.CharField(max_length=128)
    last_login = models.DateTimeField(blank=True, null=True)
    is_superuser = models.BooleanField()
    username = models.CharField(unique=True, max_length=150)
    is_staff = models.BooleanField()
    is_active = models.BooleanField()
    id = models.UUIDField(primary_key=True)
    employee_number = models.CharField(unique=True, max_length=20)
    first_name = models.CharField(max_length=100, blank=True, null=True)
    middle_name = models.CharField(max_length=100, blank=True, null=True)
    last_name = models.CharField(max_length=100, blank=True, null=True)
    dob = models.DateField()
    gender = models.CharField(max_length=1, blank=True, null=True)
    marital_status = models.CharField(max_length=1, blank=True, null=True)
    nationality = models.CharField(max_length=100, blank=True, null=True)
    street = models.CharField(max_length=200, blank=True, null=True)
    postcode = models.CharField(max_length=20, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=100)
    date_joined = models.DateField()
    last_work_date = models.DateField(blank=True, null=True)
    active = models.BooleanField()
    role = models.CharField(max_length=20)
    site_access_privileges = models.JSONField()
    email = models.CharField(unique=True, max_length=254)
    phone_number = models.CharField(max_length=128, blank=True, null=True)
    department = models.CharField(max_length=100, blank=True, null=True)
    salary = models.DecimalField(max_digits=10, decimal_places=2)
    emergency_contact_name = models.CharField(max_length=100, blank=True, null=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True, null=True)
    skills = models.TextField(blank=True, null=True)
    documents = models.CharField(max_length=100, blank=True, null=True)
    wage_per_hour = models.DecimalField(max_digits=6, decimal_places=2)
    hours_per_day = models.DecimalField(max_digits=4, decimal_places=2)
    overtime_rate = models.DecimalField(max_digits=6, decimal_places=2)
    days_per_week = models.SmallIntegerField()
    employment_type = models.CharField(max_length=2)
    onboarded = models.BooleanField()
    security_number_type = models.CharField(max_length=10)
    stripe_person_id = models.CharField(max_length=255, blank=True, null=True)
    stripe_account_id = models.CharField(max_length=255, blank=True, null=True)
    ssn_stored_in_stripe = models.BooleanField()
    bank_account_stored_in_stripe = models.BooleanField()
    tax_id_stored_in_stripe = models.BooleanField()
    payment_provider = models.CharField(max_length=50, blank=True, null=True)
    mpesa_phone_number = models.CharField(max_length=20, blank=True, null=True)
    paypal_email = models.CharField(max_length=254, blank=True, null=True)
    bank_name = models.CharField(max_length=100, blank=True, null=True)
    mobile_wallet_provider = models.CharField(max_length=50, blank=True, null=True)
    mobile_wallet_id = models.CharField(max_length=100, blank=True, null=True)
    ssn_last_four = models.CharField(max_length=4, blank=True, null=True)
    bank_account_last_four = models.CharField(max_length=4, blank=True, null=True)
    tax_filing_status = models.CharField(max_length=2, blank=True, null=True)
    job_title = models.CharField(max_length=100, blank=True, null=True)
    probation = models.BooleanField()
    probation_end_date = models.DateField(blank=True, null=True)
    health_insurance_enrollment = models.BooleanField()
    pension_enrollment = models.BooleanField()
    termination_date = models.DateField(blank=True, null=True)
    reason_for_leaving = models.TextField(blank=True, null=True)
    business_id = models.UUIDField(blank=True, null=True)
    password_setup_token = models.CharField(max_length=100, blank=True, null=True)
    supervisor = models.ForeignKey('self', models.DO_NOTHING, blank=True, null=True)
    compensation_type = models.CharField(max_length=10)
    tenant_id = models.UUIDField(blank=True, null=True)
    id_verified = models.BooleanField(db_column='ID_verified')  # Field name made lowercase.
    aremanager = models.BooleanField(db_column='areManager')  # Field name made lowercase.
    user = models.OneToOneField(CustomAuthUser, models.DO_NOTHING, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'hr_employee'


class HrEmployeeGroups(models.Model):
    id = models.BigAutoField(primary_key=True)
    employee = models.ForeignKey(HrEmployee, models.DO_NOTHING)
    group = models.ForeignKey(AuthGroup, models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'hr_employee_groups'
        unique_together = (('employee', 'group'),)


class HrEmployeeSupervising(models.Model):
    id = models.BigAutoField(primary_key=True)
    from_employee = models.ForeignKey(HrEmployee, models.DO_NOTHING)
    to_employee = models.ForeignKey(HrEmployee, models.DO_NOTHING, related_name='hremployeesupervising_to_employee_set')

    class Meta:
        managed = False
        db_table = 'hr_employee_supervising'
        unique_together = (('from_employee', 'to_employee'),)


class HrEmployeeUserPermissions(models.Model):
    id = models.BigAutoField(primary_key=True)
    employee = models.ForeignKey(HrEmployee, models.DO_NOTHING)
    permission = models.ForeignKey(AuthPermission, models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'hr_employee_user_permissions'
        unique_together = (('employee', 'permission'),)


class HrEmployeerole(models.Model):
    id = models.BigAutoField(primary_key=True)
    employee = models.ForeignKey(HrEmployee, models.DO_NOTHING)
    role = models.ForeignKey('HrRole', models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'hr_employeerole'


class HrPreboardingform(models.Model):
    id = models.BigAutoField(primary_key=True)
    email = models.CharField(unique=True, max_length=254)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    position = models.CharField(max_length=100)
    salary = models.DecimalField(max_digits=10, decimal_places=2)
    start_date = models.DateField()
    verified = models.BooleanField()
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'hr_preboardingform'


class HrRole(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=100)
    description = models.TextField()
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'hr_role'


class HrTimeoffbalance(models.Model):
    id = models.UUIDField(primary_key=True)
    year = models.IntegerField()
    pto_allowance = models.DecimalField(max_digits=5, decimal_places=2)
    sick_leave_allowance = models.DecimalField(max_digits=5, decimal_places=2)
    pto_used = models.DecimalField(max_digits=5, decimal_places=2)
    sick_leave_used = models.DecimalField(max_digits=5, decimal_places=2)
    pto_carryover = models.DecimalField(max_digits=5, decimal_places=2)
    sick_leave_carryover = models.DecimalField(max_digits=5, decimal_places=2)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    employee = models.OneToOneField(HrEmployee, models.DO_NOTHING)
    business_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'hr_timeoffbalance'
        unique_together = (('employee', 'year'),)


class HrTimeoffrequest(models.Model):
    id = models.UUIDField(primary_key=True)
    request_type = models.CharField(max_length=4)
    status = models.CharField(max_length=10)
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField()
    submitted_at = models.DateTimeField()
    approved_at = models.DateTimeField(blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    approved_by = models.ForeignKey(HrEmployee, models.DO_NOTHING, blank=True, null=True)
    employee = models.ForeignKey(HrEmployee, models.DO_NOTHING, related_name='hrtimeoffrequest_employee_set')
    business_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'hr_timeoffrequest'


class HrTimesheet(models.Model):
    id = models.UUIDField(primary_key=True)
    status = models.CharField(max_length=10)
    period_start = models.DateField()
    period_end = models.DateField()
    submitted_at = models.DateTimeField(blank=True, null=True)
    approved_at = models.DateTimeField(blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True)
    total_regular_hours = models.DecimalField(max_digits=6, decimal_places=2)
    total_overtime_hours = models.DecimalField(max_digits=6, decimal_places=2)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    approved_by = models.ForeignKey(HrEmployee, models.DO_NOTHING, blank=True, null=True)
    employee = models.ForeignKey(HrEmployee, models.DO_NOTHING, related_name='hrtimesheet_employee_set')
    business_id = models.UUIDField(blank=True, null=True)
    timesheet_number = models.CharField(unique=True, max_length=20, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'hr_timesheet'
        unique_together = (('employee', 'period_start', 'period_end'),)


class HrTimesheetentry(models.Model):
    id = models.UUIDField(primary_key=True)
    date = models.DateField()
    regular_hours = models.DecimalField(max_digits=5, decimal_places=2)
    overtime_hours = models.DecimalField(max_digits=5, decimal_places=2)
    project = models.CharField(max_length=100, blank=True, null=True)
    task = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    timesheet = models.ForeignKey(HrTimesheet, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'hr_timesheetentry'
        unique_together = (('timesheet', 'date'),)


class HrTimesheetsetting(models.Model):
    id = models.UUIDField(primary_key=True)
    business_id = models.UUIDField(blank=True, null=True)
    approval_frequency = models.CharField(max_length=10)
    input_frequency = models.CharField(max_length=10)
    class_tiers = models.JSONField()
    default_pto_days_per_year = models.IntegerField()
    default_sick_days_per_year = models.IntegerField()
    allow_overtime = models.BooleanField()
    overtime_rate = models.DecimalField(max_digits=4, decimal_places=2)
    require_manager_approval = models.BooleanField()
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'hr_timesheetsetting'


class IntegrationsIntegration(models.Model):
    id = models.BigAutoField(primary_key=True)
    platform = models.CharField(max_length=50)
    is_active = models.BooleanField()
    api_key = models.CharField(max_length=255, blank=True, null=True)
    api_secret = models.CharField(max_length=255, blank=True, null=True)
    store_url = models.CharField(max_length=200, blank=True, null=True)
    user_profile = models.ForeignKey('UsersUserprofile', models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'integrations_integration'


class IntegrationsShopifyintegration(models.Model):
    id = models.BigAutoField(primary_key=True)
    shop_url = models.CharField(unique=True, max_length=200)
    access_token = models.CharField(max_length=255)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    access_token_last_updated = models.DateTimeField()
    user = models.ForeignKey(CustomAuthUser, models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'integrations_shopifyintegration'
        unique_together = (('user', 'shop_url'),)


class IntegrationsWoocommerceintegration(models.Model):
    id = models.BigAutoField(primary_key=True)
    site_url = models.CharField(max_length=200)
    consumer_key = models.CharField(max_length=255)
    consumer_secret = models.CharField(max_length=255)
    is_active = models.BooleanField()
    user_profile = models.ForeignKey('UsersUserprofile', models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'integrations_woocommerceintegration'


class IntegrationsWoocommerceorder(models.Model):
    id = models.BigAutoField(primary_key=True)
    order_id = models.IntegerField(unique=True)
    status = models.CharField(max_length=50)
    currency = models.CharField(max_length=10)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    date_created = models.DateTimeField()
    billing = models.JSONField()
    shipping = models.JSONField()
    line_items = models.JSONField()
    integration = models.ForeignKey(IntegrationsWoocommerceintegration, models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'integrations_woocommerceorder'


class InventoryCategory(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(unique=True, max_length=100)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'inventory_category'


class InventoryCustomchargeplan(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=100)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=10)
    custom_unit = models.CharField(max_length=50, blank=True, null=True)
    period = models.CharField(max_length=10)
    custom_period = models.CharField(max_length=50, blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'inventory_customchargeplan'


class InventoryDepartment(models.Model):
    id = models.BigAutoField(primary_key=True)
    dept_code = models.CharField(max_length=20)
    dept_name = models.CharField(max_length=20)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'inventory_department'


class InventoryInventoryitem(models.Model):
    id = models.UUIDField(primary_key=True)
    name = models.CharField(max_length=255)
    sku = models.CharField(unique=True, max_length=50)
    description = models.TextField(blank=True, null=True)
    quantity = models.IntegerField()
    reorder_level = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    category = models.ForeignKey(InventoryCategory, models.DO_NOTHING, blank=True, null=True)
    location = models.ForeignKey('InventoryLocation', models.DO_NOTHING, blank=True, null=True)
    supplier = models.ForeignKey('InventorySupplier', models.DO_NOTHING, blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'inventory_inventoryitem'


class InventoryInventorytransaction(models.Model):
    id = models.UUIDField(primary_key=True)
    transaction_type = models.CharField(max_length=6)
    quantity = models.IntegerField()
    date = models.DateTimeField()
    notes = models.TextField(blank=True, null=True)
    item = models.ForeignKey(InventoryInventoryitem, models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'inventory_inventorytransaction'


class InventoryLocation(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'inventory_location'


class InventoryProduct(models.Model):
    tenant_id = models.UUIDField(blank=True, null=True)
    id = models.UUIDField(primary_key=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    sku = models.CharField(max_length=50, blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    cost = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    quantity = models.IntegerField()
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    is_active = models.BooleanField()
    supplier = models.ForeignKey('InventorySupplier', models.DO_NOTHING, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'inventory_product'


class InventoryProducttypefields(models.Model):
    id = models.BigAutoField(primary_key=True)
    category = models.CharField(max_length=100, blank=True, null=True)
    subcategory = models.CharField(max_length=100, blank=True, null=True)
    material = models.CharField(max_length=100, blank=True, null=True)
    brand = models.CharField(max_length=100, blank=True, null=True)
    condition = models.CharField(max_length=50, blank=True, null=True)
    ingredients = models.TextField(blank=True, null=True)
    allergens = models.TextField(blank=True, null=True)
    nutritional_info = models.TextField(blank=True, null=True)
    size = models.CharField(max_length=20, blank=True, null=True)
    color = models.CharField(max_length=50, blank=True, null=True)
    gender = models.CharField(max_length=20, blank=True, null=True)
    vehicle_type = models.CharField(max_length=100, blank=True, null=True)
    load_capacity = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    extra_fields = models.JSONField()
    product = models.OneToOneField(InventoryProduct, models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'inventory_producttypefields'


class InventoryService(models.Model):
    id = models.UUIDField(primary_key=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    is_for_sale = models.BooleanField()
    is_for_rent = models.BooleanField()
    salestax = models.DecimalField(max_digits=5, decimal_places=2)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    height = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    width = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    height_unit = models.CharField(max_length=10)
    width_unit = models.CharField(max_length=10)
    weight = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    weight_unit = models.CharField(max_length=10)
    charge_period = models.CharField(max_length=10)
    charge_amount = models.DecimalField(max_digits=10, decimal_places=2)
    service_code = models.CharField(unique=True, max_length=50)
    duration = models.DurationField(blank=True, null=True)
    is_recurring = models.BooleanField()
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'inventory_service'


class InventoryServiceCustomChargePlans(models.Model):
    id = models.BigAutoField(primary_key=True)
    service = models.ForeignKey(InventoryService, models.DO_NOTHING)
    customchargeplan = models.ForeignKey(InventoryCustomchargeplan, models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'inventory_service_custom_charge_plans'
        unique_together = (('service', 'customchargeplan'),)


class InventoryServicetypefields(models.Model):
    id = models.BigAutoField(primary_key=True)
    category = models.CharField(max_length=100, blank=True, null=True)
    subcategory = models.CharField(max_length=100, blank=True, null=True)
    skill_level = models.CharField(max_length=50, blank=True, null=True)
    certification = models.CharField(max_length=100, blank=True, null=True)
    experience_years = models.IntegerField(blank=True, null=True)
    min_booking_notice = models.DurationField(blank=True, null=True)
    buffer_time = models.DurationField(blank=True, null=True)
    max_capacity = models.IntegerField(blank=True, null=True)
    amenities = models.TextField(blank=True, null=True)
    service_area = models.CharField(max_length=100, blank=True, null=True)
    vehicle_requirements = models.TextField(blank=True, null=True)
    extra_fields = models.JSONField()
    service = models.OneToOneField(InventoryService, models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'inventory_servicetypefields'


class InventorySupplier(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=255)
    contact_person = models.CharField(max_length=255, blank=True, null=True)
    email = models.CharField(max_length=254, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField()
    is_active = models.BooleanField()
    updated_at = models.DateTimeField()
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'inventory_supplier'


class OnboardingOnboardingprogress(models.Model):
    id = models.UUIDField(primary_key=True)
    tenant_id = models.UUIDField()
    session_id = models.UUIDField(blank=True, null=True)
    last_session_activity = models.DateTimeField(blank=True, null=True)
    onboarding_status = models.CharField(max_length=50)
    account_status = models.CharField(max_length=20)
    user_role = models.CharField(max_length=20)
    subscription_plan = models.CharField(max_length=20)
    current_step = models.CharField(max_length=50)
    next_step = models.CharField(max_length=50)
    completed_steps = models.JSONField()
    last_active_step = models.CharField(max_length=256, blank=True, null=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    last_login = models.DateTimeField(blank=True, null=True)
    access_token_expiration = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    database_setup_task_id = models.CharField(max_length=255, blank=True, null=True)
    selected_plan = models.CharField(max_length=20)
    subscription_status = models.CharField(max_length=20, blank=True, null=True)
    billing_cycle = models.CharField(max_length=20, blank=True, null=True)
    payment_completed = models.BooleanField()
    payment_method = models.CharField(max_length=50, blank=True, null=True)
    payment_id = models.CharField(max_length=100, blank=True, null=True)
    payment_timestamp = models.DateTimeField(blank=True, null=True)
    rls_setup_completed = models.BooleanField()
    rls_setup_timestamp = models.DateTimeField(blank=True, null=True)
    setup_completed = models.BooleanField()
    setup_timestamp = models.DateTimeField(blank=True, null=True)
    setup_error = models.TextField(blank=True, null=True)
    schema_name = models.CharField(max_length=63, blank=True, null=True)
    metadata = models.JSONField(blank=True, null=True)
    attribute_version = models.CharField(max_length=10)
    preferences = models.JSONField(blank=True, null=True)
    business = models.ForeignKey('UsersBusiness', models.DO_NOTHING, blank=True, null=True)
    user = models.OneToOneField(CustomAuthUser, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'onboarding_onboardingprogress'


class OnboardingUserprofile(models.Model):
    user_id = models.UUIDField(primary_key=True)
    setup_status = models.CharField(max_length=20)
    setup_error = models.TextField(blank=True, null=True)
    setup_started_at = models.DateTimeField(blank=True, null=True)
    setup_completed_at = models.DateTimeField(blank=True, null=True)
    schema_name = models.CharField(max_length=63, blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'onboarding_userprofile'


class PaymentsCountrypaymentmethod(models.Model):
    id = models.BigAutoField(primary_key=True)
    country = models.CharField(unique=True, max_length=2)
    currency_code = models.CharField(max_length=3)
    currency_symbol = models.CharField(max_length=5)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    backup_provider = models.ForeignKey('PaymentsPaymentprovider', models.DO_NOTHING, blank=True, null=True)
    bank_connector = models.ForeignKey('PaymentsPaymentprovider', models.DO_NOTHING, related_name='paymentscountrypaymentmethod_bank_connector_set', blank=True, null=True)
    mobile_money_provider = models.ForeignKey('PaymentsPaymentprovider', models.DO_NOTHING, related_name='paymentscountrypaymentmethod_mobile_money_provider_set', blank=True, null=True)
    primary_provider = models.ForeignKey('PaymentsPaymentprovider', models.DO_NOTHING, related_name='paymentscountrypaymentmethod_primary_provider_set', blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'payments_countrypaymentmethod'


class PaymentsExchangerate(models.Model):
    id = models.BigAutoField(primary_key=True)
    from_currency = models.CharField(max_length=3)
    to_currency = models.CharField(max_length=3)
    rate = models.DecimalField(max_digits=15, decimal_places=6)
    source = models.CharField(max_length=50)
    last_updated = models.DateTimeField()
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'payments_exchangerate'
        unique_together = (('from_currency', 'to_currency'),)


class PaymentsPaymentmethod(models.Model):
    id = models.UUIDField(primary_key=True)
    method_type = models.CharField(max_length=20)
    nickname = models.CharField(max_length=100)
    is_default = models.BooleanField()
    bank_name = models.CharField(max_length=100, blank=True, null=True)
    account_last_four = models.CharField(max_length=4, blank=True, null=True)
    routing_number_last_four = models.CharField(max_length=4, blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    mobile_provider = models.CharField(max_length=50, blank=True, null=True)
    email = models.CharField(max_length=254, blank=True, null=True)
    wallet_id = models.CharField(max_length=100, blank=True, null=True)
    provider_token = models.CharField(max_length=255, blank=True, null=True)
    provider_account_id = models.CharField(max_length=255, blank=True, null=True)
    external_id = models.CharField(max_length=255, blank=True, null=True)
    is_verified = models.BooleanField()
    is_active = models.BooleanField()
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    last_used = models.DateTimeField(blank=True, null=True)
    business = models.ForeignKey('UsersBusiness', models.DO_NOTHING)
    employee = models.ForeignKey(HrEmployee, models.DO_NOTHING, blank=True, null=True)
    provider = models.ForeignKey('PaymentsPaymentprovider', models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'payments_paymentmethod'
        unique_together = (('business', 'employee', 'provider', 'method_type', 'external_id'),)


class PaymentsPaymentprovider(models.Model):
    id = models.UUIDField(primary_key=True)
    name = models.CharField(max_length=100)
    code = models.CharField(unique=True, max_length=50)
    provider_type = models.CharField(max_length=20)
    is_active = models.BooleanField()
    api_key_name = models.CharField(max_length=100, blank=True, null=True)
    api_secret_name = models.CharField(max_length=100, blank=True, null=True)
    api_base_url = models.CharField(max_length=200, blank=True, null=True)
    available_countries = models.JSONField()
    supports_recurring = models.BooleanField()
    supports_refunds = models.BooleanField()
    is_mobile_money = models.BooleanField()
    mobile_network_operator = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'payments_paymentprovider'


class PaymentsPaymenttransaction(models.Model):
    id = models.UUIDField(primary_key=True)
    transaction_type = models.CharField(max_length=20)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=3)
    description = models.TextField()
    status = models.CharField(max_length=20)
    error_message = models.TextField()
    provider_transaction_id = models.CharField(max_length=255, blank=True, null=True)
    provider_fee = models.DecimalField(max_digits=15, decimal_places=2)
    provider_reference = models.CharField(max_length=255, blank=True, null=True)
    exchange_rate = models.DecimalField(max_digits=15, decimal_places=6, blank=True, null=True)
    converted_amount = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    processed_at = models.DateTimeField(blank=True, null=True)
    metadata = models.JSONField()
    business = models.ForeignKey('UsersBusiness', models.DO_NOTHING)
    employee = models.ForeignKey(HrEmployee, models.DO_NOTHING, blank=True, null=True)
    payment_method = models.ForeignKey(PaymentsPaymentmethod, models.DO_NOTHING, blank=True, null=True)
    payroll_run = models.ForeignKey('PayrollPayrollrun', models.DO_NOTHING, blank=True, null=True)
    provider = models.ForeignKey(PaymentsPaymentprovider, models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'payments_paymenttransaction'


class PaymentsWebhookevent(models.Model):
    id = models.UUIDField(primary_key=True)
    event_type = models.CharField(max_length=100)
    event_id = models.CharField(max_length=255)
    payload = models.JSONField()
    processed = models.BooleanField()
    created_at = models.DateTimeField()
    processed_at = models.DateTimeField(blank=True, null=True)
    processing_error = models.TextField(blank=True, null=True)
    provider = models.ForeignKey(PaymentsPaymentprovider, models.DO_NOTHING)
    transaction = models.ForeignKey(PaymentsPaymenttransaction, models.DO_NOTHING, blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'payments_webhookevent'
        unique_together = (('provider', 'event_id'),)


class PayrollPayrollrun(models.Model):
    id = models.UUIDField(primary_key=True)
    payroll_number = models.CharField(unique=True, max_length=20)
    start_date = models.DateField()
    end_date = models.DateField()
    pay_date = models.DateField()
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20)
    country_code = models.CharField(max_length=2)
    is_international = models.BooleanField()
    service_type = models.CharField(max_length=10)
    filing_instructions = models.TextField(blank=True, null=True)
    tax_authority_links = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    tax_filings_created = models.BooleanField()
    tax_filings_status = models.CharField(max_length=20)
    currency_code = models.CharField(max_length=3)
    currency_symbol = models.CharField(max_length=5)
    exchange_rate_to_usd = models.DecimalField(max_digits=10, decimal_places=6)
    show_usd_comparison = models.BooleanField()
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'payroll_payrollrun'


class PayrollPayrolltransaction(models.Model):
    id = models.BigAutoField(primary_key=True)
    gross_pay = models.DecimalField(max_digits=10, decimal_places=2)
    net_pay = models.DecimalField(max_digits=10, decimal_places=2)
    taxes = models.DecimalField(max_digits=10, decimal_places=2)
    federal_tax = models.DecimalField(max_digits=10, decimal_places=2)
    state_tax = models.DecimalField(max_digits=10, decimal_places=2)
    state_code = models.CharField(max_length=2, blank=True, null=True)
    medicare_tax = models.DecimalField(max_digits=10, decimal_places=2)
    social_security_tax = models.DecimalField(max_digits=10, decimal_places=2)
    additional_withholdings = models.DecimalField(max_digits=10, decimal_places=2)
    employee = models.ForeignKey(HrEmployee, models.DO_NOTHING)
    payroll_run = models.ForeignKey(PayrollPayrollrun, models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)
    timesheet = models.ForeignKey(HrTimesheet, models.DO_NOTHING, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'payroll_payrolltransaction'


class PayrollTaxform(models.Model):
    id = models.BigAutoField(primary_key=True)
    form_type = models.CharField(max_length=20)
    tax_year = models.IntegerField()
    file = models.CharField(max_length=100)
    employee = models.ForeignKey(HrEmployee, models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'payroll_taxform'


class PurchasesBill(models.Model):
    id = models.UUIDField(primary_key=True)
    bill_number = models.CharField(unique=True, max_length=20, blank=True, null=True)
    bill_date = models.DateTimeField()
    due_date = models.DateTimeField()
    totalamount = models.DecimalField(db_column='totalAmount', max_digits=10, decimal_places=2)  # Field name made lowercase.
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    currency = models.CharField(max_length=3)
    poso_number = models.CharField(max_length=50, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    is_paid = models.BooleanField()
    vendor = models.ForeignKey('PurchasesVendor', models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'purchases_bill'


class PurchasesBillitem(models.Model):
    id = models.BigAutoField(primary_key=True)
    category = models.CharField(max_length=100)
    description = models.TextField()
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    tax = models.DecimalField(max_digits=10, decimal_places=2)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    bill = models.ForeignKey(PurchasesBill, models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'purchases_billitem'


class PurchasesExpense(models.Model):
    id = models.UUIDField(primary_key=True)
    vendor = models.CharField(max_length=100)
    date = models.DateField()
    category = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField()
    payment_method = models.CharField(max_length=50)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'purchases_expense'


class PurchasesProcurement(models.Model):
    id = models.UUIDField(primary_key=True)
    procurement_number = models.CharField(unique=True, max_length=20)
    date = models.DateField()
    description = models.TextField()
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    vendor = models.ForeignKey('PurchasesVendor', models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'purchases_procurement'


class PurchasesProcurementitem(models.Model):
    id = models.BigAutoField(primary_key=True)
    description = models.CharField(max_length=200)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    procurement = models.ForeignKey(PurchasesProcurement, models.DO_NOTHING)
    product = models.ForeignKey(InventoryProduct, models.DO_NOTHING, blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'purchases_procurementitem'


class PurchasesPurchaseorder(models.Model):
    id = models.UUIDField(primary_key=True)
    order_number = models.CharField(unique=True, max_length=50)
    discount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3)
    date = models.DateField()
    expected_delivery_date = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    totalamount = models.DecimalField(db_column='totalAmount', max_digits=10, decimal_places=2)  # Field name made lowercase.
    status = models.CharField(max_length=20)
    created_by = models.ForeignKey(CustomAuthUser, models.DO_NOTHING, blank=True, null=True)
    vendor = models.ForeignKey('PurchasesVendor', models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'purchases_purchaseorder'


class PurchasesPurchaseorderitem(models.Model):
    id = models.BigAutoField(primary_key=True)
    description = models.CharField(max_length=200, blank=True, null=True)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    product = models.ForeignKey(InventoryProduct, models.DO_NOTHING, blank=True, null=True)
    purchase_order = models.ForeignKey(PurchasesPurchaseorder, models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'purchases_purchaseorderitem'


class PurchasesPurchasereturn(models.Model):
    id = models.UUIDField(primary_key=True)
    return_number = models.CharField(unique=True, max_length=20)
    date = models.DateField()
    reason = models.TextField()
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    purchase_order = models.ForeignKey(PurchasesPurchaseorder, models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'purchases_purchasereturn'


class PurchasesPurchasereturnitem(models.Model):
    id = models.BigAutoField(primary_key=True)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    product = models.ForeignKey(InventoryProduct, models.DO_NOTHING, blank=True, null=True)
    purchase_return = models.ForeignKey(PurchasesPurchasereturn, models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'purchases_purchasereturnitem'


class PurchasesVendor(models.Model):
    id = models.UUIDField(primary_key=True)
    vendor_number = models.CharField(unique=True, max_length=20)
    vendor_name = models.CharField(max_length=100)
    street = models.CharField(max_length=100)
    postcode = models.CharField(max_length=10)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    phone = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'purchases_vendor'


class ReportsReport(models.Model):
    id = models.BigAutoField(primary_key=True)
    report_type = models.CharField(max_length=20)
    date_generated = models.DateTimeField()
    data = models.JSONField()
    user_profile = models.ForeignKey('UsersUserprofile', models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'reports_report'


class RlsTestCheck(models.Model):
    tenant_id = models.TextField()
    value = models.TextField()
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'rls_test_check'


class RlsTestTable(models.Model):
    tenant_id = models.TextField()
    value = models.TextField()
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'rls_test_table'


class RlsUuidTest(models.Model):
    tenant_id = models.UUIDField()
    value = models.TextField()
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'rls_uuid_test'


class SalesEstimate(models.Model):
    id = models.UUIDField(primary_key=True)
    estimate_num = models.CharField(unique=True, max_length=20, blank=True, null=True)
    totalamount = models.DecimalField(db_column='totalAmount', max_digits=10, decimal_places=2)  # Field name made lowercase.
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    date = models.DateTimeField()
    valid_until = models.DateTimeField()
    title = models.CharField(max_length=200)
    summary = models.TextField()
    logo = models.CharField(max_length=100, blank=True, null=True)
    customer_ref = models.CharField(max_length=100)
    discount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3)
    footer = models.TextField()
    customer = models.ForeignKey(CrmCustomer, models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'sales_estimate'


class SalesEstimateattachment(models.Model):
    id = models.BigAutoField(primary_key=True)
    file = models.CharField(max_length=100)
    estimate = models.ForeignKey(SalesEstimate, models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'sales_estimateattachment'


class SalesEstimateitem(models.Model):
    id = models.BigAutoField(primary_key=True)
    description = models.CharField(max_length=200, blank=True, null=True)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    estimate = models.ForeignKey(SalesEstimate, models.DO_NOTHING)
    product = models.ForeignKey(InventoryProduct, models.DO_NOTHING, blank=True, null=True)
    service = models.ForeignKey(InventoryService, models.DO_NOTHING, blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'sales_estimateitem'


class SalesInvoice(models.Model):
    tenant_id = models.UUIDField(blank=True, null=True)
    id = models.UUIDField(primary_key=True)
    invoice_num = models.CharField(max_length=20)
    totalamount = models.DecimalField(db_column='totalAmount', max_digits=10, decimal_places=2)  # Field name made lowercase.
    date = models.DateField()
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    due_date = models.DateField()
    status = models.CharField(max_length=20)
    is_paid = models.BooleanField()
    discount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3)
    accounts_receivable = models.ForeignKey(FinanceAccount, models.DO_NOTHING, blank=True, null=True)
    cost_of_goods_sold = models.ForeignKey(FinanceAccount, models.DO_NOTHING, related_name='salesinvoice_cost_of_goods_sold_set', blank=True, null=True)
    customer = models.ForeignKey(CrmCustomer, models.DO_NOTHING)
    inventory = models.ForeignKey(FinanceAccount, models.DO_NOTHING, related_name='salesinvoice_inventory_set', blank=True, null=True)
    sales_revenue = models.ForeignKey(FinanceAccount, models.DO_NOTHING, related_name='salesinvoice_sales_revenue_set', blank=True, null=True)
    sales_tax_payable = models.ForeignKey(FinanceAccount, models.DO_NOTHING, related_name='salesinvoice_sales_tax_payable_set', blank=True, null=True)
    transaction = models.OneToOneField(FinanceFinancetransaction, models.DO_NOTHING, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'sales_invoice'
        unique_together = (('tenant_id', 'invoice_num'),)


class SalesInvoiceitem(models.Model):
    id = models.BigAutoField(primary_key=True)
    description = models.CharField(max_length=200, blank=True, null=True)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    invoice = models.ForeignKey(SalesInvoice, models.DO_NOTHING)
    product = models.ForeignKey(InventoryProduct, models.DO_NOTHING, blank=True, null=True)
    service = models.ForeignKey(InventoryService, models.DO_NOTHING, blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'sales_invoiceitem'


class SalesRefund(models.Model):
    id = models.UUIDField(primary_key=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    reason = models.TextField()
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    sale = models.ForeignKey('SalesSale', models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'sales_refund'


class SalesRefunditem(models.Model):
    id = models.BigAutoField(primary_key=True)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    product = models.ForeignKey(InventoryProduct, models.DO_NOTHING)
    refund = models.ForeignKey(SalesRefund, models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'sales_refunditem'


class SalesSale(models.Model):
    tenant_id = models.UUIDField(blank=True, null=True)
    id = models.UUIDField(primary_key=True)
    quantity = models.IntegerField()
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=20)
    amount_given = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    change_due = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    created_at = models.DateTimeField()
    created_by = models.ForeignKey(CustomAuthUser, models.DO_NOTHING, blank=True, null=True)
    customer = models.ForeignKey(CrmCustomer, models.DO_NOTHING)
    invoice = models.OneToOneField(SalesInvoice, models.DO_NOTHING, blank=True, null=True)
    product = models.ForeignKey(InventoryProduct, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'sales_sale'


class SalesSaleitem(models.Model):
    id = models.BigAutoField(primary_key=True)
    tenant_id = models.UUIDField(blank=True, null=True)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    product = models.ForeignKey(InventoryProduct, models.DO_NOTHING)
    sale = models.ForeignKey(SalesSale, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'sales_saleitem'


class SalesSalesorder(models.Model):
    tenant_id = models.UUIDField(blank=True, null=True)
    id = models.UUIDField(primary_key=True)
    order_number = models.CharField(max_length=50)
    discount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3)
    date = models.DateField()
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    totalamount = models.DecimalField(db_column='totalAmount', max_digits=10, decimal_places=2)  # Field name made lowercase.
    created_by = models.ForeignKey(CustomAuthUser, models.DO_NOTHING, blank=True, null=True)
    customer = models.ForeignKey(CrmCustomer, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'sales_salesorder'
        unique_together = (('tenant_id', 'order_number'),)


class SalesSalesorderitem(models.Model):
    id = models.BigAutoField(primary_key=True)
    tenant_id = models.UUIDField(blank=True, null=True)
    description = models.CharField(max_length=200, blank=True, null=True)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    product = models.ForeignKey(InventoryProduct, models.DO_NOTHING, blank=True, null=True)
    sales_order = models.ForeignKey(SalesSalesorder, models.DO_NOTHING)
    service = models.ForeignKey(InventoryService, models.DO_NOTHING, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'sales_salesorderitem'


class ShopifyCustomers(models.Model):
    id = models.BigAutoField(primary_key=True)
    customer_id = models.BigIntegerField(unique=True)
    email = models.CharField(max_length=255)
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    integration = models.ForeignKey(IntegrationsShopifyintegration, models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'shopify_customers'


class ShopifyOrderItems(models.Model):
    id = models.BigAutoField(primary_key=True)
    product_id = models.BigIntegerField()
    variant_id = models.BigIntegerField()
    title = models.CharField(max_length=255)
    quantity = models.IntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    sku = models.CharField(max_length=100)
    order = models.ForeignKey('ShopifyOrders', models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'shopify_order_items'


class ShopifyOrders(models.Model):
    id = models.BigAutoField(primary_key=True)
    email = models.CharField(max_length=255)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal_price = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3)
    financial_status = models.CharField(max_length=50)
    fulfillment_status = models.CharField(max_length=50)
    customer_id = models.BigIntegerField()
    shipping_address = models.TextField()
    billing_address = models.TextField()
    integration = models.ForeignKey(IntegrationsShopifyintegration, models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'shopify_orders'


class ShopifyProducts(models.Model):
    id = models.BigAutoField(primary_key=True)
    product_id = models.BigIntegerField(unique=True)
    title = models.CharField(max_length=255)
    body_html = models.TextField()
    vendor = models.CharField(max_length=255)
    product_type = models.CharField(max_length=255)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    published_at = models.DateTimeField()
    template_suffix = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=255)
    published_scope = models.CharField(max_length=255)
    tags = models.CharField(max_length=255, blank=True, null=True)
    admin_graphql_api_id = models.CharField(max_length=255)
    integration = models.ForeignKey(IntegrationsShopifyintegration, models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'shopify_products'


class SocialaccountSocialaccount(models.Model):
    provider = models.CharField(max_length=200)
    uid = models.CharField(max_length=191)
    last_login = models.DateTimeField()
    date_joined = models.DateTimeField()
    extra_data = models.JSONField()
    user = models.ForeignKey(CustomAuthUser, models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'socialaccount_socialaccount'
        unique_together = (('provider', 'uid'),)


class SocialaccountSocialapp(models.Model):
    provider = models.CharField(max_length=30)
    name = models.CharField(max_length=40)
    client_id = models.CharField(max_length=191)
    secret = models.CharField(max_length=191)
    key = models.CharField(max_length=191)
    provider_id = models.CharField(max_length=200)
    settings = models.JSONField()
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'socialaccount_socialapp'


class SocialaccountSocialappSites(models.Model):
    id = models.BigAutoField(primary_key=True)
    socialapp = models.ForeignKey(SocialaccountSocialapp, models.DO_NOTHING)
    site = models.ForeignKey(DjangoSite, models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'socialaccount_socialapp_sites'
        unique_together = (('socialapp', 'site'),)


class SocialaccountSocialtoken(models.Model):
    token = models.TextField()
    token_secret = models.TextField()
    expires_at = models.DateTimeField(blank=True, null=True)
    account = models.ForeignKey(SocialaccountSocialaccount, models.DO_NOTHING)
    app = models.ForeignKey(SocialaccountSocialapp, models.DO_NOTHING, blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'socialaccount_socialtoken'
        unique_together = (('app', 'account'),)


class TaxesIncometaxrate(models.Model):
    id = models.BigAutoField(primary_key=True)
    tax_year = models.IntegerField()
    effective_date = models.DateField()
    is_flat_rate = models.BooleanField()
    rate_value = models.DecimalField(max_digits=6, decimal_places=4)
    income_min = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    income_max = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    filing_status = models.CharField(max_length=20)
    last_updated = models.DateTimeField()
    manual_override = models.BooleanField()
    state = models.ForeignKey('TaxesState', models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'taxes_incometaxrate'
        unique_together = (('state', 'tax_year', 'filing_status', 'income_min'),)


class TaxesPayrolltaxfiling(models.Model):
    id = models.BigAutoField(primary_key=True)
    business_id = models.CharField(max_length=50)
    payroll_run = models.CharField(max_length=50)
    filing_period_start = models.DateField()
    filing_period_end = models.DateField()
    submission_date = models.DateTimeField()
    filing_status = models.CharField(max_length=20)
    total_wages = models.DecimalField(max_digits=12, decimal_places=2)
    total_withholding = models.DecimalField(max_digits=12, decimal_places=2)
    confirmation_number = models.CharField(max_length=100, blank=True, null=True)
    submission_method = models.CharField(max_length=20)
    notes = models.TextField()
    pdf_file = models.CharField(max_length=100, blank=True, null=True)
    is_amended = models.BooleanField()
    state = models.ForeignKey('TaxesState', models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'taxes_payrolltaxfiling'


class TaxesState(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=100)
    code = models.CharField(unique=True, max_length=10)
    is_active = models.BooleanField()
    country = models.CharField(max_length=2)
    service_type = models.CharField(max_length=10)
    compliance_last_checked = models.DateTimeField(blank=True, null=True)
    compliance_check_frequency = models.IntegerField()
    full_service_enabled = models.BooleanField()
    e_file_supported = models.BooleanField()
    e_file_portal_url = models.CharField(max_length=200, blank=True, null=True)
    has_local_taxes = models.BooleanField()
    notes = models.TextField()
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'taxes_state'


class TaxesTaxapitransaction(models.Model):
    id = models.BigAutoField(primary_key=True)
    transaction_date = models.DateTimeField()
    endpoint = models.CharField(max_length=255)
    request_payload = models.TextField()
    response_payload = models.TextField()
    status_code = models.IntegerField()
    success = models.BooleanField()
    error_message = models.TextField(blank=True, null=True)
    processing_time_ms = models.IntegerField()
    state = models.ForeignKey(TaxesState, models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'taxes_taxapitransaction'


class TaxesTaxfilinginstruction(models.Model):
    id = models.BigAutoField(primary_key=True)
    instructions = models.TextField()
    portal_url = models.CharField(max_length=200)
    filing_frequency = models.CharField(max_length=20)
    due_days = models.IntegerField()
    last_updated = models.DateTimeField()
    state = models.OneToOneField(TaxesState, models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'taxes_taxfilinginstruction'


class TaxesTaxform(models.Model):
    id = models.UUIDField(primary_key=True)
    employee_id = models.UUIDField(blank=True, null=True)
    form_type = models.CharField(max_length=20)
    tax_year = models.IntegerField()
    filing_status = models.CharField(max_length=20, blank=True, null=True)
    submission_date = models.DateField()
    employer_id_number = models.CharField(max_length=100)
    file = models.CharField(max_length=100)
    state_code = models.CharField(max_length=2, blank=True, null=True)
    state_employer_id = models.CharField(max_length=100, blank=True, null=True)
    is_verified = models.BooleanField()
    verification_date = models.DateTimeField(blank=True, null=True)
    was_filed = models.BooleanField()
    filing_confirmation = models.CharField(max_length=255, blank=True, null=True)
    verified_by = models.ForeignKey(CustomAuthUser, models.DO_NOTHING, blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'taxes_taxform'
        unique_together = (('employee_id', 'form_type', 'tax_year'),)


class TenantTest(models.Model):
    tenant_id = models.TextField()
    data = models.TextField()

    class Meta:
        managed = False
        db_table = 'tenant_test'


class TenantUsers(models.Model):
    tenant = models.ForeignKey(CustomAuthTenant, models.DO_NOTHING, blank=True, null=True)
    user_id = models.TextField(primary_key=True)
    role = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'tenant_users'


class TokenBlacklistBlacklistedtoken(models.Model):
    id = models.BigAutoField(primary_key=True)
    blacklisted_at = models.DateTimeField()
    token = models.OneToOneField('TokenBlacklistOutstandingtoken', models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'token_blacklist_blacklistedtoken'


class TokenBlacklistOutstandingtoken(models.Model):
    id = models.BigAutoField(primary_key=True)
    token = models.TextField()
    created_at = models.DateTimeField(blank=True, null=True)
    expires_at = models.DateTimeField()
    user = models.ForeignKey(CustomAuthUser, models.DO_NOTHING, blank=True, null=True)
    jti = models.CharField(unique=True, max_length=255)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'token_blacklist_outstandingtoken'


class TransportCompliance(models.Model):
    id = models.UUIDField(primary_key=True)
    document_type = models.CharField(max_length=100)
    document_number = models.CharField(max_length=100, blank=True, null=True)
    issue_date = models.DateField()
    expiration_date = models.DateField()
    issuing_authority = models.CharField(max_length=255, blank=True, null=True)
    document_file = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    driver = models.ForeignKey('TransportDriver', models.DO_NOTHING, blank=True, null=True)
    equipment = models.ForeignKey('TransportEquipment', models.DO_NOTHING, blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'transport_compliance'


class TransportDriver(models.Model):
    id = models.UUIDField(primary_key=True)
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    email = models.CharField(max_length=254, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    license_number = models.CharField(max_length=100)
    license_state = models.CharField(max_length=100)
    license_expiration = models.DateField()
    status = models.CharField(max_length=50)
    hire_date = models.DateField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    user = models.OneToOneField(CustomAuthUser, models.DO_NOTHING, blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'transport_driver'


class TransportEquipment(models.Model):
    id = models.UUIDField(primary_key=True)
    name = models.CharField(max_length=255)
    equipment_type = models.CharField(max_length=100)
    make = models.CharField(max_length=100, blank=True, null=True)
    model = models.CharField(max_length=100, blank=True, null=True)
    year = models.IntegerField(blank=True, null=True)
    vin = models.CharField(max_length=100, blank=True, null=True)
    license_plate = models.CharField(max_length=50, blank=True, null=True)
    status = models.CharField(max_length=50)
    purchase_date = models.DateField(blank=True, null=True)
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    current_value = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'transport_equipment'


class TransportExpense(models.Model):
    id = models.UUIDField(primary_key=True)
    expense_type = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField()
    description = models.TextField(blank=True, null=True)
    receipt = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    created_by = models.ForeignKey(CustomAuthUser, models.DO_NOTHING, blank=True, null=True)
    equipment = models.ForeignKey(TransportEquipment, models.DO_NOTHING, blank=True, null=True)
    load = models.ForeignKey('TransportLoad', models.DO_NOTHING, blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'transport_expense'


class TransportLoad(models.Model):
    id = models.UUIDField(primary_key=True)
    reference_number = models.CharField(unique=True, max_length=100)
    status = models.CharField(max_length=50)
    pickup_date = models.DateTimeField()
    delivery_date = models.DateTimeField()
    pickup_location = models.CharField(max_length=255)
    delivery_location = models.CharField(max_length=255)
    cargo_description = models.TextField()
    weight = models.DecimalField(max_digits=10, decimal_places=2)
    volume = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    value = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    rate = models.DecimalField(max_digits=10, decimal_places=2)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    customer = models.ForeignKey(CrmCustomer, models.DO_NOTHING)
    driver = models.ForeignKey(TransportDriver, models.DO_NOTHING, blank=True, null=True)
    equipment = models.ForeignKey(TransportEquipment, models.DO_NOTHING, blank=True, null=True)
    route = models.ForeignKey('TransportRoute', models.DO_NOTHING, blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'transport_load'


class TransportMaintenance(models.Model):
    id = models.UUIDField(primary_key=True)
    maintenance_type = models.CharField(max_length=100)
    description = models.TextField()
    date_performed = models.DateField()
    odometer_reading = models.IntegerField(blank=True, null=True)
    cost = models.DecimalField(max_digits=10, decimal_places=2)
    performed_by = models.CharField(max_length=255, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    next_maintenance_date = models.DateField(blank=True, null=True)
    next_maintenance_odometer = models.IntegerField(blank=True, null=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    equipment = models.ForeignKey(TransportEquipment, models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'transport_maintenance'


class TransportRoute(models.Model):
    id = models.UUIDField(primary_key=True)
    name = models.CharField(max_length=255)
    start_location = models.CharField(max_length=255)
    end_location = models.CharField(max_length=255)
    distance = models.DecimalField(max_digits=10, decimal_places=2)
    estimated_time = models.DurationField()
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'transport_route'


class UsersBusiness(models.Model):
    id = models.UUIDField(primary_key=True)
    owner_id = models.UUIDField(blank=True, null=True)
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    business_num = models.CharField(unique=True, max_length=6, blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'users_business'


class UsersBusinessDetails(models.Model):
    business = models.OneToOneField(UsersBusiness, models.DO_NOTHING, primary_key=True)
    business_type = models.CharField(max_length=50, blank=True, null=True)
    business_subtype_selections = models.JSONField()
    legal_structure = models.CharField(max_length=50)
    date_founded = models.DateField(blank=True, null=True)
    country = models.CharField(max_length=2)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'users_business_details'


class UsersBusinessmember(models.Model):
    id = models.BigAutoField(primary_key=True)
    role = models.CharField(max_length=20)
    is_active = models.BooleanField()
    date_joined = models.DateTimeField()
    business = models.ForeignKey(UsersBusiness, models.DO_NOTHING)
    user = models.ForeignKey(CustomAuthUser, models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'users_businessmember'
        unique_together = (('business', 'user'),)


class UsersMenuPrivilege(models.Model):
    id = models.UUIDField(primary_key=True)
    menu_items = models.JSONField()
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    business_member = models.OneToOneField(UsersBusinessmember, models.DO_NOTHING)
    created_by = models.ForeignKey(CustomAuthUser, models.DO_NOTHING, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'users_menu_privilege'


class UsersSubscription(models.Model):
    id = models.BigAutoField(primary_key=True)
    selected_plan = models.CharField(max_length=20)
    start_date = models.DateField()
    is_active = models.BooleanField()
    end_date = models.DateField(blank=True, null=True)
    billing_cycle = models.CharField(max_length=20)
    business = models.ForeignKey(UsersBusiness, models.DO_NOTHING)
    tenant_id = models.UUIDField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'users_subscription'


class UsersUserprofile(models.Model):
    id = models.BigAutoField(primary_key=True)
    business_id = models.UUIDField(blank=True, null=True)
    tenant_id = models.UUIDField(blank=True, null=True)
    occupation = models.CharField(max_length=200, blank=True, null=True)
    street = models.CharField(max_length=200, blank=True, null=True)
    city = models.CharField(max_length=200, blank=True, null=True)
    state = models.CharField(max_length=200, blank=True, null=True)
    postcode = models.CharField(max_length=200, blank=True, null=True)
    country = models.CharField(max_length=2)
    phone_number = models.CharField(max_length=200, blank=True, null=True)
    created_at = models.DateTimeField()
    modified_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    is_business_owner = models.BooleanField()
    shopify_access_token = models.CharField(max_length=255, blank=True, null=True)
    metadata = models.JSONField(blank=True, null=True)
    setup_task_id = models.CharField(max_length=255, blank=True, null=True)
    setup_status = models.CharField(max_length=20)
    setup_started_at = models.DateTimeField(blank=True, null=True)
    setup_completed_at = models.DateTimeField(blank=True, null=True)
    setup_error = models.TextField(blank=True, null=True)
    user = models.OneToOneField(CustomAuthUser, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'users_userprofile'
