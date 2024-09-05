from django.db import models
from django.utils import timezone

try:
    from django.db.models import JSONField
except ImportError:
    from django.contrib.postgres.fields import JSONField


class DogModel(models.Model):

    name = models.CharField(max_length=200)
    created = models.DateTimeField(default=timezone.now)
    attrs = JSONField(default=dict)
