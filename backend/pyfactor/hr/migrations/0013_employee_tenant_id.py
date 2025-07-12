# Generated manually to add tenant_id to Employee model

from django.db import migrations, models

def populate_tenant_id(apps, schema_editor):
    """Copy business_id to tenant_id for existing employees"""
    Employee = apps.get_model('hr', 'Employee')
    Employee.objects.filter(tenant_id__isnull=True).update(tenant_id=models.F('business_id'))

def reverse_populate_tenant_id(apps, schema_editor):
    """Clear tenant_id values"""
    Employee = apps.get_model('hr', 'Employee')
    Employee.objects.update(tenant_id=None)

class Migration(migrations.Migration):

    dependencies = [
        ('hr', '0012_accesspermission_tenant_id_benefits_tenant_id_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='employee',
            name='tenant_id',
            field=models.UUIDField(
                db_index=True, 
                null=True, 
                blank=True,
                help_text='The tenant ID this record belongs to. Used by Row Level Security.'
            ),
        ),
        migrations.RunPython(populate_tenant_id, reverse_populate_tenant_id),
    ]