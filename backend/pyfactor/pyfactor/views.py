# /Users/kuoldeng/projectx/backend/pyfactor/pyfactor/views.py

import asyncio
import json
import logging
from typing import AsyncGenerator
from django.http import StreamingHttpResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from asgiref.sync import sync_to_async
from .user_console import console

logger = logging.getLogger('Pyfactor')

class AsyncStreamManager:
    """
    Manages async streaming responses with proper resource handling and error recovery.
    This ensures streams are properly initialized and cleaned up.
    """
    def __init__(self):
        self._active_streams = set()
        self._lock = asyncio.Lock()

    async def add_stream(self, stream_id: str):
        """Safely register a new stream"""
        async with self._lock:
            self._active_streams.add(stream_id)

    async def remove_stream(self, stream_id: str):
        """Safely remove a stream"""
        async with self._lock:
            self._active_streams.discard(stream_id)

    def is_active(self, stream_id: str) -> bool:
        """Check if a stream is still active"""
        return stream_id in self._active_streams

stream_manager = AsyncStreamManager()

@sync_to_async
def get_message_from_console():
    """Get message from console with proper error handling"""
    try:
        return console.get_message()
    except Exception as e:
        logger.error(f"Error getting console message: {str(e)}")
        return None

async def message_generator(stream_id: str) -> AsyncGenerator[str, None]:
    """
    Asynchronous generator that handles message streaming with proper error recovery
    and resource cleanup.
    """
    try:
        await stream_manager.add_stream(stream_id)
        
        while stream_manager.is_active(stream_id):
            try:
                message = await get_message_from_console()
                
                if message:
                    yield f"data: {json.dumps(message)}\n\n"
                
                await asyncio.sleep(0.1)
                
            except Exception as e:
                logger.error(f"Error in message generation: {str(e)}")
                await asyncio.sleep(1)
                
    finally:
        await stream_manager.remove_stream(stream_id)

@csrf_exempt
async def message_stream(request):
    """
    Handles server-sent events stream with proper async response handling
    and error recovery.
    """
    stream_id = str(id(request))
    
    try:
        # Create streaming response with proper headers
        response = StreamingHttpResponse(
            message_generator(stream_id),
            content_type='text/event-stream'
        )
        
        # Set required headers for SSE
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        response['Connection'] = 'keep-alive'
        
        # Add CORS headers
        response['Access-Control-Allow-Origin'] = settings.CORS_ALLOWED_ORIGINS[0]
        response['Access-Control-Allow-Credentials'] = 'true'
        
        # Ensure response has required attributes for middleware
        if not hasattr(response, '_resource_closers'):
            response._resource_closers = []
            
        # Handle client disconnection
        if hasattr(request, 'META'):
            input_stream = request.META.get('wsgi.input')
            if input_stream and hasattr(input_stream, 'set_blocking'):
                input_stream.set_blocking(False)
        
        return response

    except Exception as e:
        logger.error(f"Error setting up message stream: {str(e)}")
        return HttpResponse(
            content=json.dumps({"error": "Failed to initialize message stream"}),
            status=500,
            content_type='application/json'
        )