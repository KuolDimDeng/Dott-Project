from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChatConversationViewSet, ChatMessageViewSet, ChatTemplateViewSet
from .views_media import upload_voice_note, upload_image, upload_video, get_cloudinary_usage

router = DefaultRouter()
router.register(r'conversations', ChatConversationViewSet, basename='conversation')
router.register(r'messages', ChatMessageViewSet, basename='message')
router.register(r'templates', ChatTemplateViewSet, basename='template')

urlpatterns = [
    path('', include(router.urls)),
    
    # Media upload endpoints (Cloudinary)
    path('conversations/<uuid:conversation_id>/upload-voice/', upload_voice_note, name='upload-voice-note'),
    path('conversations/<uuid:conversation_id>/upload-image/', upload_image, name='upload-image'),
    path('conversations/<uuid:conversation_id>/upload-video/', upload_video, name='upload-video'),
    path('cloudinary-usage/', get_cloudinary_usage, name='cloudinary-usage'),
]