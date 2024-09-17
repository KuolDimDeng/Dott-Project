from datetime import timezone
import json
from django.shortcuts import redirect, render
from django.core.exceptions import ObjectDoesNotExist

# Create your views here.
# chatbot/views.py
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import user_passes_test
from users.models import User, UserProfile
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
from asgiref.sync import async_to_sync
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

@user_passes_test(lambda u: u.is_staff)
def staff_interface(request):
    try:
        all_messages = []
        user_profiles = UserProfile.objects.all()
        
        for profile in user_profiles:
            database_name = profile.database_name
            if database_name:
                try:
                    with connections[database_name].cursor() as cursor:
                        cursor.execute("SELECT * FROM chatbot_chatmessage ORDER BY timestamp DESC")
                        messages = cursor.fetchall()
                        all_messages.extend([
                            {
                                'id': message[0],
                                'user_email': profile.user.email,
                                'message': message[2],
                                'timestamp': message[3],
                                'is_from_user': message[4],
                                'needs_staff_attention': message[5],
                                'staff_response': message[6],
                                'database': database_name,
                            }
                            for message in messages
                        ])
                except Exception as e:
                    logger.error(f"Error fetching messages from database {database_name}: {str(e)}")
        
        all_messages.sort(key=lambda x: x['timestamp'], reverse=True)
        
        logger.debug(f"Total messages fetched: {len(all_messages)}")
        
        return render(request, 'chatbot/staff_interface.html', {'messages': all_messages})
    except Exception as e:
        logger.exception(f"Unexpected error in staff_interface: {str(e)}")
        return render(request, 'chatbot/staff_interface.html', {'error': 'An unexpected error occurred.'})
    
@user_passes_test(lambda u: u.is_staff)
def respond_to_message(request, message_id):
    logger.debug(f"Entering respond_to_message view with message_id: {message_id}")
    if request.method == 'POST':
        database = request.POST.get('database')
        response = request.POST.get('response')
        
        with connections[database].cursor() as cursor:
            # Update the original message
            cursor.execute("""
                UPDATE chatbot_chatmessage
                SET staff_response = %s, needs_staff_attention = FALSE
                WHERE id = %s
            """, [response, message_id])
            
            # Create a new message for the staff response
            cursor.execute("""
                INSERT INTO chatbot_chatmessage (user_id, message, is_from_user, timestamp, needs_staff_attention)
                SELECT user_id, %s, FALSE, %s, FALSE
                FROM chatbot_chatmessage
                WHERE id = %s
            """, [response, timezone.now(), message_id])
        
        logger.info(f"Staff response added for message {message_id} in database {database}")
    
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



@user_passes_test(lambda u: u.is_staff)
def message_details(request, message_id):
    database = request.GET.get('database')
    with connections[database].cursor() as cursor:
        cursor.execute("SELECT * FROM chatbot_chatmessage WHERE id = %s", [message_id])
        message = cursor.fetchone()
    
    if message:
        return JsonResponse({
            'id': message[0],
            'user_email': message[1],  # You might need to fetch this from the user table
            'message': message[2],
            'timestamp': message[3],
            'is_from_user': message[4],
            'needs_staff_attention': message[5],
            'staff_response': message[6]
        })
    else:
        return JsonResponse({'error': 'Message not found'}, status=404)

@user_passes_test(lambda u: u.is_staff)
@require_http_methods(["POST"])
def respond_to_message(request, message_id):
    database = request.POST.get('database')
    response = request.POST.get('response')
    
    with connections[database].cursor() as cursor:
        cursor.execute("""
            UPDATE chatbot_chatmessage
            SET staff_response = %s, needs_staff_attention = FALSE
            WHERE id = %s
        """, [response, message_id])
    
    # Send a WebSocket message to update all staff interfaces
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        "staff_chat",
        {
            "type": "chat_message",
            "message": {
                "id": message_id,
                "staff_response": response,
                "needs_staff_attention": False
            }
        }
    )
    
    return JsonResponse({'success': True})

def user_details(request, message_id):
    database = request.GET.get('database')
    if not database:
        return JsonResponse({'error': 'Database parameter is required'}, status=400)

    try:
        with connections[database].cursor() as cursor:
            # Fetch the chat message
            cursor.execute("SELECT * FROM chatbot_chatmessage WHERE id = %s", [message_id])
            message = cursor.fetchone()
            
            if not message:
                return JsonResponse({'error': 'Message not found'}, status=404)
            
            # Fetch user details
            user_id = message[1]  # Assuming user_id is the second column
            user = User.objects.get(id=user_id)
            user_profile = UserProfile.objects.get(user=user)

            # Fetch chat history
            cursor.execute("SELECT * FROM chatbot_chatmessage WHERE user_id = %s ORDER BY timestamp DESC LIMIT 10", [user_id])
            chat_history = cursor.fetchall()

            return JsonResponse({
                'full_name': f"{user.first_name} {user.last_name}",
                'email': user.email,
                'business_name': user_profile.business.name if user_profile.business else '',
                'is_online': user.is_authenticated,  # You might want to implement a more sophisticated online status check
                'user_id': str(user.id),
                'chat_token': 'your_chat_token_here',  # Implement a proper token generation method
                'chat_history': [
                    {
                        'message': msg[2],  # Assuming message content is the third column
                        'timestamp': msg[3].isoformat(),  # Assuming timestamp is the fourth column
                        'is_from_user': msg[4],  # Assuming is_from_user is the fifth column
                    } for msg in chat_history
                ],
            })
    except ObjectDoesNotExist:
        return JsonResponse({'error': 'User or profile not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

