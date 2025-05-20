import os

# taxes/db_router.py
class TaxDatabaseRouter:
    """
    Router to direct tax-related models to the taxes database
    """
    def db_for_read(self, model, **hints):
        if model._meta.app_label == 'taxes':
            return 'taxes'
        return None

    def db_for_write(self, model, **hints):
        if model._meta.app_label == 'taxes':
            return 'taxes'
        return None

    def allow_relation(self, obj1, obj2, **hints):
        # Allow relations between models in the taxes app
        if obj1._meta.app_label == 'taxes' and obj2._meta.app_label == 'taxes':
            return True
        return None

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        if app_label == 'taxes':
            return db == 'taxes'
        if db == 'taxes':
            return app_label == 'taxes'
        return None