from datetime import timezone
import json
from django.shortcuts import redirect, render

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
    pending_messages = ChatMessage.objects.filter(needs_staff_attention=True, staff_response__isnull=True)
    return render(request, 'chatbot/staff_interface.html', {'pending_messages': pending_messages})

@user_passes_test(lambda u: u.is_staff)
def respond_to_message(request, message_id):
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

    @action(detail=False, methods=['POST'])
    def send_message(self, request):
        message = request.data.get('message')
        chat_message = ChatMessage.objects.create(user=request.user, message=message, is_from_user=True)
        
        # Try to match with FAQ
        faqs = FAQ.objects.all()
        if faqs.exists():
            vectorizer = TfidfVectorizer()
            corpus = [faq.question for faq in faqs] + [message]
            tfidf_matrix = vectorizer.fit_transform(corpus)
            cosine_similarities = cosine_similarity(tfidf_matrix[-1], tfidf_matrix[:-1]).flatten()
            best_match_index = cosine_similarities.argmax()
            
            if cosine_similarities[best_match_index] > 0.5:  # Threshold for considering it a match
                response = faqs[best_match_index].answer
                ChatMessage.objects.create(user=request.user, message=response, is_from_user=False)
            else:
                response = "I'm not sure about that. Let me get a staff member to help you."
                chat_message.needs_staff_attention = True
                chat_message.save()
                notify_staff.delay(chat_message.id)
        else:
            response = "I'm not sure about that. Let me get a staff member to help you."
            chat_message.needs_staff_attention = True
            chat_message.save()
            notify_staff.delay(chat_message.id)
        
        return Response({'status': 'success', 'response': response})

    @action(detail=False, methods=['GET'])
    def get_messages(self, request):
        messages = ChatMessage.objects.filter(user=request.user).order_by('timestamp')
        serializer = self.get_serializer(messages, many=True)
        return Response(serializer.data)

class FAQViewSet(viewsets.ModelViewSet):
    queryset = FAQ.objects.all()
    serializer_class = FAQSerializer