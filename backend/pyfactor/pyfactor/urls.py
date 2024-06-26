#/Users/kuoldeng/pyfcator_project/backend/pyfactor/pyfactor/urls.py
from django.contrib import admin
from django.urls import path, include

from pyfactor import views


urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('users.urls')),
    path('', include('finance.urls')),
    path('api/', include('sales.urls')),
    path('accounts/', include('allauth.urls')),
    path('api/messages/', views.message_stream, name='message_stream'),
    path('api/reports/', include('reports.urls')),



]