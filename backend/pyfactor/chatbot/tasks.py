# chatbot/tasks.py
from celery import shared_task
from django.core.mail import send_mail
from .models import ChatMessage

@shared_task
def notify_staff(message_id):
    message = ChatMessage.objects.get(id=message_id)
    send_mail(
        'New chat message requires attention',
        f'Message from {message.user.email}: {message.message}',
        'from@example.com',
        ['staff@example.com'],
        fail_silently=False,
    )