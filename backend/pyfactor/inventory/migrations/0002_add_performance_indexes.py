# Generated manually for performance optimization
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0001_initial'),  # Adjust this to match your last migration
    ]

    operations = [
        # Add indexes to InventoryItem model
        migrations.AddIndex(
            model_name='inventoryitem',
            index=models.Index(fields=['name', 'sku'], name='inv_name_sku_idx'),
        ),
        migrations.AddIndex(
            model_name='inventoryitem',
            index=models.Index(fields=['quantity', 'reorder_level'], name='inv_qty_reorder_idx'),
        ),
        migrations.AddIndex(
            model_name='inventoryitem',
            index=models.Index(fields=['category', 'supplier'], name='inv_cat_supp_idx'),
        ),
        
        # Add indexes to Product model
        migrations.AddIndex(
            model_name='product',
            index=models.Index(fields=['stock_quantity', 'reorder_level'], name='prod_qty_reorder_idx'),
        ),
        migrations.AddIndex(
            model_name='product',
            index=models.Index(fields=['is_for_sale', 'price'], name='prod_sale_price_idx'),
        ),
        migrations.AddIndex(
            model_name='product',
            index=models.Index(fields=['created_at'], name='prod_created_idx'),
        ),
        
        # Add indexes to frequently queried fields
        migrations.AlterField(
            model_name='product',
            name='product_code',
            field=models.CharField(db_index=True, editable=False, max_length=50, unique=True),
        ),
        migrations.AlterField(
            model_name='product',
            name='stock_quantity',
            field=models.IntegerField(db_index=True, default=0),
        ),
        migrations.AlterField(
            model_name='inventoryitem',
            name='name',
            field=models.CharField(db_index=True, max_length=255),
        ),
        migrations.AlterField(
            model_name='inventoryitem',
            name='sku',
            field=models.CharField(db_index=True, max_length=50, unique=True),
        ),
        migrations.AlterField(
            model_name='inventoryitem',
            name='quantity',
            field=models.IntegerField(db_index=True, default=0),
        ),
        migrations.AlterField(
            model_name='inventoryitem',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, db_index=True),
        ),
    ]