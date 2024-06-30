from django.db import models

# Create your models here.
# chatbot/models.py
from django.db import models
from django.conf import settings

class FAQ(models.Model):
    question = models.TextField()
    answer = models.TextField()
    keywords = models.TextField()  # Store keywords as comma-separated values

    def __str__(self):
        return self.question[:50]

class ChatMessage(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    message = models.TextField()
    is_from_user = models.BooleanField(default=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    needs_staff_attention = models.BooleanField(default=False)
    staff_response = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.email}: {self.message[:50]}"