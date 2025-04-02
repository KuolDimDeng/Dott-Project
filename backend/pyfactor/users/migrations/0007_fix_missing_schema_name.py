from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('users', '0006_remove_business_owner_business_owner_id'),
    ]

    operations = [
        migrations.RunSQL(
            sql='''
            CREATE OR REPLACE FUNCTION generate_schema_name(tenant_id integer)
            RETURNS text AS $$
            BEGIN
                RETURN 'tenant_' || tenant_id;
            END;
            $$ LANGUAGE plpgsql;
            ''',
            reverse_sql='''
            DROP FUNCTION IF EXISTS generate_schema_name(integer);
            '''
        ),
    ] 