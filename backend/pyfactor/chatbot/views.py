from datetime import timezone
import json
from django.shortcuts import redirect, render
from django.core.exceptions import ObjectDoesNotExist

# Create your views here.
# chatbot/views.py
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import ChatMessage, FAQ
from .serializers import ChatMessageSerializer, FAQSerializer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from .tasks import notify_staff
from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import user_passes_test
from .models import ChatMessage
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import connections
from pyfactor.userDatabaseRouter import UserDatabaseRouter
from django.conf import settings
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from pyfactor.logging_config import get_logger
logger = get_logger()

logger.debug("Attempting to import get_channel_layer")
from channels.layers import get_channel_layer
logger.debug("Successfully imported get_channel_layer")

logger.debug("Chatbot views module loaded")

def get_messages(request):
    database = request.GET.get('database')
    
    if database not in settings.DATABASES:
        UserDatabaseRouter().create_dynamic_database(database)

    try:
        with connections[database].cursor() as cursor:
            cursor.execute("SELECT * FROM user_chatbot_message ORDER BY timestamp DESC")
            messages = cursor.fetchall()
            
        return JsonResponse({'messages': [
            {
                'id': msg[0],
                'user_id': msg[1],
                'message': msg[2],
                'is_from_user': msg[3],
                'timestamp': msg[4]
            } for msg in messages
        ]})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def send_message(request):
    if request.method == 'POST':
        database = request.GET.get('database')
        data = json.loads(request.body)
        message = data.get('message')
        with connections[database].cursor() as cursor:
            cursor.execute("""
                INSERT INTO user_chatbot_message (user_id, message, is_from_user, timestamp)
                VALUES (%s, %s, %s, %s)
            """, [request.user.id, message, True, timezone.now()])
            # Here you would typically process the message and generate a response
            response = "Thank you for your message. A staff member will respond soon."
            cursor.execute("""
                INSERT INTO user_chatbot_message (user_id, message, is_from_user, timestamp)
                VALUES (%s, %s, %s, %s)
            """, [request.user.id, response, False, timezone.now()])
        return JsonResponse({'response': response})
    return JsonResponse({'error': 'Invalid request'}, status=400)

def staff_interface(request):
    logger.debug("Entering staff_interface view")
    
    try:
        # Log the current user
        logger.debug(f"Current user: {request.user}")
        
        # Log the databases available
        from django.db import connections
        logger.debug(f"Available databases: {list(connections.databases.keys())}")
        
        # Attempt to get pending messages
        pending_messages = ChatMessage.objects.filter(needs_staff_attention=True, staff_response__isnull=True)
        
        # Log the query being executed
        logger.debug(f"Executing query: {pending_messages.query}")
        
        # Log the count and details of pending messages
        logger.debug(f"Number of pending messages: {pending_messages.count()}")
        for message in pending_messages:
            logger.debug(f"Message ID: {message.id}, User: {message.user}, Content: {message.message[:50]}...")
        
        # If there are no pending messages, log this information
        if not pending_messages.exists():
            logger.info("No pending messages found.")
        
        # Render the template with the pending messages
        return render(request, 'chatbot/staff_interface.html', {'pending_messages': pending_messages})
    
    except ObjectDoesNotExist as e:
        logger.error(f"ObjectDoesNotExist error in staff_interface: {str(e)}")
        return render(request, 'chatbot/staff_interface.html', {'error': 'Database error occurred.'})
    except Exception as e:
        logger.exception(f"Unexpected error in staff_interface: {str(e)}")
        return render(request, 'chatbot/staff_interface.html', {'error': 'An unexpected error occurred.'})


@user_passes_test(lambda u: u.is_staff)
def respond_to_message(request, message_id):
    logger.debug(f"Entering respond_to_message view with message_id: {message_id}")
    if request.method == 'POST':
        message = get_object_or_404(ChatMessage, id=message_id)
        response = request.POST.get('response')
        message.staff_response = response
        message.needs_staff_attention = False
        message.save()
        ChatMessage.objects.create(user=message.user, message=response, is_from_user=False)
    return redirect('staff_interface')

class ChatMessageViewSet(viewsets.ModelViewSet):
    queryset = ChatMessage.objects.all()
    serializer_class = ChatMessageSerializer

    @csrf_exempt
    def send_message(request):
        if request.method == 'POST':
            database = request.GET.get('database')
            data = json.loads(request.body)
            message = data.get('message')
            
            # Use ORM to create the message
            ChatMessage.objects.using(database).create(
                user=request.user,
                message=message,
                is_from_user=True,
                timestamp=timezone.now()
            )
            
            # Create the response message
            response = "Thank you for your message. A staff member will respond soon."
            ChatMessage.objects.using(database).create(
                user=request.user,
                message=response,
                is_from_user=False,
                timestamp=timezone.now()
            )
            
            return JsonResponse({'response': response})
        return JsonResponse({'error': 'Invalid request'}, status=400)

def get_messages(request):
    database = request.GET.get('database')
    if not database:
        return JsonResponse({'error': 'Database parameter is required'}, status=400)

    try:
        with connections[database].cursor() as cursor:
            cursor.execute("SELECT * FROM chatbot_chatmessage ORDER BY timestamp DESC")
            messages = cursor.fetchall()
        
        return JsonResponse({'messages': [
            {
                'id': msg[0],
                'user_id': msg[1],
                'message': msg[2],
                'is_from_user': msg[3],
                'timestamp': msg[4]
            } for msg in messages
        ]})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

class FAQViewSet(viewsets.ModelViewSet):
    queryset = FAQ.objects.all()
    serializer_class = FAQSerializer


