from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0016_add_whatsapp_preference_only'),
    ]

    operations = [
        migrations.RunSQL(
            """
            ALTER TABLE users_userprofile 
            ADD COLUMN IF NOT EXISTS show_whatsapp_commerce BOOLEAN NULL;
            """,
            reverse_sql="""
            ALTER TABLE users_userprofile 
            DROP COLUMN IF EXISTS show_whatsapp_commerce;
            """
        ),
    ]