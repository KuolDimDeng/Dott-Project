from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('custom_auth', '0001_initial'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            CREATE TABLE IF NOT EXISTS public.deleted_schemas (
                id SERIAL PRIMARY KEY,
                schema_name VARCHAR(255) NOT NULL,
                deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                is_processed BOOLEAN NOT NULL DEFAULT FALSE,
                processed_at TIMESTAMP WITH TIME ZONE NULL
            );
            CREATE INDEX IF NOT EXISTS deleted_schemas_name_idx ON public.deleted_schemas(schema_name);
            CREATE INDEX IF NOT EXISTS deleted_schemas_is_processed_idx ON public.deleted_schemas(is_processed);
            """,
            reverse_sql="""
            DROP TABLE IF EXISTS public.deleted_schemas;
            """
        ),
    ] 