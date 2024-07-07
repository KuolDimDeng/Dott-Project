#/Users/kuoldeng/pyfcator_project/backend/pyfactor/pyfactor/urls.py
from django.contrib import admin
from django.urls import path, include
from chatbot.views import staff_interface, respond_to_message

from pyfactor import views


urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('users.urls')),
    path('', include('finance.urls')),
    path('api/banking/', include('banking.urls')),
    path('api/', include('sales.urls')),
    path('accounts/', include('allauth.urls')),
    path('api/messages/', views.message_stream, name='message_stream'),
    path('api/reports/', include('reports.urls')),
    path('api/analysis/', include('analysis.urls')),
    path('api/chatbot/', include('chatbot.urls')),
    path('staff_interface/', staff_interface, name='staff_interface'),
    path('staff/chat/respond/<int:message_id>/', respond_to_message, name='respond_to_message'),
    path('api/chart/', include('chart.urls')),




]