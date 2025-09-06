# Generated manually for menu app

from django.db import migrations, models
import django.db.models.deletion
import django.core.validators
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('users', '0001_initial'),
        ('inventory', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='MenuCategory',
            fields=[
                ('tenant_id', models.UUIDField(db_index=True, help_text='The tenant ID this record belongs to. Used by Row Level Security.', null=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=100)),
                ('description', models.TextField(blank=True)),
                ('display_order', models.IntegerField(default=0)),
                ('is_active', models.BooleanField(default=True)),
                ('icon', models.CharField(blank=True, help_text='Icon name for mobile app', max_length=50)),
                ('category_type', models.CharField(choices=[('APPETIZERS', 'Appetizers & Starters'), ('SOUPS', 'Soups'), ('SALADS', 'Salads'), ('MAINS', 'Main Courses'), ('PIZZA', 'Pizza'), ('PASTA', 'Pasta'), ('SANDWICHES', 'Sandwiches & Burgers'), ('SEAFOOD', 'Seafood'), ('MEAT', 'Meat Dishes'), ('VEGETARIAN', 'Vegetarian'), ('SIDES', 'Side Dishes'), ('DESSERTS', 'Desserts'), ('BEVERAGES', 'Beverages'), ('HOT_DRINKS', 'Hot Drinks'), ('COLD_DRINKS', 'Cold Drinks'), ('ALCOHOLIC', 'Alcoholic Beverages'), ('KIDS', 'Kids Menu'), ('BREAKFAST', 'Breakfast'), ('LUNCH', 'Lunch Specials'), ('DINNER', 'Dinner Specials'), ('CUSTOM', 'Custom Category')], default='CUSTOM', max_length=20)),
            ],
            options={
                'verbose_name_plural': 'Menu Categories',
                'db_table': 'menu_categories',
                'ordering': ['display_order', 'name'],
            },
        ),
        migrations.CreateModel(
            name='MenuItem',
            fields=[
                ('tenant_id', models.UUIDField(db_index=True, help_text='The tenant ID this record belongs to. Used by Row Level Security.', null=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=200)),
                ('description', models.TextField(blank=True)),
                ('price', models.DecimalField(decimal_places=2, max_digits=10, validators=[django.core.validators.MinValueValidator(0)])),
                ('discounted_price', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, validators=[django.core.validators.MinValueValidator(0)])),
                ('cost', models.DecimalField(blank=True, decimal_places=2, help_text='Cost to make this item', max_digits=10, null=True, validators=[django.core.validators.MinValueValidator(0)])),
                ('image_url', models.URLField(blank=True, help_text='Primary image URL')),
                ('thumbnail_url', models.URLField(blank=True, help_text='Thumbnail image URL')),
                ('additional_images', models.JSONField(blank=True, default=list, help_text='List of additional image URLs')),
                ('is_available', models.BooleanField(default=True)),
                ('is_featured', models.BooleanField(default=False)),
                ('is_new', models.BooleanField(default=False)),
                ('is_popular', models.BooleanField(default=False)),
                ('preparation_time', models.IntegerField(blank=True, help_text='Preparation time in minutes', null=True)),
                ('serving_size', models.CharField(blank=True, help_text="e.g., '2 pieces', '300g', 'Large'", max_length=50)),
                ('calories', models.IntegerField(blank=True, null=True, validators=[django.core.validators.MinValueValidator(0)])),
                ('is_vegetarian', models.BooleanField(default=False)),
                ('is_vegan', models.BooleanField(default=False)),
                ('is_gluten_free', models.BooleanField(default=False)),
                ('is_dairy_free', models.BooleanField(default=False)),
                ('is_halal', models.BooleanField(default=False)),
                ('is_kosher', models.BooleanField(default=False)),
                ('is_spicy', models.BooleanField(default=False)),
                ('spice_level', models.IntegerField(blank=True, help_text='Spice level from 0-5', null=True, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(5)])),
                ('allergens', models.JSONField(blank=True, default=list, help_text='List of allergens: nuts, shellfish, eggs, dairy, gluten, soy, etc.')),
                ('ingredients', models.JSONField(blank=True, default=list, help_text='List of main ingredients')),
                ('customization_options', models.JSONField(blank=True, default=list, help_text='Options like size, toppings, cooking preferences')),
                ('display_order', models.IntegerField(default=0)),
                ('tags', models.JSONField(blank=True, default=list, help_text='Tags for searching and filtering')),
                ('stock_quantity', models.IntegerField(blank=True, help_text='For items with limited daily quantity', null=True)),
                ('unlimited_stock', models.BooleanField(default=True)),
                ('rating', models.DecimalField(blank=True, decimal_places=2, max_digits=3, null=True, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(5)])),
                ('review_count', models.IntegerField(default=0)),
                ('order_count', models.IntegerField(default=0, help_text='Number of times ordered')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('business', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='menu_items', to='users.business')),
                ('category', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='menu_items', to='menu.menucategory')),
                ('inventory_items', models.ManyToManyField(blank=True, help_text='Link to inventory items used', to='inventory.product')),
            ],
            options={
                'db_table': 'menu_items',
                'ordering': ['category', 'display_order', 'name'],
            },
        ),
        migrations.CreateModel(
            name='MenuSpecial',
            fields=[
                ('tenant_id', models.UUIDField(db_index=True, help_text='The tenant ID this record belongs to. Used by Row Level Security.', null=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=200)),
                ('description', models.TextField()),
                ('special_type', models.CharField(choices=[('DAILY', 'Daily Special'), ('WEEKLY', 'Weekly Special'), ('HAPPY_HOUR', 'Happy Hour'), ('LUNCH', 'Lunch Special'), ('DINNER', 'Dinner Special'), ('WEEKEND', 'Weekend Special'), ('SEASONAL', 'Seasonal Special'), ('HOLIDAY', 'Holiday Special')], max_length=20)),
                ('start_date', models.DateField(blank=True, null=True)),
                ('end_date', models.DateField(blank=True, null=True)),
                ('start_time', models.TimeField(blank=True, null=True)),
                ('end_time', models.TimeField(blank=True, null=True)),
                ('monday', models.BooleanField(default=False)),
                ('tuesday', models.BooleanField(default=False)),
                ('wednesday', models.BooleanField(default=False)),
                ('thursday', models.BooleanField(default=False)),
                ('friday', models.BooleanField(default=False)),
                ('saturday', models.BooleanField(default=False)),
                ('sunday', models.BooleanField(default=False)),
                ('discount_percentage', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(100)])),
                ('fixed_price', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('menu_items', models.ManyToManyField(related_name='specials', to='menu.menuitem')),
            ],
            options={
                'db_table': 'menu_specials',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='MenuItemReview',
            fields=[
                ('tenant_id', models.UUIDField(db_index=True, help_text='The tenant ID this record belongs to. Used by Row Level Security.', null=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('customer_name', models.CharField(max_length=100)),
                ('customer_email', models.EmailField(blank=True)),
                ('rating', models.IntegerField(validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                ('comment', models.TextField(blank=True)),
                ('is_verified_purchase', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('menu_item', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reviews', to='menu.menuitem')),
            ],
            options={
                'db_table': 'menu_item_reviews',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AlterUniqueTogether(
            name='menucategory',
            unique_together={('tenant_id', 'name')},
        ),
        migrations.AddIndex(
            model_name='menuitem',
            index=models.Index(fields=['tenant_id', 'is_available'], name='menu_items_tenant__d1bbda_idx'),
        ),
        migrations.AddIndex(
            model_name='menuitem',
            index=models.Index(fields=['tenant_id', 'category'], name='menu_items_tenant__8b96f0_idx'),
        ),
        migrations.AddIndex(
            model_name='menuitem',
            index=models.Index(fields=['tenant_id', 'is_featured'], name='menu_items_tenant__fec5a5_idx'),
        ),
    ]